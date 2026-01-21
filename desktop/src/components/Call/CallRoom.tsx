import { useState, useEffect, useRef } from "react";
import { useChime } from "../../hooks/useChime";
import { Mic, MicOff, Video, VideoOff, PhoneOff, UserPlus, X, Search, Monitor, MonitorOff } from "lucide-react";
import { chatRequestsApi, getAuthToken } from "../../lib/api";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://summit.api.codingeverest.com";

interface Contact {
  contact_id: string;
  contact_name: string;
  contact_email: string;
}

interface CallRoomProps {
  roomName: string;
  onLeave: () => void;
  callType?: "audio" | "video";
  initialSettings?: { audioEnabled: boolean; videoEnabled: boolean } | null;
  onConnected?: () => void;
  otherUserName?: string; // Name of the person being called
}

export default function CallRoom({ roomName, callType = "video", initialSettings, onLeave, onConnected, otherUserName }: CallRoomProps) {
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [participantNames, setParticipantNames] = useState<Map<string, string>>(new Map());
  const { 
    connect, 
    disconnect, 
    toggleAudio, 
    toggleVideo,
    toggleScreenShare,
    bindVideoElement,
    isConnected, 
    meeting, 
    audioEnabled,
    videoEnabled,
    screenShareEnabled,
    remoteVideoTiles,
    remoteAttendees,
    localVideoElementRef
  } = useChime(onConnected); // Pass onConnected to useChime

  const remoteVideoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const hasConnectedRef = useRef(false);

  // Get initials from name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Fetch participant name from API
  const fetchParticipantName = async (userId: string) => {
    try {
      const token = getAuthToken();
      if (!token) return null;

      const response = await fetch(`${SERVER_URL}/api/users/${userId}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.name || data.email || null;
      }
    } catch (error) {
      console.error("Failed to fetch participant name:", error);
    }
    return null;
  };

  // Fetch names for remote attendees
  useEffect(() => {
    remoteAttendees.forEach(async (attendee, attendeeId) => {
      if (attendee.externalUserId && !participantNames.has(attendeeId)) {
        const name = await fetchParticipantName(attendee.externalUserId);
        if (name) {
          setParticipantNames((prev) => new Map(prev).set(attendeeId, name));
        }
      }
    });
  }, [remoteAttendees]);

  // Load contacts when modal opens
  useEffect(() => {
    if (showInviteModal && contacts.length === 0) {
      setLoadingContacts(true);
      chatRequestsApi.getContacts()
        .then((data) => {
          setContacts(data || []);
        })
        .catch((err) => {
          console.error("Failed to load contacts:", err);
        })
        .finally(() => {
          setLoadingContacts(false);
        });
    }
  }, [showInviteModal]);

  // Filter contacts based on search
  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.toLowerCase();
    return (
      contact.contact_name?.toLowerCase().includes(query) ||
      contact.contact_email?.toLowerCase().includes(query)
    );
  });

  // Invite a contact to the call
  const inviteToCall = async (contact: Contact) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      // Send notification to the contact
      const response = await fetch(`${SERVER_URL}/api/chime/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: contact.contact_id,
          roomName: roomName,
          callType: callType,
        }),
      });

      if (response.ok) {
        setInvitedUsers((prev) => new Set(prev).add(contact.contact_id));
        console.log(`✅ Invited ${contact.contact_name} to the call`);
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to invite ${contact.contact_name}:`, response.status, errorText);
      }
    } catch (err) {
      console.error("❌ Failed to invite user (network error):", err);
    }
  };

  useEffect(() => {
    if (roomName && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
      setError(null);
      connect(roomName).catch((error) => {
        console.error("Failed to connect to Chime:", error);
        // Provide helpful error messages
        let errorMessage = error.message || "Unknown error";
        if (errorMessage.includes("device") || errorMessage.includes("NotAllowedError") || errorMessage.includes("Permission")) {
          errorMessage = "Microphone access denied. Please allow microphone access in your browser settings and try again.";
        } else if (errorMessage.includes("NotFoundError")) {
          errorMessage = "No microphone found. Please connect a microphone and try again.";
        }
        setError(errorMessage);
        hasConnectedRef.current = false; // Allow retry on error
      });
    }

    // Cleanup only runs when component unmounts
    return () => {
      // Only disconnect if we actually connected
      if (hasConnectedRef.current) {
        console.log("CallRoom unmounting, disconnecting from meeting");
        hasConnectedRef.current = false;
        disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName]); // Only depend on roomName, connect/disconnect are stable

  // Bind remote video elements when tiles change
  useEffect(() => {
    remoteVideoTiles.forEach((attendeeId, tileId) => {
      const videoElement = remoteVideoRefs.current.get(tileId);
      if (videoElement) {
        bindVideoElement(tileId, videoElement);
      }
    });
  }, [remoteVideoTiles, bindVideoElement]);

  const handleLeave = () => {
    const totalParticipants = remoteAttendees.size + 1; // +1 for local user
    
    // If there are only 2 people (1 remote + you), end the call for everyone
    if (totalParticipants <= 2) {
      try {
        const token = getAuthToken();
        if (token) {
          fetch(`${SERVER_URL}/api/chime/end-call`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              roomName: roomName,
            }),
          }).catch(err => console.error("Failed to notify call end:", err));
        }
      } catch (error) {
        console.error("Error notifying call end:", error);
      }
    }
    
    // Always disconnect yourself
    disconnect();
    onLeave();
  };

  if (!isConnected) {
    // Show the room UI immediately while connecting (no "Connecting..." screen)
    // This gives a better UX - caller sees the room right away
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Hidden audio element for Chime audio output */}
        <audio id="chime-audio-output" autoPlay playsInline style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />

        {/* Header */}
        <div className="px-6 py-3 bg-black/30 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold text-lg">
                {otherUserName || "Call"}
              </h2>
              <p className="text-gray-300 text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                Connecting...
              </p>
            </div>
          </div>
        </div>

        {/* Video Area - Teams-like layout while connecting */}
        <div className="flex-1 flex gap-2 p-2 overflow-hidden">
          {/* Main Video Area */}
          <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg">
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-4xl font-bold text-gray-400">
                  {otherUserName ? getInitials(otherUserName) : "?"}
                </span>
              </div>
              <p className="text-gray-400 text-lg">Calling {otherUserName || "participant"}...</p>
              <p className="text-gray-500 text-sm mt-2">Ringing...</p>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-64 flex flex-col gap-2">
            {/* Your video tile */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video flex-shrink-0 border-2 border-blue-500/50">
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">You</span>
                </div>
              </div>
              <div className="absolute bottom-2 left-2">
                <span className="bg-black/80 px-2 py-1 rounded text-white text-xs font-medium">You</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-black/40 backdrop-blur-xl px-6 py-4 border-t border-white/10">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full transition-all ${
                !audioEnabled
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
              title={audioEnabled ? "Mute" : "Unmute"}
            >
              {!audioEnabled ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all ${
                !videoEnabled
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
              title={videoEnabled ? "Turn Off Video" : "Turn On Video"}
            >
              {!videoEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleScreenShare}
              className={`p-4 rounded-full transition-all ${
                screenShareEnabled
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
              title={screenShareEnabled ? "Stop Sharing Screen" : "Share Screen"}
            >
              {screenShareEnabled ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </button>
            <div className="w-px h-10 bg-white/20 mx-2"></div>
            <button
              onClick={handleLeave}
              className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
              title={remoteAttendees.size >= 1 ? "Leave Call" : "End Call"}
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
          {error && (
            <div className="text-red-400 text-sm mt-3 text-center bg-red-900/20 px-4 py-2 rounded-lg mx-auto max-w-md">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hidden audio element for Chime audio output - must have autoPlay */}
      <audio id="chime-audio-output" autoPlay playsInline style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />

      {/* Header */}
      <div className="px-6 py-3 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">
              {otherUserName || "Call"}
            </h2>
            <p className="text-gray-300 text-sm">
              {remoteAttendees.size > 0 ? "In call" : "Waiting for others..."} • {remoteAttendees.size + 1} participant{remoteAttendees.size !== 0 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            title="Add people to call"
          >
            <UserPlus className="w-5 h-5" />
            <span className="text-sm font-medium">Add People</span>
          </button>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-white font-semibold">Add People to Call</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {loadingContacts ? (
                  <div className="text-center py-8 text-gray-400">Loading contacts...</div>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    {searchQuery ? "No contacts found" : "No contacts available"}
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact.contact_id}
                      className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {getInitials(contact.contact_name || contact.contact_email)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{contact.contact_name || "Unknown"}</p>
                          <p className="text-gray-400 text-sm">{contact.contact_email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => inviteToCall(contact)}
                        disabled={invitedUsers.has(contact.contact_id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          invitedUsers.has(contact.contact_id)
                            ? "bg-green-600/20 text-green-400 cursor-default"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {invitedUsers.has(contact.contact_id) ? "Invited" : "Invite"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Area - Teams-like layout: Main view + Sidebar */}
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        {/* Main Video Area - Screen share or active speaker */}
        <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg">
          {screenShareEnabled ? (
            /* Your screen share takes main view */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={localVideoElementRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-4 left-4">
                <span className="bg-black/80 px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  You are presenting
                </span>
              </div>
            </div>
          ) : remoteAttendees.size > 0 && Array.from(remoteAttendees.values())[0].hasVideo ? (
            /* Remote participant's video takes main view */
            <div className="relative w-full h-full flex items-center justify-center">
              {Array.from(remoteAttendees.entries()).slice(0, 1).map(([attendeeId, attendee]) => {
                const displayName = participantNames.get(attendeeId) || otherUserName || "Participant";
                return attendee.hasVideo && attendee.tileId !== undefined ? (
                  <div key={attendeeId} className="relative w-full h-full">
                    <video
                      ref={(el) => {
                        if (el && attendee.tileId !== undefined) {
                          remoteVideoRefs.current.set(attendee.tileId, el);
                          bindVideoElement(attendee.tileId, el);
                        }
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-black/80 px-4 py-2 rounded-lg text-white text-sm font-medium">
                        {displayName}
                      </span>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            /* No video - show waiting state */
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl font-bold text-gray-400">
                    {otherUserName ? getInitials(otherUserName) : "?"}
                  </span>
                </div>
                <p className="text-gray-400 text-lg">Waiting for {otherUserName || "participant"}...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Participant tiles */}
        <div className="w-64 flex flex-col gap-2 overflow-y-auto">
          {/* Your video tile */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video flex-shrink-0 border-2 border-blue-500/50">
            {videoEnabled && !screenShareEnabled ? (
              <video
                ref={screenShareEnabled ? undefined : localVideoElementRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">You</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2">
              <span className="bg-black/80 px-2 py-1 rounded text-white text-xs font-medium">
                You {!audioEnabled && "🔇"}
              </span>
            </div>
          </div>

          {/* Remote participants */}
          {Array.from(remoteAttendees.entries()).map(([attendeeId, attendee]) => {
            const displayName = participantNames.get(attendeeId) || otherUserName || "Participant";
            
            return (
              <div 
                key={attendeeId} 
                className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video flex-shrink-0 border-2 border-white/10"
              >
                {attendee.hasVideo && attendee.tileId !== undefined && !screenShareEnabled ? (
                  <video
                    ref={(el) => {
                      if (el && attendee.tileId !== undefined && !screenShareEnabled) {
                        remoteVideoRefs.current.set(attendee.tileId, el);
                        bindVideoElement(attendee.tileId, el);
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">
                        {getInitials(displayName)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2">
                  <span className="bg-black/80 px-2 py-1 rounded text-white text-xs font-medium">
                    {displayName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black/40 backdrop-blur-xl px-6 py-4 border-t border-white/10">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-all ${
              !audioEnabled
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
            title={audioEnabled ? "Mute" : "Unmute"}
          >
            {!audioEnabled ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all ${
              !videoEnabled
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
            title={videoEnabled ? "Turn Off Video" : "Turn On Video"}
          >
            {!videoEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all ${
              screenShareEnabled
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
            title={screenShareEnabled ? "Stop Sharing Screen" : "Share Screen"}
          >
            {screenShareEnabled ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>
          <div className="w-px h-10 bg-white/20 mx-2"></div>
          <button
            onClick={handleLeave}
            className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
            title={remoteAttendees.size >= 1 ? "Leave Call" : "End Call"}
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}