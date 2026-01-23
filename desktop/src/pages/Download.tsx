import { useEffect, useState } from "react";
import { Download, Monitor, Apple, Smartphone } from "lucide-react";
import iconImage from "../assets/icon.png";

type OS = "windows" | "mac" | "linux" | "unknown";

export default function DownloadPage() {
  const [detectedOS, setDetectedOS] = useState<OS>("unknown");

  useEffect(() => {
    // Detect user's operating system
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    if (userAgent.includes("win")) {
      setDetectedOS("windows");
    } else if (userAgent.includes("mac")) {
      setDetectedOS("mac");
    } else if (userAgent.includes("linux")) {
      setDetectedOS("linux");
    } else {
      setDetectedOS("unknown");
    }
  }, []);

  const handleDownload = (os: OS) => {
    if (os === "unknown") return;
    
    if (os === "windows") {
      // S3 Download URL (Ireland region)
      const s3Url = "https://desktopsummit.s3.eu-west-1.amazonaws.com/Summit-Setup-1.0.9.exe";
      window.location.href = s3Url;
    } else {
      // Other platforms coming soon
      console.log(`Download requested for ${os} - installers coming soon`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={iconImage} alt="Summit Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
                Summit
              </h1>
              <p className="text-xs text-gray-500">by Coding Everest</p>
            </div>
          </div>
          <a
            href="/"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            Back to App
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-sky-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Download className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Download Summit Desktop
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-4">
              Get the full Summit experience with native desktop notifications, better performance, and offline capabilities.
            </p>
            
            {/* Coming Soon Notice - Only for Mac/Linux */}
            {detectedOS !== "windows" && (
              <div className="max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  🚀 macOS and Linux installers coming soon
                </p>
                <p className="text-sm text-blue-700">
                  Windows desktop app is now available! Mac and Linux versions are being prepared.
                </p>
              </div>
            )}
            
            {/* Windows Available Notice */}
            {detectedOS === "windows" && (
              <div className="max-w-2xl mx-auto bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-green-800 font-medium mb-2">
                  ✅ Windows desktop app is ready!
                </p>
                <p className="text-sm text-green-700">
                  Download now to get native notifications and better performance.
                </p>
              </div>
            )}
          </div>

          {/* Download Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Windows */}
            <div
              className={`bg-white rounded-2xl p-6 border-2 transition-all ${
                detectedOS === "windows"
                  ? "border-blue-500 shadow-lg scale-105"
                  : "border-gray-200 hover:border-blue-300 hover:shadow-md"
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                  <Monitor className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Windows</h3>
                <p className="text-sm text-gray-600 mb-4">Windows 10 or later</p>
                {detectedOS === "windows" && (
                  <span className="text-xs font-medium text-blue-600 mb-3">
                    Recommended for your system
                  </span>
                )}
                <button
                  onClick={() => handleDownload("windows")}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Download for Windows
                </button>
              </div>
            </div>

            {/* macOS */}
            <div
              className={`bg-white rounded-2xl p-6 border-2 transition-all ${
                detectedOS === "mac"
                  ? "border-blue-500 shadow-lg scale-105"
                  : "border-gray-200 hover:border-blue-300 hover:shadow-md"
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Apple className="w-8 h-8 text-gray-700" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">macOS</h3>
                <p className="text-sm text-gray-600 mb-4">macOS 10.15 or later</p>
                {detectedOS === "mac" && (
                  <span className="text-xs font-medium text-blue-600 mb-3">
                    Recommended for your system
                  </span>
                )}
                <button
                  onClick={() => handleDownload("mac")}
                  disabled
                  className="w-full px-4 py-3 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </div>

            {/* Linux */}
            <div
              className={`bg-white rounded-2xl p-6 border-2 transition-all ${
                detectedOS === "linux"
                  ? "border-blue-500 shadow-lg scale-105"
                  : "border-gray-200 hover:border-blue-300 hover:shadow-md"
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
                  <Smartphone className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Linux</h3>
                <p className="text-sm text-gray-600 mb-4">Ubuntu, Debian, Fedora</p>
                {detectedOS === "linux" && (
                  <span className="text-xs font-medium text-blue-600 mb-3">
                    Recommended for your system
                  </span>
                )}
                <button
                  onClick={() => handleDownload("linux")}
                  disabled
                  className="w-full px-4 py-3 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Why Download the Desktop App?
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Native Notifications</h3>
                  <p className="text-sm text-gray-600">Get desktop notifications even when the app is minimized</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Better Performance</h3>
                  <p className="text-sm text-gray-600">Faster load times and smoother video calls</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Auto-Launch</h3>
                  <p className="text-sm text-gray-600">Start Summit automatically when you log in</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">System Tray</h3>
                  <p className="text-sm text-gray-600">Quick access from your system tray</p>
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              By downloading Summit, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-600">
          <p>© 2024 Coding Everest. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
