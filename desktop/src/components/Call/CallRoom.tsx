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
    localVideoElementRef
  } = useChime(onConnected); // Pass onConnected to useChime

  const remoteVideoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const hasConnectedRef = useRef(false);

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
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="text-center bg-gray-900/95 backdrop-blur-xl p-12 rounded-2xl border border-white/10 max-w-md">
          <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <div className="text-white text-2xl font-semibold mb-2">Connecting...</div>
          <div className="text-gray-400 text-sm mb-6">Setting up your {callType === "audio" ? "call" : "meeting"}</div>
          {error && (
            <div className="text-red-400 text-sm mt-4 bg-red-900/20 px-4 py-3 rounded-lg border border-red-500/30">{error}</div>
          )}
          <button
            onClick={handleLeave}
            className="mt-6 px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hidden audio element for Chime audio output */}
      <audio id="chime-audio-output" style={{ display: 'none' }} />

      {/* Header */}
      <div className="px-6 py-3 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">
              {otherUserName || "Call"}
            </h2>
            <p className="text-gray-300 text-sm">
              {remoteVideoTiles.size > 0 ? "Connected" : "Calling..."} • {remoteVideoTiles.size} participant{remoteVideoTiles.size !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 flex items-center justify-center p-4 gap-4">
        {/* Local Video */}
        {callType === "video" && (
          <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 w-64 h-48">
            <video
              ref={localVideoElementRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
              You {!videoEnabled && "(Video Off)"}
            </div>
          </div>
        )}

        {/* Remote Videos */}
        {Array.from(remoteVideoTiles.entries()).map(([tileId, attendeeId]) => (
          <div key={tileId} className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 w-96 h-72">
            <video
              ref={(el) => {
                if (el) {
                  remoteVideoRefs.current.set(tileId, el);
                  bindVideoElement(tileId, el);
                }
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
              Participant {attendeeId.slice(-4)}
            </div>
          </div>
        ))}

        {/* No remote participants placeholder */}
        {remoteVideoTiles.size === 0 && (
          <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 w-full max-w-4xl h-96">
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-sky-700 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-white/90 mb-4">📞</div>
                <p className="text-white text-xl">Waiting for others to join...</p>
                <p className="text-white/70 text-sm mt-2">Meeting ID: {meeting?.MeetingId?.slice(-8)}</p>
              </div>
            </div>
          </div>
        )}
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