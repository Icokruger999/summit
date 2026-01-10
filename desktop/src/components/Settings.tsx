import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Mic, Video, Bell, Monitor, LogOut, ArrowLeft, Volume2, Briefcase, Phone, Check, X, AlertCircle, User, Moon, Sun, Edit2, Save, XCircle, Download, MonitorSpeaker } from "lucide-react";
import { authApi, usersApi } from "../lib/api";
import { useNavigate } from "react-router-dom";

interface SettingsProps {
  user: any;
  onSignOut: () => void;
}

type TabType = "audio" | "profile" | "appearance" | "notifications" | "permissions";

export default function Settings({ user, onSignOut }: SettingsProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("audio");
  
  // Audio/Video
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>("");
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>("");
  
  // Profile
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    job_title: "",
    phone: "",
    company: "",
  });
  const [originalProfileData, setOriginalProfileData] = useState(profileData);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Appearance
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("24h");
  const [uiScale, setUiScale] = useState<"small" | "medium" | "large">("medium");
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  
  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [meetingReminders, setMeetingReminders] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  
  // Permissions
  const [cameraPermission, setCameraPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [microphonePermission, setMicrophonePermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [notificationPermission, setNotificationPermission] = useState<"prompt" | "granted" | "denied">("prompt");

  useEffect(() => {
    loadDevices();
    loadSettings();
    checkPermissions();
    loadProfile();
    
    // Apply UI scale on mount
    const savedUiScale = localStorage.getItem("ui_scale") as "small" | "medium" | "large" | null;
    if (savedUiScale) {
      applyUiScale(savedUiScale);
    } else {
      applyUiScale("medium"); // Default
    }
  }, [user]);

  // Load profile from API
  const loadProfile = async () => {
    try {
      const currentUser = await authApi.getMe();
      setProfileData({
        name: currentUser.name || "",
        job_title: currentUser.job_title || "",
        phone: currentUser.phone || "",
        company: currentUser.company || "",
      });
      setOriginalProfileData({
        name: currentUser.name || "",
        job_title: currentUser.job_title || "",
        phone: currentUser.phone || "",
        company: currentUser.company || "",
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      // Fallback to user prop
      if (user) {
        setProfileData({
          name: user.name || "",
          job_title: user.job_title || "",
          phone: user.phone || "",
          company: user.company || "",
        });
        setOriginalProfileData({
          name: user.name || "",
          job_title: user.job_title || "",
          phone: user.phone || "",
          company: user.company || "",
        });
      }
    }
  };

  const checkPermissions = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoDevices = devices.some(d => d.kind === "videoinput" && d.label);
      const hasAudioDevices = devices.some(d => d.kind === "audioinput" && d.label);
      
      if (hasVideoDevices) {
        setCameraPermission("granted");
      }
      if (hasAudioDevices) {
        setMicrophonePermission("granted");
      }
    } catch (error) {
      // Can't enumerate devices, leave as prompt
    }

    if ("Notification" in window) {
      const permission = Notification.permission;
      setNotificationPermission(permission === "granted" ? "granted" : permission === "denied" ? "denied" : "prompt");
    } else {
      setNotificationPermission("denied");
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission("granted");
    } catch (error) {
      setCameraPermission("denied");
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicrophonePermission("granted");
    } catch (error) {
      setMicrophonePermission("denied");
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission === "granted" ? "granted" : "denied");
    }
  };

  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      const audioOutputs = devices.filter((d) => d.kind === "audiooutput");
      const videoInputs = devices.filter((d) => d.kind === "videoinput");

      setAudioDevices([...audioInputs, ...audioOutputs]);
      setVideoDevices(videoInputs);

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

  const loadSettings = () => {
    const notifications = localStorage.getItem("notificationsEnabled");
    const reminders = localStorage.getItem("meetingReminders");
    const savedTimeFormat = localStorage.getItem("timeFormat") as "12h" | "24h" | null;
    const savedUiScale = localStorage.getItem("ui_scale") as "small" | "medium" | "large" | null;
    const savedDarkMode = localStorage.getItem("dark_mode_enabled");
    const savedSoundsEnabled = localStorage.getItem("soundsEnabled");

    if (notifications !== null) {
      setNotificationsEnabled(notifications === "true");
    }
    if (reminders !== null) {
      setMeetingReminders(reminders === "true");
    }
    if (savedTimeFormat) {
      setTimeFormat(savedTimeFormat);
    }
    if (savedUiScale) {
      setUiScale(savedUiScale);
      applyUiScale(savedUiScale);
    }
    if (savedDarkMode !== null) {
      setDarkModeEnabled(savedDarkMode === "true");
    }
    if (savedSoundsEnabled !== null) {
      setSoundsEnabled(savedSoundsEnabled === "true");
    }
  };

  const applyUiScale = (scale: "small" | "medium" | "large") => {
    const scaleMap = {
      small: "14px",
      medium: "16px",
      large: "18px",
    };
    document.documentElement.style.fontSize = scaleMap[scale];
    document.documentElement.setAttribute("data-scale", scale);
  };

  const handleUiScaleChange = (scale: "small" | "medium" | "large") => {
    setUiScale(scale);
    localStorage.setItem("ui_scale", scale);
    applyUiScale(scale);
  };

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkModeEnabled(enabled);
    localStorage.setItem("dark_mode_enabled", enabled.toString());
    // No functionality yet, just storing preference
  };

  const saveSettings = () => {
    localStorage.setItem("audioInputDeviceId", selectedAudioInput);
    localStorage.setItem("audioOutputDeviceId", selectedAudioOutput);
    localStorage.setItem("videoInputDeviceId", selectedVideoInput);
    localStorage.setItem("notificationsEnabled", notificationsEnabled.toString());
    localStorage.setItem("meetingReminders", meetingReminders.toString());
    localStorage.setItem("timeFormat", timeFormat);
    localStorage.setItem("soundsEnabled", soundsEnabled.toString());
    
    if (selectedAudioOutput && 'setSinkId' in HTMLAudioElement.prototype) {
      localStorage.setItem("audioOutputDeviceId", selectedAudioOutput);
    }
    
    alert("Settings saved! Your preferences have been updated.");
  };

  const handleProfileEdit = () => {
    setIsEditingProfile(true);
  };

  const handleProfileCancel = () => {
    setProfileData(originalProfileData);
    setIsEditingProfile(false);
  };

  const handleProfileSave = async () => {
    setSavingProfile(true);
    try {
      // Build update data - send all fields, converting empty strings to undefined (not null)
      const updateData: { name?: string; job_title?: string; phone?: string; company?: string } = {};
      
      // Always send name (can be cleared)
      const trimmedName = profileData.name.trim();
      updateData.name = trimmedName || undefined;
      
      // Send other fields only if they have values or are being cleared
      const trimmedJobTitle = profileData.job_title.trim();
      updateData.job_title = trimmedJobTitle || undefined;
      const trimmedPhone = profileData.phone.trim();
      updateData.phone = trimmedPhone || undefined;
      const trimmedCompany = profileData.company.trim();
      updateData.company = trimmedCompany || undefined;
      
      const updatedUser = await usersApi.updateProfile(updateData);
      
      // Update local state with the response
      setProfileData({
        name: updatedUser.name || "",
        job_title: updatedUser.job_title || "",
        phone: updatedUser.phone || "",
        company: updatedUser.company || "",
      });
      setOriginalProfileData({
        name: updatedUser.name || "",
        job_title: updatedUser.job_title || "",
        phone: updatedUser.phone || "",
        company: updatedUser.company || "",
      });
      setIsEditingProfile(false);
      
      // Update localStorage user object
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          Object.assign(userObj, updatedUser);
          localStorage.setItem("user", JSON.stringify(userObj));
        } catch (e) {
          console.error("Error updating user in localStorage:", e);
        }
      }
      
      alert("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      let errorMessage = "Failed to save profile. Please try again.";
      
      // Try to extract error message from various possible locations
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please check if the database columns (job_title, phone) exist. You may need to run a migration.";
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid data. Please check your input.";
      } else if (error.response?.status === 401) {
        errorMessage = "Unauthorized. Please log in again.";
      }
      
      alert(`Error: ${errorMessage}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const tabs = [
    { id: "audio" as TabType, label: "Audio/Video", icon: Mic },
    { id: "profile" as TabType, label: "Profile", icon: User },
    { id: "appearance" as TabType, label: "Appearance", icon: Monitor },
    { id: "notifications" as TabType, label: "Notifications", icon: Bell },
    { id: "permissions" as TabType, label: "Permissions", icon: AlertCircle },
  ];

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="mb-4 text-gray-500 hover:text-gray-700 flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-blue-600" />
            Settings
          </h1>
          <p className="text-gray-500">Manage your app preferences and device settings</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Audio/Video Tab */}
          {activeTab === "audio" && (
            <section className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Mic className="w-5 h-5 text-blue-600" />
                Audio & Video
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Select which devices to use for calls. These preferences will be applied automatically when you join a call.
              </p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-blue-600" />
                    Microphone
                  </label>
                  <div className="relative">
                    <select
                      value={selectedAudioInput}
                      onChange={(e) => setSelectedAudioInput(e.target.value)}
                      className="w-full px-4 py-3.5 pl-12 pr-10 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white/90 backdrop-blur-sm text-gray-900 font-medium appearance-none cursor-pointer hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%233b82f6' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 1rem center',
                        backgroundSize: '12px',
                      }}
                    >
                      {audioDevices
                        .filter((d) => d.kind === "audioinput")
                        .map((device) => (
                          <option key={device.deviceId} value={device.deviceId} className="text-gray-900 bg-white">
                            {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                          </option>
                        ))}
                    </select>
                    <Mic className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-blue-600" />
                    Speakers
                  </label>
                  <div className="relative">
                    <select
                      value={selectedAudioOutput}
                      onChange={(e) => setSelectedAudioOutput(e.target.value)}
                      className="w-full px-4 py-3.5 pl-12 pr-10 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white/90 backdrop-blur-sm text-gray-900 font-medium appearance-none cursor-pointer hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%233b82f6' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 1rem center',
                        backgroundSize: '12px',
                      }}
                    >
                      {audioDevices
                        .filter((d) => d.kind === "audiooutput")
                        .map((device) => (
                          <option key={device.deviceId} value={device.deviceId} className="text-gray-900 bg-white">
                            {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                          </option>
                        ))}
                    </select>
                    <Volume2 className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-600" />
                    Camera
                  </label>
                  <div className="relative">
                    <select
                      value={selectedVideoInput}
                      onChange={(e) => setSelectedVideoInput(e.target.value)}
                      className="w-full px-4 py-3.5 pl-12 pr-10 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white/90 backdrop-blur-sm text-gray-900 font-medium appearance-none cursor-pointer hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%233b82f6' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 1rem center',
                        backgroundSize: '12px',
                      }}
                    >
                      {videoDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId} className="text-gray-900 bg-white">
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                    <Video className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={saveSettings}
                  className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  Save Settings
                </button>
              </div>
            </section>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <section className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Profile
                </h2>
                {!isEditingProfile && (
                  <button
                    onClick={handleProfileEdit}
                    className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Email</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 border-2 border-gray-200">
                    {user?.email || "Not set"}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Name</label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white text-gray-900 font-medium"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 border-2 border-gray-200">
                      {profileData.name || "Not set"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    Job Title / Role
                  </label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileData.job_title}
                      onChange={(e) => setProfileData({ ...profileData, job_title: e.target.value })}
                      placeholder="e.g., Software Engineer, Product Manager"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white text-gray-900 font-medium"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 border-2 border-gray-200">
                      {profileData.job_title || "Not set"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600" />
                    Phone / Cell
                  </label>
                  {isEditingProfile ? (
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="e.g., +1 (555) 123-4567"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white text-gray-900 font-medium"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 border-2 border-gray-200">
                      {profileData.phone || "Not set"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    Company
                  </label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileData.company}
                      onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                      placeholder="e.g., Acme Corp, Tech Solutions Inc."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white text-gray-900 font-medium"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 border-2 border-gray-200">
                      {profileData.company || "Not set"}
                    </div>
                  )}
                </div>

                {isEditingProfile && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleProfileCancel}
                      disabled={savingProfile}
                      className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleProfileSave}
                      disabled={savingProfile}
                      className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {savingProfile ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-200 mt-6">
                  <button
                    onClick={onSignOut}
                    className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <section className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-600" />
                Appearance
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Customize how the app looks and feels
              </p>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">
                    Time Format
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="timeFormat"
                        value="12h"
                        checked={timeFormat === "12h"}
                        onChange={(e) => {
                          setTimeFormat(e.target.value as "12h" | "24h");
                          localStorage.setItem("timeFormat", e.target.value);
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">12-hour (AM/PM)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="timeFormat"
                        value="24h"
                        checked={timeFormat === "24h"}
                        onChange={(e) => {
                          setTimeFormat(e.target.value as "12h" | "24h");
                          localStorage.setItem("timeFormat", e.target.value);
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">24-hour</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Choose how times are displayed throughout the app
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">
                    UI Scaling
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["small", "medium", "large"] as const).map((scale) => (
                      <button
                        key={scale}
                        onClick={() => handleUiScaleChange(scale)}
                        className={`px-4 py-3 border-2 rounded-xl transition-all font-medium ${
                          uiScale === scale
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {scale.charAt(0).toUpperCase() + scale.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Adjust the size of text and UI elements (like Windows scaling)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Moon className="w-4 h-4 text-blue-600" />
                    Dark Mode
                  </label>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                    <div>
                      <div className="font-medium text-gray-900">Enable Dark Mode</div>
                      <p className="text-xs text-gray-500 mt-1">Coming soon - toggle is saved but not functional yet</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={darkModeEnabled}
                        onChange={(e) => handleDarkModeToggle(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={saveSettings}
                  className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  Save Settings
                </button>
              </div>
            </section>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <section className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Notifications
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Control how and when you receive notifications
              </p>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">General Notifications</div>
                    <div className="text-sm text-gray-500 mt-1">Receive notifications for messages, calls, and other important updates</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => {
                      setNotificationsEnabled(e.target.checked);
                      localStorage.setItem("notificationsEnabled", e.target.checked.toString());
                    }}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">Meeting Reminders</div>
                    <div className="text-sm text-gray-500 mt-1">Get notified 5 minutes before scheduled meetings start</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={meetingReminders}
                    onChange={(e) => {
                      setMeetingReminders(e.target.checked);
                      localStorage.setItem("meetingReminders", e.target.checked.toString());
                    }}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">Sound Notifications</div>
                    <div className="text-sm text-gray-500 mt-1">Play sounds for incoming messages and notifications</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundsEnabled}
                    onChange={(e) => {
                      setSoundsEnabled(e.target.checked);
                      localStorage.setItem("soundsEnabled", e.target.checked.toString());
                    }}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
                <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900">Desktop Notifications</div>
                      <div className="text-sm text-blue-700 mt-1">
                        Status: {notificationPermission === "granted" ? "Enabled" : notificationPermission === "denied" ? "Blocked" : "Not requested"}
                      </div>
                    </div>
                    {notificationPermission !== "granted" && (
                      <button
                        onClick={requestNotificationPermission}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        Request Permission
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={saveSettings}
                  className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all font-medium"
                >
                  Save Settings
                </button>
              </div>
            </section>
          )}

          {/* Permissions Tab */}
          {activeTab === "permissions" && (
            <section className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Permissions
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Manage app permissions for camera, microphone, and notifications. These permissions are required for video calls and notifications.
              </p>
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border-2 ${
                  cameraPermission === "granted" ? "border-green-200 bg-green-50" :
                  cameraPermission === "denied" ? "border-red-200 bg-red-50" :
                  "border-gray-200 bg-gray-50"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Video className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Camera Access</h3>
                        <p className="text-sm text-gray-600">Required for video calls. Allows the app to access your camera to enable video functionality during meetings and calls.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {cameraPermission === "granted" && (
                        <>
                          <span className="text-sm font-medium text-green-600">Granted</span>
                          <Check className="w-5 h-5 text-green-600" />
                        </>
                      )}
                      {cameraPermission === "denied" && (
                        <>
                          <span className="text-sm font-medium text-red-600">Denied</span>
                          <X className="w-5 h-5 text-red-600" />
                        </>
                      )}
                      {cameraPermission === "prompt" && (
                        <>
                          <span className="text-sm font-medium text-gray-600">Not Requested</span>
                          <AlertCircle className="w-5 h-5 text-gray-600" />
                        </>
                      )}
                      {cameraPermission !== "granted" && (
                        <button
                          onClick={requestCameraPermission}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          Request
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border-2 ${
                  microphonePermission === "granted" ? "border-green-200 bg-green-50" :
                  microphonePermission === "denied" ? "border-red-200 bg-red-50" :
                  "border-gray-200 bg-gray-50"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Mic className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Microphone Access</h3>
                        <p className="text-sm text-gray-600">Required for audio and video calls. Allows the app to access your microphone so you can speak during meetings and calls.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {microphonePermission === "granted" && (
                        <>
                          <span className="text-sm font-medium text-green-600">Granted</span>
                          <Check className="w-5 h-5 text-green-600" />
                        </>
                      )}
                      {microphonePermission === "denied" && (
                        <>
                          <span className="text-sm font-medium text-red-600">Denied</span>
                          <X className="w-5 h-5 text-red-600" />
                        </>
                      )}
                      {microphonePermission === "prompt" && (
                        <>
                          <span className="text-sm font-medium text-gray-600">Not Requested</span>
                          <AlertCircle className="w-5 h-5 text-gray-600" />
                        </>
                      )}
                      {microphonePermission !== "granted" && (
                        <button
                          onClick={requestMicrophonePermission}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          Request
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border-2 ${
                  notificationPermission === "granted" ? "border-green-200 bg-green-50" :
                  notificationPermission === "denied" ? "border-red-200 bg-red-50" :
                  "border-gray-200 bg-gray-50"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Bell className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Notification Permission</h3>
                        <p className="text-sm text-gray-600">Allows the app to send you desktop notifications for messages, calls, and meeting reminders even when the app is not in focus.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {notificationPermission === "granted" && (
                        <>
                          <span className="text-sm font-medium text-green-600">Granted</span>
                          <Check className="w-5 h-5 text-green-600" />
                        </>
                      )}
                      {notificationPermission === "denied" && (
                        <>
                          <span className="text-sm font-medium text-red-600">Denied</span>
                          <X className="w-5 h-5 text-red-600" />
                        </>
                      )}
                      {notificationPermission === "prompt" && (
                        <>
                          <span className="text-sm font-medium text-gray-600">Not Requested</span>
                          <AlertCircle className="w-5 h-5 text-gray-600" />
                        </>
                      )}
                      {notificationPermission !== "granted" && (
                        <button
                          onClick={requestNotificationPermission}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          Request
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Download Desktop App Section (Web only) */}
          {typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window) && (
            <section className="mt-8 pt-8 border-t border-gray-200">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MonitorSpeaker className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Download Desktop App</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Get the full Summit experience with the desktop app. Enjoy local recording, desktop notifications, and offline capabilities.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href="/download"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-sm shadow-sm hover:shadow-md"
                      >
                        <Download className="w-4 h-4" />
                        Download for Windows
                      </a>
                      <a
                        href="/download"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm"
                      >
                        Other Platforms
                      </a>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Available for Windows, macOS, and Linux
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
