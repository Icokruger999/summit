import { useState } from "react";
import { authApi } from "../lib/api";
import { Lock, AlertCircle, Check } from "lucide-react";
import logoImage from "../assets/logo.png";

interface PasswordChangeProps {
  onComplete: () => void;
}

export default function PasswordChange({ onComplete }: PasswordChangeProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from your current password");
      setLoading(false);
      return;
    }

    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setError(null);
      
      // Clear password change requirement flag
      localStorage.removeItem("requires_password_change");
      
      // Wait a moment to show success message, then proceed
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to change password";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-sky-50 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative w-full max-w-md mx-4">
        <div className="glass-frosty rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-2 overflow-hidden">
              <img src={logoImage} alt="Summit Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
              Create Your Password
            </h2>
            <p className="text-gray-600 text-sm">
              You must create a new password to continue
            </p>
          </div>

          {/* Warning */}
          <div className="border-l-4 px-4 py-3 rounded-lg flex items-start gap-2 bg-amber-50 border-amber-500 text-amber-700">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                This step cannot be skipped. Please create a secure password to continue using Summit.
              </p>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="border-l-4 px-4 py-3 rounded-lg flex items-start gap-2 bg-green-50 border-green-500 text-green-700">
              <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Password changed successfully! Redirecting...
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !success && (
            <div className="border-l-4 px-4 py-3 rounded-lg flex items-start gap-2 bg-red-50 border-red-500 text-red-700">
              <div className="w-2 h-2 rounded-full mt-1.5 bg-red-500"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          {!success && (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Current Password */}
              <div className="space-y-2">
                <label htmlFor="currentPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-500" />
                  Current Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder:text-gray-400"
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-500" />
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder:text-gray-400"
                    placeholder="Create a new password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                {newPassword && newPassword.length < 6 && (
                  <p className="text-xs text-red-600 mt-1">Password must be at least 6 characters</p>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-500" />
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className={`w-full px-4 py-3 pl-11 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder:text-gray-400 ${
                      confirmPassword && newPassword !== confirmPassword
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-200"
                    }`}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-sky-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Changing Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Create Password</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
