import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ChatList from "./Chat/ChatList";
import MessageThreadSimple from "./Chat/MessageThreadSimple";
import MeetingCalendar from "./Meetings/MeetingCalendar";
import CallRoom from "./Call/CallRoom";
import PreCallSettings from "./Call/PreCallSettings";
import NotificationCenter from "./Notifications/NotificationCenter";
import Contacts from "./Chat/Contacts";
import ChatRequests from "./Chat/ChatRequests";
import { MessageSquare, Calendar, User, Video, Settings, ChevronDown, Circle, PhoneOff, Phone, Users, UserPlus } from "lucide-react";
import iconImage from "../assets/icon.png";
import { useUpdatePresence, usePresence } from "../hooks/usePresence";
import { useAutoAway } from "../hooks/useAutoAway";
import { sounds } from "../lib/sounds";
import NotificationToast from "./NotificationToast";
import { useChatRequests } from "../hooks/useChatRequests";
import { useContacts } from "../hooks/useContacts";
import { useBackgroundChatConnections } from "../hooks/useBackgroundChatConnections";
import { usePreload } from "../hooks/usePreload";
import { useMessageWebSocket } from "../hooks/useMessageWebSocket";
import SubscriptionLockScreen from "./Subscription/SubscriptionLockScreen";
import TrialBanner from "./Subscription/TrialBanner";
import SubscriptionModal from "./Subscription/SubscriptionModal";
import { showMessageNotification, showCallNotification } from "../lib/notifications";

interface DashboardProps {
  user: any;
}

export default function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<"chat" | "meetings" | "contacts">("chat");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [inCall, setInCall] = useState(false);
  const [callRoom, setCallRoom] = useState<string | null>(null);
  const [callType, setCallType] = useState<"audio" | "video">("video");
  const [isCalling, setIsCalling] = useState(false);
  const [callingUser, setCallingUser] = useState<string | null>(null);
  const [showPreCallSettings, setShowPreCallSettings] = useState(false);
  const [pendingCallRoom, setPendingCallRoom] = useState<string | null>(null);
  const [pendingCallType, setPendingCallType] = useState<"audio" | "video">("video");
  const [callSettings, setCallSettings] = useState<{ audioEnabled: boolean; videoEnabled: boolean } | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" | "warning" | "error" } | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [otherUserName, setOtherUserName] = useState<string | null>(null); // Track who we're calling
  
  // Track user presence
  const { updateStatus } = useUpdatePresence();
  const { presence, refetch: refetchPresence } = usePresence(user?.id || null);
  
  // Auto-away: Set status to "away" after 5 minutes of inactivity
  const { isAway } = useAutoAway({
    enabled: !!user?.id && !inCall, // Don't auto-away during calls
    awayTimeout: 5 * 60 * 1000, // 5 minutes
    currentStatus: presence?.status || "online", // Pass current status so it skips busy/dnd
    onStatusChange: (status) => {
      console.log(`🔄 Auto-away status changed to: ${status}`);
      refetchPresence();
    },
  });
  
  // Handle new chat request notifications
  const handleNewChatRequest = (request: any) => {
    const requesterName = request.requester_name || request.requester_email || "Someone";
    const message = `${requesterName} sent you a chat request`;
    
    // Show toast notification
    setNotification({
      message,
      type: "info",
    });
    
    // Play notification sound
    const notificationsEnabled = localStorage.getItem("notificationsEnabled") !== "false";
    if (notificationsEnabled) {
      try {
        sounds.notification();
      } catch (e) {
        // Silently handle sound errors
      }
    }
    
    // Show desktop notification if app is not focused
    if (document.hidden) {
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      
      if (isTauri) {
        import("@tauri-apps/plugin-notification").then(({ sendNotification }) => {
          return sendNotification({
            title: "New Chat Request",
            body: message,
          });
        }).catch(() => {});
      } else if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New Chat Request", {
          body: message,
          icon: new URL("../assets/icon.png", import.meta.url).href,
        });
      }
    }
  };
  
  // Always listen for chat requests at Dashboard level (regardless of active view)
  const {
    receivedRequests: pendingChatRequests,
  } = useChatRequests({
    userId: user?.id || "",
    enabled: !!user?.id,
    onNewRequest: handleNewChatRequest,
  });

  // Preload all data in the background (silently, no blocking)
  usePreload({ userId: user?.id || null, enabled: !!user?.id });

  // Preload contacts in the background so they're ready when user navigates to contacts
  // This makes the contacts view appear instantly
  useContacts({
    userId: user?.id || "",
    enabled: !!user?.id,
    pollInterval: 30000, // Poll every 30 seconds (less frequent since it's background)
  });

  // Maintain background connections to all chats for receiving messages
  // Note: This will skip the currently selected chat to avoid duplicate connections
  // TEMPORARILY DISABLED for testing
  useBackgroundChatConnections({
    userId: user?.id || "",
    chats: chats,
    enabled: false, // DISABLED - testing if this causes message issues
    selectedChatId: selectedChat, // Pass selected chat to prevent duplicate connections
    onNewMessage: (messageChatId, message, senderId) => {
      // Only process if message is not from current user and chat is not currently selected
      if (senderId === user?.id || selectedChat === messageChatId) {
        return;
      }

      // Find the chat
      const chat = chats.find((c) => c.id === messageChatId || c.dbId === messageChatId);
      if (!chat) return;

      // Update chat's last message and increment unread count
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === messageChatId || c.dbId === messageChatId) {
            const currentUnread = c.unreadCount || 0;
            return {
              ...c,
              last_message: message.content,
              last_message_at: new Date().toISOString(),
              unreadCount: currentUnread + 1,
              hasUnread: true,
            };
          }
          return c;
        })
      );

      // Show notification
      const senderName = chat.name || "Someone";
      sounds.messageReceived();
      
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(senderName, {
          body: message.content,
          icon: new URL("../assets/icon.png", import.meta.url).href,
        });
      }

      // Dispatch message update event
      window.dispatchEvent(new CustomEvent('messageUpdate', {
        detail: { chatId: messageChatId, lastMessage: message.content, timestamp: new Date() }
      }));
    },
  });
  
  // Get current status (default to online if not set)
  const currentStatus = presence?.status || "online";

  // Listen for incoming call notifications
  useEffect(() => {
    const handleIncomingCall = (event: CustomEvent<any>) => {
      const { callerId, callerName, callType, roomName } = event.detail;
      
      console.log('📞 Incoming call from:', callerName, 'Type:', callType, 'Room:', roomName);
      
      // Play ringtone
      import("../lib/sounds").then(({ startCallRinging }) => {
        startCallRinging();
      });
      
      // Show desktop notification for incoming call
      const notification = showCallNotification(callerName || "Someone", callType || "video");
      
      // Set up call state
      setCallingUser(callerName || "Someone");
      setOtherUserName(callerName || "Someone"); // Store for call screen
      setCallType(callType || "video");
      setPendingCallRoom(roomName); // Store the room name for accepting
      setIsCalling(true);
      
      // Auto-dismiss notification after 30 seconds
      setTimeout(() => {
        if (notification) notification.close();
        // Stop ringtone if call not answered
        import("../lib/sounds").then(({ stopCallRinging }) => {
          stopCallRinging();
        });
        setIsCalling(false);
        setCallingUser(null);
        setPendingCallRoom(null);
        setOtherUserName(null);
      }, 30000);
    };

    window.addEventListener('incomingCall' as any, handleIncomingCall as EventListener);
    return () => {
      window.removeEventListener('incomingCall' as any, handleIncomingCall as EventListener);
    };
  }, []);

  // Listen for call ended notifications
  useEffect(() => {
    const handleCallEnded = (event: CustomEvent<any>) => {
      const { roomName } = event.detail;
      
      console.log('📞 Call ended by other participant:', roomName);
      
      // If we're in this call, end it
      if (inCall && callRoom === roomName) {
        setInCall(false);
        setCallRoom(null);
        setIsCalling(false);
        setCallingUser(null);
        setOtherUserName(null);
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
        }
        callStartTimeRef.current = null;
      }
    };

    window.addEventListener('callEnded' as any, handleCallEnded as EventListener);
    return () => {
      window.removeEventListener('callEnded' as any, handleCallEnded as EventListener);
    };
  }, [inCall, callRoom]);

  // Listen for group added notifications
  useEffect(() => {
    const handleGroupAdded = (event: CustomEvent<any>) => {
      const { chatId, chatName, creatorName } = event.detail;
      
      console.log('👥 Added to group:', chatName);
      
      // Show notification
      setNotification({
        message: `${creatorName} added you to "${chatName}"`,
        type: "info",
      });
      
      // Reload chats to show the new group
      window.location.reload();
    };

    window.addEventListener('groupAdded' as any, handleGroupAdded as EventListener);
    return () => {
      window.removeEventListener('groupAdded' as any, handleGroupAdded as EventListener);
    };
  }, []);

  // Fetch persistent notifications on mount (for offline notifications)
  useEffect(() => {
    const fetchPersistentNotifications = async () => {
      if (!user?.id) return;
      
      try {
        const { notificationsApi } = await import("../lib/api");
        const notifications = await notificationsApi.getUnread();
        
        console.log(`📬 Fetched ${notifications.length} unread notifications`);
        
        // Show each notification
        for (const notif of notifications) {
          if (notif.type === 'GROUP_ADDED') {
            const data = notif.data || {};
            setNotification({
              message: notif.message,
              type: "info",
            });
            
            // Mark as read
            await notificationsApi.markAsRead(notif.id);
            
            // Small delay between notifications
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Reload chats if there were any group notifications
        if (notifications.some(n => n.type === 'GROUP_ADDED')) {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } catch (error) {
        console.error("Error fetching persistent notifications:", error);
      }
    };
    
    fetchPersistentNotifications();
  }, [user?.id]);

  // Handle chat request accepted notification
  const handleChatRequestAccepted = (data: any) => {
    const requesteeName = data.requesteeName || "Someone";
    const message = `${requesteeName} accepted your chat request`;
    
    setNotification({
      message,
      type: "success",
    });
    
    // Play notification sound
    const notificationsEnabled = localStorage.getItem("notificationsEnabled") !== "false";
    if (notificationsEnabled) {
      try {
        sounds.notification();
      } catch (e) {
        // Silently handle sound errors
      }
    }
    
    // Show desktop notification if app is not focused
    if (document.hidden) {
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      
      if (isTauri) {
        import("@tauri-apps/plugin-notification").then(({ sendNotification }) => {
          return sendNotification({
            title: "Chat Request Accepted",
            body: message,
          });
        }).catch(() => {});
      } else if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Chat Request Accepted", {
          body: message,
          icon: new URL("../assets/icon.png", import.meta.url).href,
        });
      }
    }
    
    // Refresh chat requests to update the UI
    window.dispatchEvent(new CustomEvent('refreshChatRequests'));
  };
  
  // Handle chat request declined notification
  const handleChatRequestDeclined = (data: any) => {
    const requesteeName = data.requesteeName || "Someone";
    const message = `${requesteeName} declined your chat request`;
    
    setNotification({
      message,
      type: "info",
    });
    
    // Play notification sound (softer for declined)
    const notificationsEnabled = localStorage.getItem("notificationsEnabled") !== "false";
    if (notificationsEnabled) {
      try {
        sounds.notification();
      } catch (e) {
        // Silently handle sound errors
      }
    }
    
    // Refresh chat requests to update the UI
    window.dispatchEvent(new CustomEvent('refreshChatRequests'));
  };

  // Global WebSocket connection for real-time message notifications
  useMessageWebSocket({
    userId: user?.id || null,
    onNewMessage: (notification: any) => {
      console.log("📨 Global WebSocket received message:", notification);
      
      // Update chat list immediately
      const chat = chats.find((c) => c.id === notification.chatId || c.dbId === notification.chatId);
      if (chat) {
        // Update existing chat
        setChats((prev) =>
          prev.map((c) => {
            if (c.id === notification.chatId || c.dbId === notification.chatId) {
              return {
                ...c,
                last_message: notification.content,
                last_message_at: new Date(notification.timestamp).toISOString(),
                last_message_sender_id: notification.senderId,
                unreadCount: (c.unreadCount || 0) + (c.id === selectedChat ? 0 : 1),
                hasUnread: c.id !== selectedChat,
              };
            }
            return c;
          })
        );
      } else {
        // Chat not in list, trigger reload to get it
        console.log("🔄 Chat not in list, reloading chats...");
        window.dispatchEvent(new CustomEvent('reloadChats'));
        
        // Also dispatch messageUpdate for other listeners
        window.dispatchEvent(new CustomEvent('messageUpdate', {
          detail: {
            chatId: notification.chatId,
            lastMessage: notification.content,
            timestamp: new Date(notification.timestamp),
            senderId: notification.senderId,
          }
        }));
      }

      // Dispatch the notification directly to MessageThreadSimple (it will handle adding the message immediately)
      // No need to reload all messages - MessageThreadSimple will add it directly from the notification
      window.dispatchEvent(new CustomEvent('newMessageNotification', {
        detail: notification
      }));

      // If message is from someone else and not in current chat, show notification
      if (notification.senderId !== user?.id) {
        const messageChat = chats.find((c) => c.id === notification.chatId || c.dbId === notification.chatId);
        if (messageChat && selectedChat !== messageChat.id) {
          sounds.messageReceived();
          
          // Show desktop notification
          showMessageNotification(
            messageChat.name || "Someone",
            notification.content,
            notification.chatId
          );
        }
      }
    },
    enabled: !!user?.id,
  });
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };
    
    if (showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusDropdown]);

  const handleSignOut = async () => {
    try {
      // Clear auth data
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      localStorage.removeItem("requires_password_change");
      
      // Force navigation to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out:", error);
      // Still navigate to login even if there's an error
      window.location.href = "/login";
    }
  };

  // Set status to busy when in a call/meeting
  useEffect(() => {
    if (inCall && callRoom) {
      // Only auto-set to busy if not manually set to dnd
      if (currentStatus !== "dnd") {
        updateStatus("busy");
        localStorage.setItem("status_manually_set", "false");
      }
    } else if (!inCall && currentStatus === "busy") {
      // Return to online when call ends (unless user manually set busy or dnd)
      const wasManuallySet = localStorage.getItem("status_manually_set") === "true";
      if (!wasManuallySet) {
        updateStatus("online");
      }
    }
  }, [inCall, callRoom, currentStatus, updateStatus]);

  if (isCalling && callingUser) {
    // Get user info for the calling screen
    const userName = callingUser || "User";
    const userAvatar = user?.avatar_url;

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-sky-50 relative overflow-hidden">
        {/* Morphing Blobs Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Blob 1 - Blue */}
          <div 
            className="absolute w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl"
            style={{
              top: '-10%',
              left: '-5%',
              animation: 'morphBlob1 20s ease-in-out infinite',
            }}
          ></div>
          
          {/* Blob 2 - Sky */}
          <div 
            className="absolute w-[450px] h-[450px] bg-sky-400/20 rounded-full blur-3xl"
            style={{
              bottom: '-10%',
              right: '-5%',
              animation: 'morphBlob2 25s ease-in-out infinite',
            }}
          ></div>
          
          {/* Blob 3 - Light Blue */}
          <div 
            className="absolute w-[400px] h-[400px] bg-blue-300/15 rounded-full blur-3xl"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'morphBlob3 18s ease-in-out infinite',
            }}
          ></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg px-8">
          {/* User Avatar */}
          <div className="mb-8 relative">
            <div className="w-36 h-36 rounded-full mx-auto relative shadow-2xl bg-white p-1">
              {userAvatar ? (
                <img 
                  src={userAvatar} 
                  alt={userName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* User Name */}
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{userName}</h1>
          
          {/* Calling Status */}
          <div className="mb-12">
            <p className="text-gray-600 text-lg font-medium shimmer-text">
              {pendingCallRoom ? "Incoming call" : "calling"}
            </p>
          </div>

          {/* Call Controls */}
          <div className="flex items-center gap-6">
            {/* For incoming calls (pendingCallRoom exists) - show Accept/Decline */}
            {pendingCallRoom ? (
              <>
                {/* Decline Button */}
                <button
                  onClick={() => {
                    // Stop ringtone
                    import("../lib/sounds").then(({ stopCallRinging }) => {
                      stopCallRinging();
                    });
                    
                    // Cancel call
                    if (callTimeoutRef.current) {
                      clearTimeout(callTimeoutRef.current);
                    }
                    setIsCalling(false);
                    setCallingUser(null);
                    setPendingCallRoom(null);
                  }}
                  className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                  title="Decline"
                >
                  <PhoneOff className="w-8 h-8 text-white" />
                </button>
                
                {/* Accept Button */}
                <button
                  onClick={() => {
                    // Stop ringtone
                    import("../lib/sounds").then(({ stopCallRinging }) => {
                      stopCallRinging();
                    });
                    
                    // Accept call - go to pre-call settings
                    if (pendingCallRoom) {
                      setIsCalling(false);
                      setShowPreCallSettings(true);
                    }
                  }}
                  className="w-20 h-20 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                  title="Accept"
                >
                  <Phone className="w-8 h-8 text-white" />
                </button>
              </>
            ) : (
              <>
                {/* For outgoing calls - show Cancel and Join */}
                {/* Cancel Button */}
                <button
                  onClick={() => {
                    if (callTimeoutRef.current) {
                      clearTimeout(callTimeoutRef.current);
                    }
                    setIsCalling(false);
                    setCallingUser(null);
                    setPendingCallRoom(null);
                  }}
                  className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                  title="Cancel"
                >
                  <PhoneOff className="w-8 h-8 text-white" />
                </button>
                
                {/* Join Button - for caller to join when ready */}
                <button
                  onClick={() => {
                    if (callTimeoutRef.current) {
                      clearTimeout(callTimeoutRef.current);
                    }
                    setIsCalling(false);
                    setShowPreCallSettings(true);
                  }}
                  className="w-20 h-20 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                  title="Join now"
                >
                  <Phone className="w-8 h-8 text-white" />
                </button>
              </>
            )}
          </div>
          
          {/* Call Type Badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-200/50 mt-6">
            {callType === "video" ? (
              <>
                <Video className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  {pendingCallRoom ? "Incoming Video Call" : "Video Call"}
                </span>
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  {pendingCallRoom ? "Incoming Audio Call" : "Audio Call"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* CSS Animations for Morphing Blobs */}
        <style>{`
          @keyframes morphBlob1 {
            0%, 100% {
              border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
              transform: translate(0, 0) scale(1);
            }
            25% {
              border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
              transform: translate(80px, -50px) scale(1.15);
            }
            50% {
              border-radius: 50% 50% 30% 60% / 40% 50% 60% 50%;
              transform: translate(-40px, 60px) scale(0.9);
            }
            75% {
              border-radius: 40% 60% 50% 50% / 60% 40% 50% 60%;
              transform: translate(50px, 30px) scale(1.05);
            }
          }
          
          @keyframes morphBlob2 {
            0%, 100% {
              border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%;
              transform: translate(0, 0) scale(1);
            }
            33% {
              border-radius: 60% 40% 60% 40% / 40% 60% 40% 60%;
              transform: translate(-60px, 70px) scale(1.2);
            }
            66% {
              border-radius: 40% 60% 40% 60% / 60% 40% 60% 40%;
              transform: translate(80px, -50px) scale(0.85);
            }
          }
          
          @keyframes morphBlob3 {
            0%, 100% {
              border-radius: 70% 30% 50% 50% / 30% 70% 50% 50%;
              transform: translate(-50%, -50%) scale(1);
            }
            50% {
              border-radius: 30% 70% 50% 50% / 70% 30% 50% 50%;
              transform: translate(-50%, -50%) scale(1.3);
            }
          }
          
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
          
          .shimmer-text {
            background: linear-gradient(
              90deg,
              #6b7280 0%,
              #9ca3af 25%,
              #d1d5db 50%,
              #9ca3af 75%,
              #6b7280 100%
            );
            background-size: 200% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // Show pre-call settings before joining
  if (showPreCallSettings && pendingCallRoom) {
    return (
      <PreCallSettings
        roomName={pendingCallRoom}
        callType={pendingCallType}
        userName={user?.name}
        onJoin={(settings) => {
          setCallSettings(settings);
          setShowPreCallSettings(false);
          setCallRoom(pendingCallRoom);
          setCallType(pendingCallType);
          setInCall(true);
          setPendingCallRoom(null);
          // Set status to busy when joining
          updateStatus("busy");
          localStorage.setItem("status_manually_set", "false");
        }}
        onCancel={() => {
          setShowPreCallSettings(false);
          setPendingCallRoom(null);
        }}
      />
    );
  }

  if (inCall && callRoom) {
    return (
      <CallRoom
        roomName={callRoom}
        callType={callType}
        initialSettings={callSettings}
        otherUserName={otherUserName || undefined}
        onLeave={() => {
          const callDuration = callStartTimeRef.current ? Math.round((Date.now() - callStartTimeRef.current) / 1000 / 60) : 0;
          setInCall(false);
          setCallRoom(null);
          setIsCalling(false);
          setCallingUser(null);
          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
          }
          
          // Add call ended notification to chat if call was answered and had duration
          if (callDuration > 0 && selectedChat) {
            const callEndedEvent = new CustomEvent('callNotification', {
              detail: {
                chatId: selectedChat,
                type: 'ended',
                duration: callDuration,
                callType: callType,
              }
            });
            window.dispatchEvent(callEndedEvent);
          }
          
          callStartTimeRef.current = null;
          // Status will be updated by the useEffect above
        }}
        onConnected={() => {
          // Call was answered - start tracking call duration
          setIsCalling(false);
          setCallingUser(null);
          setInCall(true);
          if (callStartTimeRef.current === null) {
            callStartTimeRef.current = Date.now();
          }
          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
          }
        }}
      />
    );
  }

  return (
    <>
      {/* Subscription disabled for now
      <SubscriptionLockScreen userId={user?.id || ""} />
      */}
      
      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          duration={5000}
          onClose={() => setNotification(null)}
        />
      )}
      
      {/* Subscription Modal - disabled for now
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSubscriptionSelected={() => {
          window.location.reload();
        }}
      />
      */}
      
      <div className="h-screen flex flex-col bg-white">
      
      {/* Trial Banner - disabled for now
      <TrialBanner 
        userId={user?.id || ""} 
        onSelectPlan={() => setShowSubscriptionModal(true)}
      />
      */}
      
      {/* Header */}
      <header className="glass-frosty shadow-sm border-b border-white/50">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <img src={iconImage} alt="Summit Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
                  Summit
                </h1>
                <p className="text-xs text-gray-500">by Coding Everest</p>
              </div>
            </div>
          <div className="flex items-center gap-4">
            {/* Status Dropdown */}
            <div className="relative" ref={statusDropdownRef}>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Circle 
                  className={`w-3 h-3 ${
                    currentStatus === "online" ? "text-green-500 fill-green-500" :
                    currentStatus === "away" ? "text-amber-500 fill-amber-500" :
                    currentStatus === "busy" ? "text-yellow-500 fill-yellow-500" :
                    currentStatus === "dnd" ? "text-red-500 fill-red-500" :
                    "text-gray-400 fill-gray-400"
                  }`}
                />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {currentStatus === "dnd" ? "Do Not Disturb" : currentStatus}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {showStatusDropdown && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  {[
                    { status: "online", label: "Online", color: "text-green-500 fill-green-500" },
                    { status: "away", label: "Away", color: "text-amber-500 fill-amber-500" },
                    { status: "busy", label: "Busy", color: "text-yellow-500 fill-yellow-500" },
                    { status: "dnd", label: "Do Not Disturb", color: "text-red-500 fill-red-500" },
                    { status: "offline", label: "Offline", color: "text-gray-400 fill-gray-400" },
                  ].map(({ status, label, color }) => (
                    <button
                      key={status}
                      onClick={async () => {
                        await updateStatus(status);
                        localStorage.setItem("status_manually_set", "true");
                        setShowStatusDropdown(false);
                        refetchPresence();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      <Circle className={`w-3 h-3 ${color}`} />
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      {currentStatus === status && (
                        <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* User Email */}
            <div className="px-3 py-1.5 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">{user?.email}</span>
            </div>
            <button
              onClick={() => navigate("/settings")}
              className="p-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="px-6 border-t border-white/30 bg-white/40 backdrop-blur-xl">
          <div className="flex items-center">
            {/* Notification Bell - Far Left */}
            <NotificationCenter
              userId={user.id}
              pendingChatRequests={pendingChatRequests}
              onNavigateToContacts={() => {
                setActiveView("contacts");
              }}
              onJoinMeeting={(roomName) => {
                setPendingCallRoom(roomName);
                setPendingCallType("video");
                setShowPreCallSettings(true);
              }}
            />
            <nav className="flex space-x-1 ml-4">
              <button
                onClick={() => setActiveView("chat")}
                className={`relative px-6 py-3 font-medium text-sm transition-all duration-200 ${
                  activeView === "chat"
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Chats</span>
                </div>
                {activeView === "chat" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-sky-500 rounded-t-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveView("meetings")}
                className={`relative px-6 py-3 font-medium text-sm transition-all duration-200 ${
                  activeView === "meetings"
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Meetings</span>
                </div>
                {activeView === "meetings" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-sky-500 rounded-t-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveView("contacts")}
                className={`relative px-6 py-3 font-medium text-sm transition-all duration-200 ${
                  activeView === "contacts"
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Contacts</span>
                </div>
                {activeView === "contacts" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-sky-500 rounded-t-full"></div>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === "chat" ? (
          <div className="flex-1 flex overflow-hidden transition-all duration-200">
            <ChatList
              userId={user.id}
              onSelectChat={setSelectedChat}
              selectedChat={selectedChat}
              onUnreadCleared={(chatId) => {
                // Unread count cleared - no action needed, ChatList handles it
              }}
              onChatsUpdate={(updatedChats) => {
                setChats(updatedChats);
              }}
            />
            <div className="flex-1 bg-white transition-all duration-200">
              {selectedChat ? (
                <MessageThreadSimple
                  chatId={selectedChat}
                  userId={user.id}
                  chat={chats.find(c => c.id === selectedChat)}
                  onStartCall={async (roomName, type = "video") => {
                    // Get the other user's ID from the chat
                    const chat = chats.find(c => c.id === selectedChat);
                    if (!chat) return;

                    // Extract recipient ID and name from chat
                    let recipientId: string | null = null;
                    let recipientName: string | null = null;
                    
                    if (chat.type === "direct") {
                      // Try multiple ways to get the other user's ID
                      recipientId = chat.other_user_id || 
                                   (chat.userIds && chat.userIds[0]) || 
                                   null;
                      recipientName = chat.other_user_name || chat.name || "User";
                    } else {
                      recipientName = chat.name || "User";
                    }
                    
                    // Store the other user's name for the call screen
                    setOtherUserName(recipientName);

                    // Send call notification to recipient
                    if (recipientId) {
                      try {
                        const token = localStorage.getItem("auth_token");
                        const response = await fetch(`${import.meta.env.VITE_SERVER_URL || "https://summit.api.codingeverest.com"}/api/chime/notify`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            recipientId,
                            roomName,
                            callType: type,
                          }),
                        });
                        
                        if (response.ok) {
                          console.log("✅ Call notification sent successfully to:", recipientId);
                        } else {
                          const errorText = await response.text();
                          console.error("❌ Failed to send call notification:", response.status, errorText);
                          alert(`Failed to notify ${recipientName}. They may not receive the call notification.`);
                        }
                      } catch (error) {
                        console.error("❌ Network error sending call notification:", error);
                        alert(`Network error: Could not notify ${recipientName}. Check your connection.`);
                      }
                    } else {
                      console.warn("⚠️ Could not find recipient ID for call notification");
                      alert("Could not identify the recipient. Call notification not sent.");
                    }

                    // Caller joins immediately (no pre-call settings)
                    setCallRoom(roomName);
                    setCallType(type);
                    setInCall(true);
                    updateStatus("busy");
                    localStorage.setItem("status_manually_set", "false");
                  }}
                  onMessageSent={(chatId, message, timestamp) => {
                    // Message sent - ChatList will update via custom event
                  }}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-sky-100 rounded-2xl flex items-center justify-center mb-4">
                    <MessageSquare className="w-10 h-10 text-blue-500" />
                  </div>
                  <p className="text-lg font-medium text-gray-600">Select a chat to start messaging</p>
                  <p className="text-sm text-gray-400 mt-1">Or create a new conversation</p>
                </div>
              )}
            </div>
          </div>
        ) : activeView === "contacts" ? (
          <div className="flex-1 flex overflow-hidden bg-white">
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <ChatRequests
                  currentUserId={user.id}
                  onNewRequest={handleNewChatRequest}
                  onRequestAccepted={() => {
                    // Reload chats to show the new conversation
                    window.dispatchEvent(new CustomEvent('reloadChats'));
                  }}
                />
            </div>
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">All Contacts</h2>
                <p className="text-sm text-gray-500 mt-1">Your connections</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <Contacts
                  currentUserId={user.id}
                  onNewRequest={handleNewChatRequest}
                  onStartChat={async (userId, contactName) => {
                    // Create/get database chat record
                    try {
                      const { chatsApi } = await import("../lib/api");
                      console.log(`💬 Starting chat with user: ${userId}`);
                      const chat = await chatsApi.getOrCreateDirectChat(userId);
                      console.log(`✅ Chat created/found: ${chat.id}`);
                      
                      // Convert to frontend format
                      const userIdsSorted = [user.id, userId].sort();
                      const chatId = `direct-${userIdsSorted[0]}-${userIdsSorted[1]}`;
                      
                      // Create the chat object
                      const newChat: any = {
                        id: chatId,
                        dbId: chat.id,
                        name: chat.name || contactName || "Chat",
                        type: "direct" as const,
                        userIds: [userId],
                        last_message: chat.last_message || null,
                        last_message_at: chat.last_message_at || null,
                        last_message_sender_id: chat.last_message_sender_id || null,
                      };
                      
                      // Add chat to state (check if it exists first to avoid duplicates)
                      setChats((prev) => {
                        const exists = prev.find(c => c.id === chatId || c.dbId === chat.id);
                        if (exists) {
                          return prev; // Already exists, don't add again
                        }
                        return [...prev, newChat];
                      });
                      
                      // First, select the chat (before switching view for smoother transition)
                      setSelectedChat(chatId);
                      
                      // Switch to chat view - this will trigger the transition
                      setActiveView("chat");
                      
                      // Notify ChatList to reload after a brief delay to ensure view has switched
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('chatCreated', { 
                          detail: { chatId: chat.id, frontendChatId: chatId } 
                        }));
                      }, 100);
                    } catch (error) {
                      console.error("❌ Error creating chat:", error);
                      // Fallback to local chat if database creation fails
                      const userIdsSorted = [user.id, userId].sort();
                      const chatId = `direct-${userIdsSorted[0]}-${userIdsSorted[1]}`;
                      
                      const newChat: any = {
                        id: chatId,
                        name: contactName || "Chat",
                        type: "direct" as const,
                        userIds: [userId],
                      };
                      
                      setChats((prev) => {
                        const exists = prev.find(c => c.id === chatId);
                        if (exists) {
                          return prev;
                        }
                        return [...prev, newChat];
                      });
                      
                      // Select the chat first, then switch view
                      setSelectedChat(chatId);
                      setActiveView("chat");
                    }
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-white">
            <MeetingCalendar
              userId={user.id}
              onJoinMeeting={(roomName) => {
                setCallRoom(roomName);
                setCallType("video");
                setInCall(true);
                // Set status to busy when joining a meeting
                updateStatus("busy");
                localStorage.setItem("status_manually_set", "false");
              }}
            />
          </div>
        )}
      </div>
    </div>
    </>
  );
}
