import { useEffect } from "react";
import { CheckCircle, X, Info, AlertCircle, AlertTriangle } from "lucide-react";

interface NotificationToastProps {
  message: string;
  type?: "success" | "info" | "warning" | "error";
  duration?: number;
  onClose: () => void;
}

export default function NotificationToast({
  message,
  type = "success",
  duration = 5000, // Default to 5 seconds
  onClose,
}: NotificationToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: CheckCircle,
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  const colors = {
    success: {
      icon: "text-green-600",
      bg: "bg-green-50/80",
      border: "border-green-200/50",
    },
    info: {
      icon: "text-blue-600",
      bg: "bg-blue-50/80",
      border: "border-blue-200/50",
    },
    warning: {
      icon: "text-yellow-600",
      bg: "bg-yellow-50/80",
      border: "border-yellow-200/50",
    },
    error: {
      icon: "text-red-600",
      bg: "bg-red-50/80",
      border: "border-red-200/50",
    },
  };

  const Icon = icons[type];
  const colorScheme = colors[type];

  return (
    <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-top-4 fade-in">
      <div
        className={`
          ${colorScheme.bg}
          ${colorScheme.border}
          backdrop-filter backdrop-blur-xl
          -webkit-backdrop-filter backdrop-blur-xl
          border-2 rounded-2xl shadow-2xl
          px-6 py-4 min-w-[320px] max-w-md
          flex items-start gap-4
          relative overflow-hidden
        `}
        style={{
          background: `rgba(255, 255, 255, ${type === "success" ? "0.9" : type === "error" ? "0.9" : "0.85"})`,
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: `
            0 8px 32px 0 rgba(31, 38, 135, 0.2),
            0 4px 16px 0 rgba(31, 38, 135, 0.15),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.7),
            inset 0 -1px 0 0 rgba(255, 255, 255, 0.3)
          `,
        }}
      >
        {/* Decorative gradient overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${
              type === "success"
                ? "rgba(34, 197, 94, 0.3)"
                : type === "error"
                ? "rgba(239, 68, 68, 0.3)"
                : type === "warning"
                ? "rgba(234, 179, 8, 0.3)"
                : "rgba(59, 130, 246, 0.3)"
            } 0%, transparent 100%)`,
          }}
        />

        {/* Icon */}
        <div className={`flex-shrink-0 ${colorScheme.icon}`}>
          <Icon className="w-6 h-6" />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 font-medium leading-relaxed">{message}</p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors text-gray-400 hover:text-gray-600"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

