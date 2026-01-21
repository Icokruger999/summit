import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, X, Calendar, Video, Check, XCircle, UserPlus, MessageSquare } from "lucide-react";
import { useMeetingNotifications } from "../../hooks/useMeetingNotifications";
import { formatTime } from "../../lib/timeFormat";
import { sounds } from "../../lib/sounds";

interface NotificationCenterProps {
  userId: string;
  onJoinMeeting?: (roomName: string) => void;
  pendingChatRequests?: any[];
  persistentNotifications?: any[]; // Add persistent notifications prop
  onNavigateToContacts?: () => void;
  onDismissNotification?: (notificationId: string) => void; // Callback to dismiss notification
}

export default function NotificationCenter({
  userId,
  onJoinMeeting,
  pendingChatRequests = [],
  persistentNotifications = [],
  onNavigateToContacts,
  onDismissNotification,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const {
    upcomingMeetings,
    meetingInvitations,
    dismissUpcoming,
    dismissInvitation,
    acceptInvitation,
    declineInvitation,
  } = useMeetingNotifications(userId);

  // Update position when dropdown opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const totalNotifications = upcomingMeetings.length + meetingInvitations.length + pendingChatRequests.length + persistentNotifications.length;
  const hasNotifications = totalNotifications > 0;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const dropdownContent = isOpen && position ? (
    <div 
      ref={dropdownRef}
      className="fixed w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] animate-in slide-in-from-top"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!hasNotifications ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Chat Requests */}
                {pendingChatRequests.map((request) => {
                  const requesterName = request.requester_name || request.requester_email || "Someone";
                  return (
                    <div
                      key={`chat-request-${request.id}`}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm">
                                Chat Request
                              </h4>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {requesterName} wants to chat with you
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setIsOpen(false);
                              }}
                              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                            >
                              <X className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                          {request.requester_company && (
                            <p className="text-xs text-gray-600 mb-2">
                              {request.requester_company}
                            </p>
                          )}
                          {request.meeting_title && (
                            <p className="text-xs text-blue-600 mb-2">
                              📅 Also invited you to: {request.meeting_title}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                onNavigateToContacts?.();
                              }}
                              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                              <MessageSquare className="w-4 h-4" />
                              View Request
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Persistent Notifications (Group Invites, etc.) */}
                {persistentNotifications.map((notif) => {
                  const data = notif.data || {};
                  return (
                    <div
                      key={`persistent-${notif.id}`}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm">
                                {notif.type === 'GROUP_ADDED' ? 'Group Invitation' : 'Notification'}
                              </h4>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {notif.message}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                onDismissNotification?.(notif.id);
                              }}
                              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                            >
                              <X className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                          {data.chatName && (
                            <p className="text-xs text-gray-600 mb-2">
                              Group: {data.chatName}
                            </p>
                          )}
                          <button
                            onClick={() => {
                              onDismissNotification?.(notif.id);
                              setIsOpen(false);
                            }}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            View Group
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Upcoming Meetings */}
                {upcomingMeetings.map((meeting) => {
                  const startTime = new Date(meeting.start_time);
                  const timeUntilStart = Math.round(
                    (startTime.getTime() - Date.now()) / (1000 * 60)
                  );
                  const duration = Math.round(
                    (new Date(meeting.end_time).getTime() -
                      startTime.getTime()) /
                      (1000 * 60)
                  );

                  return (
                    <div
                      key={`upcoming-${meeting.id}`}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm">
                                {meeting.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Starts in {timeUntilStart} minutes
                              </p>
                            </div>
                            <button
                              onClick={() => dismissUpcoming(meeting.id)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                            >
                              <X className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                          {meeting.description && (
                            <p className="text-xs text-gray-600 mb-2">
                              {meeting.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                            <span>{formatDate(startTime)}</span>
                            <span>{formatTime(startTime)}</span>
                            <span>{duration} min</span>
                          </div>
                          {meeting.participants && (
                            <div className="text-xs text-gray-500 mb-3">
                              <span className="font-medium">Participants: </span>
                              {meeting.participants.join(", ")}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              sounds.callInitiated();
                              onJoinMeeting?.(meeting.room_id);
                              setIsOpen(false);
                            }}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                          >
                            <Video className="w-4 h-4" />
                            Join Now
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Meeting Invitations */}
                {meetingInvitations.map((invitation) => {
                  const startTime = new Date(invitation.start_time);
                  const duration = Math.round(
                    (new Date(invitation.end_time).getTime() -
                      startTime.getTime()) /
                      (1000 * 60)
                  );

                  return (
                    <div
                      key={`invitation-${invitation.id}`}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm">
                                Invited: {invitation.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Invited by {invitation.inviter}
                              </p>
                            </div>
                            <button
                              onClick={() => dismissInvitation(invitation.id)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                            >
                              <X className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                          {invitation.description && (
                            <p className="text-xs text-gray-600 mb-2">
                              {invitation.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                            <span>{formatDate(startTime)}</span>
                            <span>{formatTime(startTime)}</span>
                            <span>{duration} min</span>
                          </div>
                          {invitation.participants && (
                            <div className="text-xs text-gray-500 mb-3">
                              <span className="font-medium">Participants: </span>
                              {invitation.participants.join(", ")}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                declineInvitation(invitation.id);
                              }}
                              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Decline
                            </button>
                            <button
                              onClick={() => {
                                acceptInvitation(invitation.id);
                                setIsOpen(false);
                              }}
                              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              Accept
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null;

  return (
    <>
      <div className="relative">
        {/* Bell Icon Button */}
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {hasNotifications && (
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          )}
          {hasNotifications && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {totalNotifications > 9 ? "9+" : totalNotifications}
            </span>
          )}
        </button>
      </div>
      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
}

