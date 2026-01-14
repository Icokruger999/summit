import { useState } from "react";
import { authApi } from "../lib/api";
import { Mail, Lock, LogIn, UserPlus, Briefcase, Phone, AlertTriangle } from "lucide-react";
import logoImage from "../assets/logo.png";

export default function Login() {
  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Signup state
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("N/A");
  const [phone, setPhone] = useState("N/A");
  const [company, setCompany] = useState("N/A");
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAccountNotFound(false);
    setSignupSuccess(false);

    try {
      if (isSignUp) {
        // Validate required fields
        if (!name || name.trim() === "") {
          setError("Name is required");
          setLoading(false);
          return;
        }

        if (!email || email.trim() === "") {
          setError("Email is required");
          setLoading(false);
          return;
        }

        // Register user (no password needed)
        await authApi.register(
          email.trim(),
          name.trim(),
          jobTitle.trim() === "" || jobTitle.trim().toUpperCase() === "N/A" ? undefined : jobTitle.trim(),
          phone.trim() === "" || phone.trim().toUpperCase() === "N/A" ? undefined : phone.trim(),
          company.trim() === "" || company.trim().toUpperCase() === "N/A" ? undefined : company.trim()
        );

        // Show success message
        setSignupSuccess(true);
        setError(null);
        
        // Clear form
        setName("");
        setEmail("");
        setJobTitle("N/A");
        setPhone("N/A");
        setCompany("N/A");
      } else {
        // Login
        const response = await authApi.login(email, password);
        localStorage.setItem("auth_token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
        
        // Store password change requirement
        if (response.requiresPasswordChange) {
          localStorage.setItem("requires_password_change", "true");
        }
        
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
    setSignupSuccess(false);
    setPassword("");
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

          {/* Success Message (Signup) */}
          {signupSuccess && (
            <div className="border-l-4 px-4 py-3 rounded-lg flex items-start gap-2 bg-green-50 border-green-500 text-green-700">
              <div className="w-2 h-2 rounded-full mt-1.5 bg-green-500"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Account created successfully! Please check your email for your temporary password.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !signupSuccess && (
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

          {/* Warning Message (Signup) */}
          {isSignUp && !signupSuccess && (
            <div className="border-l-4 px-4 py-3 rounded-lg flex items-start gap-2 bg-amber-50 border-amber-500 text-amber-700">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  A temporary password will be sent to your email. You must change it within 24 hours or your account will be deleted.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                Email address {isSignUp && <span className="text-red-500">*</span>}
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

            {/* Name Field (Sign Up Only - Required) */}
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-500" />
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            {/* Job Title Field (Sign Up Only - Optional) */}
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="jobTitle" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  Job Title / Role
                </label>
                <input
                  id="jobTitle"
                  name="jobTitle"
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder="N/A (optional)"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
            )}

            {/* Phone Field (Sign Up Only - Optional) */}
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500" />
                  Cell / Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder="N/A (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}

            {/* Company Field (Sign Up Only - Optional) */}
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="company" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  Company / Business Name
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder="N/A (optional)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            )}

            {/* Password Field (Login Only) */}
            {!isSignUp && (
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
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder:text-gray-400"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || signupSuccess}
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
                setSignupSuccess(false);
                setPassword("");
                setName("");
                setEmail("");
                setJobTitle("N/A");
                setPhone("N/A");
                setCompany("N/A");
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
