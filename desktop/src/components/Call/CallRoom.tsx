import { useState, useEffect } from "react";
import { useChime } from "../../hooks/useChime";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

interface CallRoomProps {
  roomName: string;
  onLeave: () => void;
  callType?: "audio" | "video";
  initialSettings?: { audioEnabled: boolean; videoEnabled: boolean } | null;
  onConnected?: () => void;
}

export default function CallRoom({ roomName, callType = "video", initialSettings, onLeave, onConnected }: CallRoomProps) {
  const [isMuted, setIsMuted] = useState(initialSettings?.audioEnabled === false);
  const [isVideoOff, setIsVideoOff] = useState(initialSettings?.videoEnabled === false);
  const [error, setError] = useState<string | null>(null);
  const { connect, disconnect, isConnected, meeting, attendee } = useChime();

  useEffect(() => {
    if (roomName) {
      setError(null);
      connect(roomName).then(() => {
        onConnected?.();
      }).catch((error) => {
        console.error("Failed to connect to Chime:", error);
        setError(`Failed to connect: ${error.message || "Unknown error"}`);
      });
    }

    return () => {
      disconnect();
    };
  }, [roomName, connect, disconnect, onConnected]);

  const handleLeave = () => {
    disconnect();
    onLeave();
  };

  if (!isConnected) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-sky-50">
        <div className="text-center glass-card p-8 rounded-2xl">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-900 text-lg font-semibold mb-2">Connecting to {callType === "audio" ? "call" : "meeting"}...</div>
          {error && (
            <div className="text-red-600 text-sm mt-2 bg-red-50 px-4 py-2 rounded-lg">{error}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="px-6 py-3 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">{roomName}</h2>
            <p className="text-gray-300 text-sm">Chime Meeting</p>
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 w-full max-w-4xl h-96">
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-sky-700 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl font-bold text-white/90 mb-4">📞</div>
              <p className="text-white text-xl">Chime Call Active</p>
              <p className="text-white/70 text-sm mt-2">Meeting ID: {meeting?.MeetingId?.slice(-8)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black/40 backdrop-blur-xl px-6 py-4 border-t border-white/10">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-all ${
              isMuted
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          {callType === "video" && (
            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-4 rounded-full transition-all ${
                isVideoOff
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
              title={isVideoOff ? "Turn On Video" : "Turn Off Video"}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
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