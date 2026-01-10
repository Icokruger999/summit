import { useEffect, useState } from "react";
import logoImage from "../assets/icon.png";
import { getAuthToken } from "../lib/api";
import { usePreload } from "../hooks/usePreload";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  
  // Get user from localStorage to preload
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userId = user?.id || null;
  
  // Preload everything silently during splash screen
  usePreload({ userId, enabled: !!userId });

  useEffect(() => {
    // Start fade out after 2.5 seconds, complete after 3 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2500);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-gradient-to-br from-blue-50 via-white to-sky-50 flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl"
          style={{
            top: '-10%',
            left: '-5%',
            animation: 'morphBlob1 20s ease-in-out infinite',
          }}
        ></div>
        <div
          className="absolute w-[450px] h-[450px] bg-sky-400/20 rounded-full blur-3xl"
          style={{
            bottom: '-10%',
            right: '-5%',
            animation: 'morphBlob2 25s ease-in-out infinite',
          }}
        ></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Logo */}
        <div className="mb-8 animate-in zoom-in duration-700">
          <div className="w-32 h-32 rounded-2xl shadow-2xl overflow-hidden bg-white p-4 flex items-center justify-center">
            <img
              src={logoImage}
              alt="Summit Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          Summit
        </h1>

        {/* Subtitle */}
        <p className="text-gray-500 text-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          by Coding Everest
        </p>

        {/* Loading indicator */}
        <div className="flex items-center gap-2 animate-in fade-in duration-700 delay-700">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>

      {/* CSS animations for blobs */}
      <style>{`
        @keyframes morphBlob1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          }
          50% {
            transform: translate(50px, 50px) scale(1.1);
            border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
          }
        }
        @keyframes morphBlob2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
          }
          50% {
            transform: translate(-50px, -50px) scale(1.1);
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          }
        }
      `}</style>
    </div>
  );
}

