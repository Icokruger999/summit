import { useState, useEffect, useRef } from "react";
import { Video, VideoOff, Mic, MicOff, Phone, X, Volume2, Monitor } from "lucide-react";

interface PreCallSettingsProps {
  roomName: string;
  callType: "audio" | "video";
  userName?: string;
  onJoin: (settings: { audioEnabled: boolean; videoEnabled: boolean }) => void;
  onCancel: () => void;
}

export default function PreCallSettings({
  roomName,
  callType,
  userName,
  onJoin,
  onCancel,
}: PreCallSettingsProps) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(callType === "video");
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>("");
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const loadDevices = async () => {
    try {
      // Request camera and microphone permissions first to get device labels
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (permError) {
        console.warn("Permissions not granted, device labels may be generic:", permError);
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      const audioOutputs = devices.filter((d) => d.kind === "audiooutput");
      const videoInputs = devices.filter((d) => d.kind === "videoinput");

      setAudioDevices([...audioInputs, ...audioOutputs]);
      setVideoDevices(videoInputs);

      // Load saved preferences
      const savedAudioInput = localStorage.getItem("audioInputDeviceId");
      const savedAudioOutput = localStorage.getItem("audioOutputDeviceId");
      const savedVideoInput = localStorage.getItem("videoInputDeviceId");

      if (savedAudioInput && audioInputs.find((d) => d.deviceId === savedAudioInput)) {
        setSelectedAudioInput(savedAudioInput);
      } else if (audioInputs.length > 0) {
        setSelectedAudioInput(audioInputs[0].deviceId);
      }

      if (savedAudioOutput && audioOutputs.find((d) => d.deviceId === savedAudioOutput)) {
        setSelectedAudioOutput(savedAudioOutput);
      } else if (audioOutputs.length > 0) {
        setSelectedAudioOutput(audioOutputs[0].deviceId);
      }

      if (savedVideoInput && videoInputs.find((d) => d.deviceId === savedVideoInput)) {
        setSelectedVideoInput(savedVideoInput);
      } else if (videoInputs.length > 0) {
        setSelectedVideoInput(videoInputs[0].deviceId);
      }
    } catch (error) {
      console.error("Error loading devices:", error);
    }
  };

  useEffect(() => {
    loadDevices();
    
    return () => {
      // Cleanup stream when component unmounts
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    // Start preview when video is enabled
    if (videoEnabled) {
      // Wait a bit for device selection to be ready, then start preview
      const timer = setTimeout(() => {
        startVideoPreview();
      }, 200);
      return () => clearTimeout(timer);
    } else {
      stopVideoPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoEnabled, selectedVideoInput, videoDevices.length]);

  const startVideoPreview = async () => {
    try {
      stopVideoPreview();
      
      // Try to use selected device, or first available, or default
      let constraints: MediaStreamConstraints;
      
      if (selectedVideoInput) {
        constraints = {
          video: { deviceId: { exact: selectedVideoInput } },
          audio: false,
        };
      } else if (videoDevices.length > 0) {
        constraints = {
          video: { deviceId: videoDevices[0].deviceId },
          audio: false,
        };
      } else {
        constraints = {
          video: true,
          audio: false,
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        // Force play in case autoplay doesn't work
        videoPreviewRef.current.play().catch(console.error);
      }
    } catch (error: any) {
      console.error("Error starting video preview:", error);
      // If specific device fails, try default
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setLocalStream(stream);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(console.error);
        }
      } catch (fallbackError) {
        console.error("Error with fallback video:", fallbackError);
      }
    }
  };

  const stopVideoPreview = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  const handleJoin = () => {
    // Save device preferences
    if (selectedAudioInput) localStorage.setItem("audioInputDeviceId", selectedAudioInput);
    if (selectedAudioOutput) localStorage.setItem("audioOutputDeviceId", selectedAudioOutput);
    if (selectedVideoInput) localStorage.setItem("videoInputDeviceId", selectedVideoInput);
    
    stopVideoPreview();
    onJoin({ audioEnabled, videoEnabled });
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center z-50">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full mx-4 border border-white/10 animate-in slide-in-from-bottom-4">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white">Ready to join?</h2>
              <p className="text-sm text-gray-400 mt-2">{roomName}</p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Cancel"
            >
              <X className="w-6 h-6 text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Large Video Preview */}
          <div className="mb-8">
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video shadow-2xl border border-white/10">
              {videoEnabled ? (
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl font-bold text-white">
                        {userName?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                    <p className="text-xl text-white font-medium">{userName || "You"}</p>
                    <p className="text-sm text-gray-400 mt-2">Camera is off</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {/* Microphone Toggle */}
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-5 rounded-full transition-all ${
                audioEnabled
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
              title={audioEnabled ? "Mute" : "Unmute"}
            >
              {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>

            {/* Video Toggle */}
            <button
              onClick={() => setVideoEnabled(!videoEnabled)}
              className={`p-5 rounded-full transition-all ${
                videoEnabled
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
              title={videoEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
          </div>

          {/* Device Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Settings */}
            <div className="space-y-4">
              {/* Audio Settings */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Mic className="w-3 h-3" />
                  Microphone
                </label>
                <select
                  value={selectedAudioInput}
                  onChange={(e) => setSelectedAudioInput(e.target.value)}
                  disabled={!audioEnabled}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {audioDevices
                    .filter((d) => d.kind === "audioinput")
                    .map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Video Settings */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Video className="w-3 h-3" />
                Camera
              </label>
              <select
                value={selectedVideoInput}
                onChange={(e) => setSelectedVideoInput(e.target.value)}
                disabled={!videoEnabled}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaker Settings */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Volume2 className="w-3 h-3" />
                Speakers
              </label>
              <select
                value={selectedAudioOutput}
                onChange={(e) => setSelectedAudioOutput(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm"
              >
                {audioDevices
                  .filter((d) => d.kind === "audiooutput")
                  .map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 pt-6 border-t border-white/10">
            <button
              onClick={handleJoin}
              className="px-8 py-4 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all font-semibold text-lg flex items-center gap-3 shadow-lg hover:shadow-xl"
            >
              <Phone className="w-5 h-5" />
              Join now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

