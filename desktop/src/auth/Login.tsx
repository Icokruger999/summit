import { useState } from "react";
import { authApi } from "../lib/api";
import { Mail, Lock, LogIn, UserPlus } from "lucide-react";
import logoImage from "../assets/logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountNotFound, setAccountNotFound] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAccountNotFound(false);

    try {
      if (isSignUp) {
        // Validate passwords match
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        // Validate password length
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setLoading(false);
          return;
        }

        const { user, token } = await authApi.register(email, password, name || undefined);
        localStorage.setItem("auth_token", token);
        localStorage.setItem("user", JSON.stringify(user));
        // Set flag to show first login popup
        localStorage.setItem("account_just_created", "true");
        // Force page reload to ensure App component re-initializes with auth state
        window.location.href = "/";
      } else {
        const { user, token } = await authApi.login(email, password);
        localStorage.setItem("auth_token", token);
        localStorage.setItem("user", JSON.stringify(user));
        // Force page reload to ensure App component re-initializes with auth state
        window.location.href = "/";
      }
    } catch (err: any) {
      const errorMessage = err.message || "Authentication failed";
      const statusCode = err.response?.status;
      
      // Check for network errors
      if (err.isNetworkError || statusCode === 0) {
        setError("Cannot connect to server. Please check your internet connection and try again.");
        setLoading(false);
        return;
      }
      
      // Check if account doesn't exist (only on sign in, not sign up)
      if (!isSignUp) {
        // Check for account not found error (404 status or specific message)
        const isNotFound = statusCode === 404 || 
                          errorMessage.toLowerCase().includes("account not found") ||
                          errorMessage.toLowerCase().includes("not found") ||
                          errorMessage.toLowerCase().includes("doesn't exist") ||
                          errorMessage.toLowerCase().includes("user not found");
        
        if (isNotFound) {
          setAccountNotFound(true);
          setError("Account doesn't exist. Would you like to create one?");
        } else {
          // For wrong password or other errors, show the actual error
          setError(errorMessage);
        }
      } else {
        // For sign up, show the actual error
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToSignUp = () => {
    setIsSignUp(true);
    setError(null);
    setAccountNotFound(false);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-sky-50">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="glass-frosty rounded-2xl shadow-2xl p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-2 overflow-hidden">
              <img src={logoImage} alt="Summit Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
              {isSignUp ? "Create your account" : "Welcome to Summit"}
            </h2>
            <p className="text-gray-500 text-sm">
              {isSignUp 
                ? "Start your journey with Summit" 
                : "Sign in to continue to Summit"}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`border-l-4 px-4 py-3 rounded-lg flex items-start gap-2 animate-in slide-in-from-top ${
              accountNotFound 
                ? "bg-blue-50 border-blue-500 text-blue-700" 
                : "bg-red-50 border-red-500 text-red-700"
            }`}>
              <div className={`w-2 h-2 rounded-full mt-1.5 ${
                accountNotFound ? "bg-blue-500" : "bg-red-500"
              }`}></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{error}</p>
                {accountNotFound && (
                  <button
                    onClick={handleSwitchToSignUp}
                    className="mt-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-lg hover:shadow-lg transition-all"
                  >
                    Create Account
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                Email address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Name Field (Sign Up Only) */}
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-500" />
                  Full Name (Optional)
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" />
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder={isSignUp ? "Create a password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Confirm Password Field (Sign Up Only) */}
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-500" />
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className={`w-full px-4 py-3 pl-11 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder:text-gray-400 ${
                      confirmPassword && password !== confirmPassword
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-200"
                    }`}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-600 mt-1 ml-1">Passwords do not match</p>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-sky-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {isSignUp ? (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span>Create Account</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Sign In</span>
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Toggle Sign Up/Sign In */}
          <div className="text-center pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setAccountNotFound(false);
                setPassword("");
                setConfirmPassword("");
                setName("");
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>

        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          by Coding Everest • Powered by LiveKit
        </p>
      </div>
    </div>
  );
}
