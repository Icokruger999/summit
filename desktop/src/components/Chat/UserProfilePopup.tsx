import { useState, useEffect } from "react";
import { X, Mail, Briefcase, Phone, User } from "lucide-react";
import { usersApi } from "../../lib/api";
import { SkeletonAvatar, SkeletonText, Skeleton } from "../ui/Skeleton";

interface UserProfilePopupProps {
  userId: string;
  initialData?: {
    name?: string;
    email?: string;
    company?: string;
    avatar_url?: string;
  };
  onClose: () => void;
}

export default function UserProfilePopup({
  userId,
  initialData,
  onClose,
}: UserProfilePopupProps) {
  const [profile, setProfile] = useState<any>(initialData || {});
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (initialData) {
        setProfile(initialData);
        return;
      }

      setLoading(true);
      try {
        const data = await usersApi.getProfile(userId);
        setProfile(data);
      } catch (err: any) {
        console.error("Error loading profile:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId, initialData]);

  // Get job title and phone from profile data (from database)
  const jobTitle = profile?.job_title || "";
  const phone = profile?.phone || "";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border border-gray-200 animate-in slide-in-from-bottom-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">User Profile</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-6">
              {/* Avatar and Name Skeleton */}
              <div className="flex flex-col items-center text-center">
                <SkeletonAvatar size={96} className="mb-4" />
                <div className="space-y-2 w-48">
                  <Skeleton variant="text" width="100%" height={28} />
                  <Skeleton variant="text" width="70%" height={20} className="mx-auto" />
                </div>
              </div>
              {/* Profile Details Skeleton */}
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Skeleton variant="rect" width={20} height={20} className="rounded" />
                      <Skeleton variant="text" width={100} height={16} />
                    </div>
                    <Skeleton variant="text" width="80%" height={16} className="ml-8" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Avatar and Name */}
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-sky-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name || profile.email}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-white" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {profile.name || "No name"}
                </h2>
                {profile.email && (
                  <p className="text-gray-500">{profile.email}</p>
                )}
              </div>

              {/* Profile Details */}
              <div className="space-y-4">
                {/* Email */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-700">Email</label>
                  </div>
                  <p className="text-gray-900 ml-8">{profile.email || "Not provided"}</p>
                </div>

                {/* Company */}
                {profile.company && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                      <label className="text-sm font-semibold text-gray-700">Company</label>
                    </div>
                    <p className="text-gray-900 ml-8">{profile.company}</p>
                  </div>
                )}

                {/* Job Title (Role) */}
                {jobTitle && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                      <label className="text-sm font-semibold text-gray-700">Job Title / Role</label>
                    </div>
                    <p className="text-gray-900 ml-8">{jobTitle}</p>
                  </div>
                )}

                {/* Phone */}
                {phone && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Phone className="w-5 h-5 text-blue-600" />
                      <label className="text-sm font-semibold text-gray-700">Phone</label>
                    </div>
                    <p className="text-gray-900 ml-8">{phone}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

