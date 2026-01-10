import { useState } from "react";
import { User, Briefcase, Phone, X, Save, SkipForward } from "lucide-react";
import { usersApi } from "../lib/api";

interface FirstLoginPopupProps {
  userId: string;
  onComplete: () => void;
}

export default function FirstLoginPopup({ userId, onComplete }: FirstLoginPopupProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSkip = () => {
    // Mark popup as shown in localStorage
    localStorage.setItem(`first_login_popup_shown_${userId}`, "true");
    onComplete();
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // Only send fields that have values
      const updateData: { job_title?: string; phone?: string; company?: string } = {};
      if (jobTitle.trim()) updateData.job_title = jobTitle.trim();
      if (phone.trim()) updateData.phone = phone.trim();
      if (company.trim()) updateData.company = company.trim();

      // Only call API if there's data to save
      if (Object.keys(updateData).length > 0) {
        await usersApi.updateProfile(updateData);
      }

      // Mark popup as shown in localStorage
      localStorage.setItem(`first_login_popup_shown_${userId}`, "true");
      onComplete();
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(err.message || "Failed to save profile information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-200 animate-in slide-in-from-bottom-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Welcome to Summit!</h3>
            <button
              onClick={handleSkip}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Help others get to know you better by adding some optional information about yourself.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Role / Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Software Engineer, Product Manager"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white text-gray-900 font-medium hover:border-blue-300 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                Cell / Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., +1 (555) 123-4567"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white text-gray-900 font-medium hover:border-blue-300 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Company Name
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Acme Corp, Tech Solutions Inc."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white text-gray-900 font-medium hover:border-blue-300 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSkip}
              disabled={loading}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Skip for Now
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

