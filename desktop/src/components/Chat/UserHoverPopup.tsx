import { createPortal } from "react-dom";
import { Mail, Phone, Briefcase, User } from "lucide-react";

interface UserHoverPopupProps {
  user: {
    id: string;
    name: string;
    email: string;
    job_title?: string;
    phone?: string;
    avatar_url?: string;
    status?: "online" | "away" | "busy" | "dnd" | "offline";
  };
  position: { x: number; y: number };
}

export default function UserHoverPopup({ user, position }: UserHoverPopupProps) {
  const popupContent = (
    <div
      className="fixed z-[9999] glass-card rounded-xl shadow-2xl border border-white/50 p-4 min-w-[280px] max-w-[320px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        marginTop: '-8px',
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="relative">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
            />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center border-2 border-white shadow-md">
                  <span className="text-sm font-semibold text-white">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
              )}
          {/* Status indicator */}
          {user.status && (
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              user.status === "online" ? "bg-green-500" :
              user.status === "away" ? "bg-yellow-500" :
              user.status === "busy" ? "bg-red-500" :
              user.status === "dnd" ? "bg-purple-500" :
              "bg-gray-400"
            }`}></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-lg truncate">{user.name}</h3>
          {user.job_title && (
            <p className="text-sm text-gray-600 truncate">{user.job_title}</p>
          )}
          {user.status && (
            <div className="mt-1">
              <span className="text-xs font-medium text-gray-600 capitalize">
                {user.status === "dnd" ? "Do Not Disturb" : user.status}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-2 border-t border-gray-200 pt-3">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-gray-700 truncate">{user.email}</span>
        </div>
        {user.phone && (
          <div className="flex items-center gap-3 text-sm">
            <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-gray-700">{user.phone}</span>
          </div>
        )}
        {user.job_title && (
          <div className="flex items-center gap-3 text-sm">
            <Briefcase className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-gray-700 truncate">{user.job_title}</span>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' 
    ? createPortal(popupContent, document.body)
    : null;
}

