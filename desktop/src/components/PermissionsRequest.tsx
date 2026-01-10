import { useState, useEffect } from "react";
import { Video, Mic, Bell, Check, X, AlertCircle } from "lucide-react";

interface PermissionsRequestProps {
  onComplete: () => void;
}

export default function PermissionsRequest({ onComplete }: PermissionsRequestProps) {
  const [cameraPermission, setCameraPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [microphonePermission, setMicrophonePermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [notificationPermission, setNotificationPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Check notification permission on mount (can be checked without requesting)
    if ("Notification" in window) {
      const permission = Notification.permission;
      setNotificationPermission(permission === "granted" ? "granted" : permission === "denied" ? "denied" : "prompt");
    } else {
      setNotificationPermission("denied");
    }
  }, []);

  // Check current permission state using Permissions API if available
  const checkMediaPermissions = async () => {
    if ("permissions" in navigator) {
      try {
        const cameraPermission = await navigator.permissions.query({ name: "camera" as PermissionName });
        const micPermission = await navigator.permissions.query({ name: "microphone" as PermissionName });
        
        if (cameraPermission.state === "granted") {
          setCameraPermission("granted");
        } else if (cameraPermission.state === "denied") {
          setCameraPermission("denied");
        }
        
        if (micPermission.state === "granted") {
          setMicrophonePermission("granted");
        } else if (micPermission.state === "denied") {
          setMicrophonePermission("denied");
        }
      } catch (e) {
        // Permissions API not fully supported, fall back to getUserMedia
        console.log("Permissions API not available, will use getUserMedia");
      }
    }
  };

  useEffect(() => {
    checkMediaPermissions();
  }, []);

  const requestCameraPermission = async () => {
    try {
      setRequesting(true);
      // Use Promise.race with timeout to prevent hanging (5 seconds is more reasonable)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Permission request timed out")), 5000)
      );
      
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ video: true }),
        timeoutPromise
      ]) as MediaStream;
      
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission("granted");
    } catch (error: any) {
      console.error("Camera permission denied:", error);
      setCameraPermission("denied");
    } finally {
      setRequesting(false);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      setRequesting(true);
      // Use Promise.race with timeout to prevent hanging (5 seconds is more reasonable)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Permission request timed out")), 5000)
      );
      
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        timeoutPromise
      ]) as MediaStream;
      
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      setMicrophonePermission("granted");
    } catch (error: any) {
      console.error("Microphone permission denied:", error);
      setMicrophonePermission("denied");
    } finally {
      setRequesting(false);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      setRequesting(true);
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission === "granted" ? "granted" : "denied");
      } else {
        setNotificationPermission("denied");
      }
    } catch (error) {
      console.error("Notification permission error:", error);
      setNotificationPermission("denied");
    } finally {
      setRequesting(false);
    }
  };

  const requestAllPermissions = async () => {
    setRequesting(true);
    try {
      // Request camera and mic together (faster - single prompt on some browsers)
      const mediaPromises = [];
      if (cameraPermission === "prompt" || cameraPermission === "denied") {
        mediaPromises.push(requestCameraPermission());
      }
      if (microphonePermission === "prompt" || microphonePermission === "denied") {
        mediaPromises.push(requestMicrophonePermission());
      }
      
      // Request media permissions together
      if (mediaPromises.length > 0) {
        // Try to request both at once for better UX
        const needsBoth = (cameraPermission === "prompt" || cameraPermission === "denied") && 
                          (microphonePermission === "prompt" || microphonePermission === "denied");
        
        if (needsBoth) {
          try {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Permission request timed out")), 10000)
            );
            const stream = await Promise.race([
              navigator.mediaDevices.getUserMedia({ video: true, audio: true }),
              timeoutPromise
            ]) as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            setCameraPermission("granted");
            setMicrophonePermission("granted");
          } catch (error: any) {
            // Fall back to individual requests
            await Promise.all(mediaPromises);
          }
        } else {
          await Promise.all(mediaPromises);
        }
      }
      
      // Request notification separately
      if (notificationPermission === "prompt" || notificationPermission === "denied") {
        await requestNotificationPermission();
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleContinue = () => {
    localStorage.setItem("permissions_requested", "true");
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem("permissions_requested", "true");
    onComplete();
  };

  const getPermissionStatus = (permission: "prompt" | "granted" | "denied") => {
    switch (permission) {
      case "granted":
        return { icon: Check, color: "text-green-600", bg: "bg-green-50", border: "border-green-200", text: "Granted" };
      case "denied":
        return { icon: X, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", text: "Denied" };
      default:
        return { icon: AlertCircle, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200", text: "Not Requested" };
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-sky-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border border-gray-200 animate-in slide-in-from-bottom-4">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Video className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Summit</h2>
            <p className="text-gray-600">We need a few permissions to provide the best experience</p>
            <p className="text-xs text-gray-500 mt-2">Note: Permission requests may take a few seconds as your browser initializes camera/microphone hardware</p>
          </div>

          {/* Permissions List */}
          <div className="space-y-4 mb-8">
            {/* Camera Permission */}
            <div className={`p-4 rounded-xl border-2 ${getPermissionStatus(cameraPermission).border} ${getPermissionStatus(cameraPermission).bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Video className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Camera Access</h3>
                    <p className="text-sm text-gray-600">Required for video calls and meetings</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const status = getPermissionStatus(cameraPermission);
                    const Icon = status.icon;
                    return (
                      <>
                        <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
                        {cameraPermission === "prompt" && (
                          <button
                            onClick={requestCameraPermission}
                            disabled={requesting}
                            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {requesting ? (
                              <>
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span>Requesting...</span>
                              </>
                            ) : (
                              "Request"
                            )}
                          </button>
                        )}
                        {cameraPermission === "granted" && (
                          <Icon className={`w-5 h-5 ${status.color}`} />
                        )}
                        {cameraPermission === "denied" && (
                          <Icon className={`w-5 h-5 ${status.color}`} />
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Microphone Permission */}
            <div className={`p-4 rounded-xl border-2 ${getPermissionStatus(microphonePermission).border} ${getPermissionStatus(microphonePermission).bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mic className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Microphone Access</h3>
                    <p className="text-sm text-gray-600">Required for audio and video calls</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const status = getPermissionStatus(microphonePermission);
                    const Icon = status.icon;
                    return (
                      <>
                        <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
                        {microphonePermission === "prompt" && (
                          <button
                            onClick={requestMicrophonePermission}
                            disabled={requesting}
                            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {requesting ? (
                              <>
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span>Requesting...</span>
                              </>
                            ) : (
                              "Request"
                            )}
                          </button>
                        )}
                        {microphonePermission === "granted" && (
                          <Icon className={`w-5 h-5 ${status.color}`} />
                        )}
                        {microphonePermission === "denied" && (
                          <Icon className={`w-5 h-5 ${status.color}`} />
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Notification Permission */}
            <div className={`p-4 rounded-xl border-2 ${getPermissionStatus(notificationPermission).border} ${getPermissionStatus(notificationPermission).bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Bell className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <p className="text-sm text-gray-600">Get notified about messages and meetings</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const status = getPermissionStatus(notificationPermission);
                    const Icon = status.icon;
                    return (
                      <>
                        <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
                        {notificationPermission === "prompt" && (
                          <button
                            onClick={requestNotificationPermission}
                            disabled={requesting}
                            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            Request
                          </button>
                        )}
                        {notificationPermission === "granted" && (
                          <Icon className={`w-5 h-5 ${status.color}`} />
                        )}
                        {notificationPermission === "denied" && (
                          <Icon className={`w-5 h-5 ${status.color}`} />
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleSkip}
              className="px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Skip for Now
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={requestAllPermissions}
                disabled={requesting || (cameraPermission === "granted" && microphonePermission === "granted" && notificationPermission === "granted")}
                className="px-6 py-3 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requesting ? "Requesting..." : "Request All"}
              </button>
              <button
                onClick={handleContinue}
                className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

