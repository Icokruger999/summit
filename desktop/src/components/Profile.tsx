import { useState, useEffect } from "react";
import { User, Edit2, Save, X, Upload, Briefcase, Phone } from "lucide-react";
import { usersApi } from "../lib/api";
import { useNavigate } from "react-router-dom";

interface ProfileProps {
  user: any;
  userId?: string; // If provided, view this user's profile (read-only)
}

export default function Profile({ user, userId }: ProfileProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email] = useState(user?.email || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [jobTitle, setJobTitle] = useState(user?.job_title || localStorage.getItem("jobTitle") || "");
  const [phone, setPhone] = useState(user?.phone || localStorage.getItem("phone") || "");
  const [loading, setLoading] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);

  useEffect(() => {
    if (userId && userId !== user?.id) {
      loadUserProfile();
    } else {
      setViewingUser(user);
    }
  }, [userId, user]);

  const loadUserProfile = async () => {
    try {
      const users = await usersApi.getAll();
      const foundUser = users.find((u) => u.id === userId);
      setViewingUser(foundUser || null);
      if (foundUser) {
        setName(foundUser.name || "");
        setAvatarUrl(foundUser.avatar_url || "");
        setJobTitle(foundUser.job_title || "");
        setPhone(foundUser.phone || "");
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Implement profile update API endpoint
      // For now, just update local storage
      const updatedUser = { ...user, name, avatar_url: avatarUrl, job_title: jobTitle, phone };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("jobTitle", jobTitle);
      localStorage.setItem("phone", phone);
      setIsEditing(false);
      // Show success message
      alert("Profile updated!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: Implement avatar upload to file storage
    // For now, create a local URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const displayUser = viewingUser || user;
  const canEdit = !userId || userId === user?.id;

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600" />
            {canEdit && isEditing ? "Edit Profile" : "Profile"}
          </h1>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              {displayUser?.avatar_url || avatarUrl ? (
                <img
                  src={displayUser?.avatar_url || avatarUrl}
                  alt={displayUser?.name || "User"}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-4xl font-bold text-white">
                    {(displayUser?.name || user?.name || "User").split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
              )}
              {canEdit && isEditing && (
                <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              {isEditing && canEdit ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="Enter your name"
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900">
                  {displayUser?.name || "Not set"}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900">
                {displayUser?.email || email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Job Title
              </label>
              {isEditing && canEdit ? (
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="e.g., Software Engineer, Product Manager"
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900">
                  {displayUser?.job_title || jobTitle || "Not set"}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                Phone Number
              </label>
              {isEditing && canEdit ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="e.g., +1 (555) 123-4567"
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900">
                  {displayUser?.phone || phone || "Not set"}
                </div>
              )}
            </div>

            {isEditing && canEdit && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setName(displayUser?.name || "");
                    setAvatarUrl(displayUser?.avatar_url || "");
                    setJobTitle(displayUser?.job_title || localStorage.getItem("jobTitle") || "");
                    setPhone(displayUser?.phone || localStorage.getItem("phone") || "");
                  }}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

