import { useState } from "react";
import { Calendar, Clock, Users, X, Video, Check, XCircle } from "lucide-react";
import { formatTime } from "../../lib/timeFormat";

interface MeetingNotificationProps {
  meeting: {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    room_id: string;
    participants?: string[];
  };
  type: "upcoming" | "invitation";
  onJoin?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onDismiss?: () => void;
}

export default function MeetingNotification({
  meeting,
  type,
  onJoin,
  onAccept,
  onDecline,
  onDismiss,
}: MeetingNotificationProps) {
  const [showDetails, setShowDetails] = useState(false);

  const startTime = new Date(meeting.start_time);
  const endTime = new Date(meeting.end_time);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <>
      {/* Notification Tab in Chat List */}
      <div
        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-all cursor-pointer border-l-4 ${
          type === "upcoming"
            ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-500"
            : "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-500"
        }`}
        onClick={() => setShowDetails(true)}
      >
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            type === "upcoming"
              ? "bg-gradient-to-br from-indigo-500 to-purple-600"
              : "bg-gradient-to-br from-blue-500 to-cyan-600"
          }`}>
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {type === "upcoming" ? meeting.title : `Invited: ${meeting.title}`}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss?.();
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {type === "upcoming" 
                ? `Starts in ${Math.round((startTime.getTime() - Date.now()) / (1000 * 60))} minutes`
                : "You have a meeting invitation"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">{formatTime(startTime)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Popup */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 border border-gray-200 animate-in slide-in-from-bottom-4">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    type === "upcoming"
                      ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                      : "bg-gradient-to-br from-blue-500 to-cyan-600"
                  }`}>
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{meeting.title}</h3>
                    <p className="text-sm text-gray-500">
                      {type === "upcoming" ? "Upcoming Meeting" : "Meeting Invitation"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Description */}
              {meeting.description && (
                <div className="mb-6">
                  <p className="text-gray-700">{meeting.description}</p>
                </div>
              )}

              {/* Meeting Details */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(startTime)}</p>
                    <p className="text-sm text-gray-600">
                      {formatTime(startTime)} - {formatTime(endTime)} ({duration} minutes)
                    </p>
                  </div>
                </div>

                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Users className="w-5 h-5 text-indigo-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-2">Participants</p>
                      <div className="flex flex-wrap gap-2">
                        {meeting.participants.map((participant, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-700"
                          >
                            {participant}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                {type === "upcoming" ? (
                  <button
                    onClick={() => {
                      onJoin?.();
                      setShowDetails(false);
                    }}
                    className="flex-1 px-6 py-3 text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2"
                  >
                    <Video className="w-5 h-5" />
                    Join Now
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onDecline?.();
                        setShowDetails(false);
                      }}
                      className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Decline
                    </button>
                    <button
                      onClick={() => {
                        onAccept?.();
                        setShowDetails(false);
                      }}
                      className="flex-1 px-6 py-3 text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Accept
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

