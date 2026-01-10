import { useState, useEffect, useRef } from "react";
import { RoomEvent, Track, createLocalVideoTrack, createLocalAudioTrack } from "livekit-client";
import { useLiveKit } from "../../hooks/useLiveKit";
import { useRecording } from "../../hooks/useRecording";
import { Mic, MicOff, Video, VideoOff, Monitor, Square, PhoneOff } from "lucide-react";

// Check if running in Tauri
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const { room, connect, disconnect, isConnected } = useLiveKit();
  const { isRecording, startRecording, stopRecording } = useRecording();

  useEffect(() => {
    if (roomName) {
      setError(null); // Clear any previous errors
      connect(roomName).catch((error) => {
        console.error("Failed to connect to room:", error);
        setError(`Failed to connect: ${error.message || "Unknown error"}`);
      });
    }

    return () => {
      disconnect();
    };
  }, [roomName, connect, disconnect]);

  useEffect(() => {
    if (!room) return;

    const updateParticipants = () => {
      const remoteParticipants = Array.from(room.remoteParticipants.values());
      const localParticipant = room.localParticipant;
      setParticipants([localParticipant, ...remoteParticipants]);
    };

    const handleTrackSubscribed = (
      track: Track,
      _publication: any,
      participant: any
    ) => {
      if (track.kind === "video" || track.kind === "audio") {
        attachTrack(track, participant.identity);
      }
    };

    // Enable camera and microphone on connect
    const enableMedia = async () => {
      try {
        // Get device preferences from localStorage
        const audioInputDeviceId = localStorage.getItem("audioInputDeviceId");
        const videoInputDeviceId = localStorage.getItem("videoInputDeviceId");

        // Only create and publish audio if enabled in settings
        if (initialSettings?.audioEnabled !== false) {
          const audioOptions: any = {};
          if (audioInputDeviceId) {
            audioOptions.deviceId = { exact: audioInputDeviceId };
          }
          const audioTrack = await createLocalAudioTrack(audioOptions);
          await room.localParticipant.publishTrack(audioTrack);
        }

        // Enable video if enabled in settings (works for both audio and video calls)
        if (initialSettings?.videoEnabled === true) {
          // Create video track with selected device
          const videoOptions: any = {};
          if (videoInputDeviceId) {
            videoOptions.deviceId = { exact: videoInputDeviceId };
          }
          const videoTrack = await createLocalVideoTrack(videoOptions);
          await room.localParticipant.publishTrack(videoTrack);
        }
      } catch (error) {
        console.error("Error enabling media:", error);
        setError("Failed to enable camera/microphone. Please check permissions.");
        // Fallback to default devices if selected device fails
        try {
          if (initialSettings?.audioEnabled !== false) {
            const audioTrack = await createLocalAudioTrack();
            await room.localParticipant.publishTrack(audioTrack);
          }
          if (initialSettings?.videoEnabled === true) {
            const videoTrack = await createLocalVideoTrack();
            await room.localParticipant.publishTrack(videoTrack);
          }
        } catch (fallbackError) {
          console.error("Error with fallback devices:", fallbackError);
        }
      }
    };

    // Check if already connected
    if (room.state === "connected") {
      enableMedia();
      onConnected?.();
    }

    room.on(RoomEvent.Connected, () => {
      enableMedia();
      onConnected?.(); // Notify parent that call was answered
    });
    room.on(RoomEvent.ParticipantConnected, updateParticipants);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);

    updateParticipants();

    return () => {
      room.off(RoomEvent.Connected, enableMedia);
      room.off(RoomEvent.ParticipantConnected, updateParticipants);
      room.off(RoomEvent.ParticipantDisconnected, updateParticipants);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    };
  }, [room, initialSettings, onConnected]);

  const attachTrack = (track: Track, participantId: string) => {
    const element = videoRefs.current[participantId];
    if (element && track.mediaStreamTrack) {
      element.srcObject = new MediaStream([track.mediaStreamTrack]);
    }
  };

  const toggleMute = async () => {
    if (!room) return;
    const audioPublications = Array.from(
      room.localParticipant.audioTrackPublications.values()
    );
    if (audioPublications.length > 0) {
      const audioTrack = audioPublications[0];
      if (audioTrack.track) {
        // LiveKit tracks use enable()/disable() methods
        if (isMuted) {
          audioTrack.track.stop();
        } else {
          // Track will be enabled when published
        }
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = async () => {
    if (!room) return;
    const videoPublications = Array.from(
      room.localParticipant.videoTrackPublications.values()
    );
    if (videoPublications.length > 0) {
      const videoTrack = videoPublications[0];
      if (videoTrack.track) {
        // LiveKit tracks use enable()/disable() methods
        if (isVideoOff) {
          videoTrack.track.stop();
        } else {
          // Track will be enabled when published
        }
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!room) return;
    // TODO: Implement screen sharing with LiveKit
    // This would use getDisplayMedia() and publish as a new track
    setIsScreenSharing(!isScreenSharing);
  };

  const toggleRecording = async () => {
    if (!room) return;
    
    if (isRecording) {
      await stopRecording();
      } else {
        try {
          let outputPath = `recording-${Date.now()}.mp4`;
          
          if (isTauri) {
            const { appDataDir } = await import("@tauri-apps/api/path");
            const dataDir = await appDataDir();
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            outputPath = `${dataDir}recording-${timestamp}.mp4`;
          }
          
          await startRecording({
            output_path: outputPath,
          });
        } catch (error: any) {
          console.error("Error starting recording:", error);
          setError(error.message || "Failed to start recording");
        }
      }
  };

  const handleLeave = () => {
    disconnect();
    onLeave();
  };

  // Calculate grid layout based on participant count
  const getGridCols = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-3";
    return "grid-cols-4";
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
      {/* Header with room info */}
      <div className="px-6 py-3 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">{roomName}</h2>
            <p className="text-gray-300 text-sm">{participants.length} {participants.length === 1 ? "participant" : "participants"}</p>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/50 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-200 text-sm font-medium">Recording</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div className={`flex-1 grid ${getGridCols(participants.length)} gap-4 p-4 overflow-auto`}>
        {participants.map((participant) => {
          const hasVideo = callType === "video" && !isVideoOff && participant.identity === room?.localParticipant.identity 
            ? !isVideoOff 
            : Array.from(participant.videoTrackPublications.values()).some((pub: any) => pub.track && pub.isSubscribed);
          const isLocal = participant.identity === room?.localParticipant.identity;
          
          return (
            <div
              key={participant.identity}
              className="relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10"
            >
              {hasVideo ? (
                <video
                  ref={(el) => {
                    videoRefs.current[participant.identity] = el;
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-sky-700 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white/90">
                    {participant.identity?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                  </span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                  {isLocal && <span className="text-xs bg-blue-500 px-2 py-0.5 rounded">You</span>}
                  <span className="text-sm font-medium truncate">{participant.name || participant.identity}</span>
                </div>
                {!hasVideo && (
                  <div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
                    <VideoOff className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="bg-black/40 backdrop-blur-xl px-6 py-4 border-t border-white/10">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={toggleMute}
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
              onClick={toggleVideo}
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
          {callType === "video" && (
            <button
              onClick={toggleScreenShare}
              className={`p-4 rounded-full transition-all ${
                isScreenSharing
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
              title="Share Screen"
            >
              <Monitor className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={toggleRecording}
            className={`p-4 rounded-full transition-all ${
              isRecording
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
            title={isRecording ? "Stop Recording" : "Start Recording"}
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>
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

