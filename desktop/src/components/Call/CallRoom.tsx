import { useState, useEffect, useRef } from "react";
import { useChime } from "../../hooks/useChime";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

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
  const { 
    connect, 
    disconnect, 
    toggleAudio, 
    toggleVideo,
    bindVideoElement,
    isConnected, 
    meeting, 
    audioEnabled,
    videoEnabled,
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

  useEffect(() => {
    if (roomName && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
      setError(null);
      connect(roomName).catch((error) => {
        console.error("Failed to connect to Chime:", error);
        setError(`Failed to connect: ${error.message || "Unknown error"}`);
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

        {/* Video Area - Show room while connecting */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-wrap items-center justify-center gap-4 max-w-6xl">
            
            {/* Local Video/Avatar (You) */}
            <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-blue-500/50 w-80 h-60">
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">You</span>
                </div>
              </div>
              <div className="absolute bottom-3 left-3">
                <span className="bg-black/60 px-3 py-1 rounded-full text-white text-sm font-medium">You</span>
              </div>
            </div>

            {/* Waiting for other participant */}
            <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 w-80 h-60">
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <span className="text-2xl font-bold text-gray-400">
                      {otherUserName ? getInitials(otherUserName) : "?"}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">Calling {otherUserName || "participant"}...</p>
                  <p className="text-gray-500 text-xs mt-1">Ringing...</p>
                </div>
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
            {callType === "video" && (
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
            )}
            <div className="w-px h-10 bg-white/20 mx-2"></div>
            <button
              onClick={handleLeave}
              className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
              title="End Call"
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
        </div>
      </div>

      {/* Video Area - Teams-like grid */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-wrap items-center justify-center gap-4 max-w-6xl">
          
          {/* Local Video/Avatar (You) */}
          <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-blue-500/50 w-80 h-60">
            {videoEnabled ? (
              <video
                ref={localVideoElementRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">You</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="bg-black/60 px-3 py-1 rounded-full text-white text-sm font-medium">
                You {!audioEnabled && "🔇"}
              </span>
            </div>
          </div>

          {/* Remote Participants - Show avatar if no video, video if they have it */}
          {Array.from(remoteAttendees.entries()).map(([attendeeId, attendee]) => (
            <div key={attendeeId} className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 w-80 h-60">
              {attendee.hasVideo && attendee.tileId !== undefined ? (
                <video
                  ref={(el) => {
                    if (el && attendee.tileId !== undefined) {
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
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {otherUserName ? getInitials(otherUserName) : "?"}
                    </span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-3 left-3">
                <span className="bg-black/60 px-3 py-1 rounded-full text-white text-sm font-medium">
                  {otherUserName || "Participant"}
                </span>
              </div>
            </div>
          ))}

          {/* Show placeholder only if no one else has joined yet */}
          {remoteAttendees.size === 0 && (
            <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 w-80 h-60">
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <span className="text-2xl font-bold text-gray-400">
                      {otherUserName ? getInitials(otherUserName) : "?"}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">Waiting for {otherUserName || "participant"}...</p>
                </div>
              </div>
            </div>
          )}
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
          {callType === "video" && (
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
          )}
          <div className="w-px h-10 bg-white/20 mx-2"></div>
          <button
            onClick={handleLeave}
            className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
            title="Leave"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}