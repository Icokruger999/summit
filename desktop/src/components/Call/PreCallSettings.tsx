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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border border-gray-200 animate-in slide-in-from-bottom-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Join {callType === "video" ? "Video" : "Audio"} Call</h2>
              <p className="text-sm text-gray-500 mt-1">Configure your settings before joining</p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cancel"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className={`grid grid-cols-1 ${callType === "video" ? "lg:grid-cols-2" : ""} gap-6`}>
            {/* Video Preview */}
            {(callType === "video" || videoEnabled) && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Video Preview
                </h3>
                <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
                  {videoEnabled ? (
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <VideoOff className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Video is off</p>
                      </div>
                    </div>
                  )}
                  {/* Toggle Video Button */}
                  <button
                    onClick={() => setVideoEnabled(!videoEnabled)}
                    className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                      videoEnabled
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-white/90 hover:bg-white text-gray-900"
                    }`}
                  >
                    {videoEnabled ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    <span className="text-sm font-medium">
                      {videoEnabled ? "Turn Off" : "Turn On"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Settings */}
            <div className="space-y-4">
              {/* Audio Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Microphone
                  </h3>
                  <button
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium ${
                      audioEnabled
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    {audioEnabled ? "On" : "Off"}
                  </button>
                </div>
                {audioEnabled && (
                  <select
                    value={selectedAudioInput}
                    onChange={(e) => setSelectedAudioInput(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white text-gray-900"
                  >
                    {audioDevices
                      .filter((d) => d.kind === "audioinput")
                      .map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Video Settings - Show for video calls, or allow enabling for audio calls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Camera
                  </h3>
                  <button
                    onClick={() => setVideoEnabled(!videoEnabled)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium ${
                      videoEnabled
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    {videoEnabled ? "On" : "Off"}
                  </button>
                </div>
                {videoEnabled && (
                  <select
                    value={selectedVideoInput}
                    onChange={(e) => setSelectedVideoInput(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white text-gray-900"
                  >
                    {videoDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Speaker Settings */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Speakers
                </h3>
                <select
                  value={selectedAudioOutput}
                  onChange={(e) => setSelectedAudioOutput(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white text-gray-900"
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
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all font-medium flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Join {callType === "video" ? "Video" : "Audio"} Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

