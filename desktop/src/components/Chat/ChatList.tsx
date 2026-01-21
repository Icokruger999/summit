import { useState, useEffect, useRef, useCallback } from "react";
import CreateChatModal from "./CreateChatModal";
import { MessageSquare, Plus, Users, User } from "lucide-react";
import { formatTime } from "../../lib/timeFormat";
import UserHoverPopup from "./UserHoverPopup";
import { SkeletonChatItem } from "../ui/Skeleton";
import { usePresence } from "../../hooks/usePresence";
import { presenceApi } from "../../lib/api";
import { chatCache } from "../../lib/cache";

interface Chat {
  id: string; // Frontend format (e.g., "direct-{userId1}-{userId2}")
  dbId?: string; // Database UUID (for API calls)
  name: string;
  type: "direct" | "group";
  last_message?: string;
  last_message_at?: string;
  last_message_sender_id?: string; // Who sent the last message
  userIds?: string[];
  unreadCount?: number;
  hasUnread?: boolean; // For bold styling
  other_user_id?: string; // For direct chats
  other_user_name?: string; // For direct chats
}

interface ChatListProps {
  userId: string;
  onSelectChat: (chatId: string) => void;
  selectedChat: string | null;
  onJoinMeeting?: (roomName: string) => void;
  onUnreadCleared?: (chatId: string) => void;
  onMessageUpdate?: (chatId: string, lastMessage: string, timestamp: Date) => void;
  onChatsUpdate?: (chats: Chat[]) => void;
}

export default function ChatList({
  userId,
  onSelectChat,
  selectedChat,
  onMessageUpdate,
  onChatsUpdate,
}: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hoveredUser, setHoveredUser] = useState<{ userId: string; position: { x: number; y: number } } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDoneRef = useRef(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, "online" | "offline" | "away" | "busy" | "dnd">>({});
  const chatItemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Define loadChats before it's used in useEffect hooks
  const loadChats = useCallback(async (showLoading = true, useCache = true) => {
    try {
      // Load from cache immediately if available (instant load)
      if (useCache) {
        const cachedChats = chatCache.get(userId);
        if (cachedChats && cachedChats.length > 0) {
          console.log(`✅ Loaded ${cachedChats.length} chats from cache`);
          setChats(cachedChats);
          setLoading(false); // Hide loading immediately with cached data
          onChatsUpdate?.(cachedChats);
        } else if (showLoading) {
          setLoading(true);
        }
      } else if (showLoading) {
        setLoading(true);
      }

      // Fetch fresh data from backend in the background
      const { chatsApi } = await import("../../lib/api");
      const chatsData = await chatsApi.getChats();
      
      // Convert to Chat format
      // For direct chats, we need to create the frontend chatId format: "direct-{userId1}-{userId2}"
      const formattedChats: Chat[] = (chatsData || []).map((chat: any) => {
        let frontendChatId = chat.id; // Default to database ID
        let chatName = chat.name || "Chat";
        let otherUserName: string | undefined = undefined;
        let otherUserId: string | undefined = undefined;
        
        // For direct chats, convert to frontend format for LiveKit compatibility
        // Backend returns other_user as an object with id, name, email, avatar_url
        const otherUser = chat.other_user;
        if (chat.type === "direct" && otherUser) {
          otherUserId = otherUser.id;
          const userIds = [userId, otherUserId].sort();
          frontendChatId = `direct-${userIds[0]}-${userIds[1]}`;
          // Use the other user's name as the chat name for direct chats
          chatName = otherUser.name || otherUser.email || "User";
          otherUserName = otherUser.name;
        }
        
        return {
          id: frontendChatId, // Use frontend format for selection
          dbId: chat.id, // Keep database ID for API calls
          name: chatName, // Use other user's name for direct chats
          type: chat.type,
          last_message: chat.last_message,
          last_message_at: chat.last_message_at,
          last_message_sender_id: chat.last_message_sender_id, // Who sent the last message
          userIds: chat.type === "direct" && otherUserId ? [otherUserId] : undefined,
          other_user_id: otherUserId,
          other_user_name: otherUserName,
        };
      });
      
      // Update cache with fresh data
      chatCache.set(userId, formattedChats);
      console.log(`✅ Fetched ${formattedChats.length} fresh chats from server`);
      
      // Update UI with fresh data (may be same as cache, but ensures we're up-to-date)
      setChats(formattedChats);
      onChatsUpdate?.(formattedChats);
      
      if (showLoading) {
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Error loading chats:", error);
      console.error("Error details:", error.response?.status, error.message);
      
      // On error, if we have cached data, keep it. Otherwise show empty list
      const cachedChats = chatCache.get(userId);
      if (!cachedChats || cachedChats.length === 0) {
        setChats([]);
        onChatsUpdate?.([]);
      }
      
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [userId, onChatsUpdate]);

  // Listen for message updates and chat creation
  useEffect(() => {
    const handleMessageUpdate = (event: CustomEvent<{ chatId: string; lastMessage: string; timestamp: Date; senderId?: string }>) => {
      const { chatId, lastMessage, timestamp, senderId } = event.detail;
      setChats((prevChats) => {
        const updated = prevChats.map((chat) => {
          // Match by frontend chatId format or database ID
          const matches = chat.id === chatId || chat.dbId === chatId;
          if (matches) {
            // If this chat is NOT currently selected AND the message is from someone else, increment unread count
            const isCurrentlySelected = selectedChat === chat.id || selectedChat === chat.dbId;
            const isFromOtherUser = senderId && senderId !== userId;
            
            let newUnreadCount = chat.unreadCount || 0;
            if (!isCurrentlySelected && isFromOtherUser) {
              newUnreadCount = newUnreadCount + 1;
              console.log(`📬 Incrementing unread count for chat ${chat.id}: ${newUnreadCount}`);
            }
            
            return {
              ...chat,
              last_message: lastMessage,
              last_message_at: timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString(),
              last_message_sender_id: senderId || chat.last_message_sender_id,
              unreadCount: newUnreadCount,
              hasUnread: newUnreadCount > 0,
            };
          }
          return chat;
        });
        
        // Update cache with the updated chat
        const updatedChat = updated.find((chat) => chat.id === chatId || chat.dbId === chatId);
        if (updatedChat) {
          chatCache.updateChat(userId, updatedChat);
        }
        
        return updated;
      });
    };

    const handleChatCreated = (event: CustomEvent<{ chatId: string; frontendChatId?: string }>) => {
      const { chatId, frontendChatId } = event.detail;
      
      // Always reload chats to get the latest data from server (including the new chat)
      // This ensures we have the complete chat data with all fields from the database
      loadChats(false, false); // Don't use cache, fetch fresh data including the new chat
      
      // Note: The chat should appear in the list after the reload completes
      // Dashboard will handle selecting it after the event is dispatched
    };

    window.addEventListener('messageUpdate' as any, handleMessageUpdate as EventListener);
    window.addEventListener('chatCreated' as any, handleChatCreated as EventListener);
    
    // Listen for reload request (e.g., when WebSocket receives message for new chat)
    const handleReloadChats = () => {
      console.log("🔄 Reloading chats due to reloadChats event");
      loadChats(false, false); // Reload without cache
    };
    window.addEventListener('reloadChats' as any, handleReloadChats as EventListener);

    return () => {
      window.removeEventListener('messageUpdate' as any, handleMessageUpdate as EventListener);
      window.removeEventListener('chatCreated' as any, handleChatCreated as EventListener);
      window.removeEventListener('reloadChats' as any, handleReloadChats as EventListener);
    };
  }, [loadChats, chats, selectedChat, userId]); // Add selectedChat and userId to check if message is for current chat

  useEffect(() => {
    // Only load once on mount or when userId changes
    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      loadChats(true); // Show loading on initial load
    }
    
    // No polling needed - WebSocket will notify us of new chats/messages
    // Only reload if userId changes
    return () => {
      // Reset initial load flag when userId changes
      if (userId) {
        initialLoadDoneRef.current = false;
      }
    };
  }, [userId]); // Remove loadChats from dependencies to prevent loop
  
  // Clear unread count and scroll into view when selected chat changes
  useEffect(() => {
    if (selectedChat) {
      // Clear unread count in state (set to undefined instead of 0)
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === selectedChat || chat.dbId === selectedChat
            ? { ...chat, unreadCount: undefined, hasUnread: false }
            : chat
        )
      );
      
      // Scroll the selected chat into view after a brief delay to ensure DOM is updated
      setTimeout(() => {
        const chatElement = chatItemRefs.current.get(selectedChat);
        if (chatElement) {
          chatElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [selectedChat]);

  // Fetch presence for all contacts in direct chats
  useEffect(() => {
    if (chats.length === 0) return;

    const fetchPresence = async () => {
      const directChats = chats.filter((chat) => chat.type === "direct" && chat.userIds && chat.userIds.length > 0);
      const userIdsToCheck = directChats.map((chat) => chat.userIds![0]).filter(Boolean);
      
      if (userIdsToCheck.length === 0) return;

      try {
        const presenceData = await presenceApi.getBatch(userIdsToCheck);
        const newPresenceMap: Record<string, "online" | "offline" | "away" | "busy" | "dnd"> = {};
        
        // Backend returns an object keyed by user_id, not an array
        if (presenceData && typeof presenceData === 'object') {
          Object.entries(presenceData).forEach(([oderId, data]: [string, any]) => {
            newPresenceMap[oderId] = data?.status || "offline";
          });
        }
        
        // Fill in missing users as offline
        userIdsToCheck.forEach(id => {
          if (!newPresenceMap[id]) {
            newPresenceMap[id] = "offline";
          }
        });
        
        setPresenceMap(newPresenceMap);
      } catch (error) {
        console.error("Error fetching presence:", error);
        // If presence API fails, default to offline (safer assumption)
        const newPresenceMap: Record<string, "online" | "offline" | "away" | "busy" | "dnd"> = {};
        userIdsToCheck.forEach(userId => {
          newPresenceMap[userId] = "offline";
        });
        setPresenceMap(newPresenceMap);
      }
    };

    fetchPresence();
    
    // Poll presence every 10 seconds
    const interval = setInterval(fetchPresence, 10000);
    return () => clearInterval(interval);
  }, [chats]);

  const handleCreateChat = async (name: string, type: "direct" | "group", userIds: string[]) => {
    if (type === "direct" && userIds.length === 1) {
      // For direct chats, create/get the database chat record
      try {
        const { chatsApi } = await import("../../lib/api");
        const otherUserId = userIds[0];
        console.log(`💬 Creating direct chat with user: ${otherUserId}`);
        const chat = await chatsApi.getOrCreateDirectChat(otherUserId);
        console.log(`✅ Chat created/found: ${chat.id}`);
        
        // Convert to frontend format
        const userIdsSorted = [userId, otherUserId].sort();
        const frontendChatId = `direct-${userIdsSorted[0]}-${userIdsSorted[1]}`;
        
        // Add to local state
        const newChat: Chat = {
          id: frontendChatId,
          dbId: chat.id,
          name: chat.name || name,
          type: "direct",
          userIds: [otherUserId],
        };
        setChats((prev) => {
          const updated = [...prev, newChat];
          // Update cache with new chat
          chatCache.addChat(userId, newChat);
          return updated;
        });
        onSelectChat(frontendChatId);
        
        // Notify that chat was created
        window.dispatchEvent(new CustomEvent('chatCreated', { detail: { chatId: chat.id } }));
      } catch (error) {
        console.error("❌ Error creating chat:", error);
        // Fallback to local chat if database creation fails
        const newChat: Chat = {
          id: `chat-${Date.now()}`,
          name,
          type,
        };
        setChats((prev) => [...prev, newChat]);
        onSelectChat(newChat.id);
      }
    } else if (type === "group" && userIds.length > 0) {
      // For group chats, create in database
      try {
        const { chatsApi } = await import("../../lib/api");
        console.log(`👥 Creating group chat "${name}" with ${userIds.length} members`);
        const chat = await chatsApi.createGroupChat(name, userIds);
        console.log(`✅ Group chat created: ${chat.id}`);
        
        // Add to local state with database ID
        const newChat: Chat = {
          id: chat.id, // Use database ID directly for group chats
          dbId: chat.id,
          name: chat.name,
          type: "group",
          userIds: userIds,
        };
        setChats((prev) => {
          const updated = [...prev, newChat];
          chatCache.addChat(userId, newChat);
          return updated;
        });
        onSelectChat(chat.id);
        
        // Notify that chat was created
        window.dispatchEvent(new CustomEvent('chatCreated', { detail: { chatId: chat.id } }));
      } catch (error) {
        console.error("❌ Error creating group chat:", error);
        // Silently fail - error is logged to console
      }
    }
  };

  if (loading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-sky-50">
          <div className="flex items-center justify-between mb-3">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
        {/* Skeleton Chat Items */}
        <div className="divide-y divide-gray-100">
          <SkeletonChatItem />
          <SkeletonChatItem />
          <SkeletonChatItem />
          <SkeletonChatItem />
          <SkeletonChatItem />
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-sky-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Conversations</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all hover:scale-105 border border-gray-200"
            title="New Chat"
          >
            <Plus className="w-5 h-5 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {/* Regular Chats */}
        {chats.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-sm text-gray-500 mb-2">No conversations yet</p>
            <p className="text-xs text-gray-400 mb-4">Start a new conversation to get started!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-lg hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>
        ) : (
          <div>
            {/* Separate group and direct chats */}
            {(() => {
              const groupChats = chats.filter((chat) => chat.type === "group");
              const directChats = chats.filter((chat) => chat.type === "direct");

              return (
                <>
                  {/* Group Chats Section */}
                  {groupChats.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Groups
                        </h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {groupChats.map((chat) => (
                          <button
                            key={chat.id}
                            ref={(el) => {
                              if (el) chatItemRefs.current.set(chat.id, el);
                              else chatItemRefs.current.delete(chat.id);
                            }}
                            onClick={() => onSelectChat(chat.id)}
                            className={`w-full px-4 py-4 text-left hover:bg-gray-50 transition-all ${
                              selectedChat === chat.id 
                                ? "bg-gradient-to-r from-blue-50 to-sky-50 border-l-4 border-blue-500" 
                                : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-sky-500">
                                <Users className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {chat.unreadCount && chat.unreadCount > 0 && (
                                      <span className="px-2 py-0.5 text-xs font-semibold text-white bg-green-600 rounded-full min-w-[20px] text-center">
                                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                                      </span>
                                    )}
                                    {chat.last_message_at && (
                                      <span className="text-xs text-gray-400">
                                        {formatTime(new Date(chat.last_message_at))}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {chat.last_message && (
                                  <p className={`text-sm truncate ${chat.unreadCount && chat.unreadCount > 0 ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                                    {chat.last_message_sender_id === userId ? (
                                      <span>You: {chat.last_message}</span>
                                    ) : (
                                      chat.last_message
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Direct Chats Section */}
                  {directChats.length > 0 && (
                    <div>
                      {groupChats.length > 0 && (
                        <div className="px-4 py-2 bg-gray-50 border-t border-b border-gray-200">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Direct Messages
                          </h3>
                        </div>
                      )}
                      <div className="divide-y divide-gray-100">
                        {directChats.map((chat) => {
                          const otherUserId = chat.userIds?.find((id: string) => id !== userId);
                          
                          return (
                          <div
                            key={chat.id}
                            className="relative"
                            onMouseEnter={(e) => {
                              if (otherUserId) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                hoverTimeoutRef.current = setTimeout(() => {
                                  setHoveredUser({
                                    userId: otherUserId,
                                    position: {
                                      x: rect.left + rect.width / 2,
                                      y: rect.top,
                                    },
                                  });
                                }, 500); // Show after 500ms hover
                              }
                            }}
                            onMouseLeave={() => {
                              if (hoverTimeoutRef.current) {
                                clearTimeout(hoverTimeoutRef.current);
                              }
                              setHoveredUser(null);
                            }}
                          >
                          <button
                            ref={(el) => {
                              if (el) chatItemRefs.current.set(chat.id, el);
                              else chatItemRefs.current.delete(chat.id);
                            }}
                            onClick={() => {
                              onSelectChat(chat.id);
                              // Unread count will be cleared by the useEffect hook above
                            }}
                            className={`w-full px-4 py-4 text-left hover:bg-gray-50 transition-all ${
                              selectedChat === chat.id 
                                ? "bg-gradient-to-r from-blue-50 to-sky-50 border-l-4 border-blue-500" 
                                : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-sky-500">
                                  <span className="text-sm font-semibold text-white">
                                    {chat.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                                  </span>
                                </div>
                                {/* Presence indicator */}
                                {chat.userIds && chat.userIds.length > 0 && (() => {
                                  const otherUserId = chat.userIds[0];
                                  const status = presenceMap[otherUserId] || "offline";
                                  const statusColors = {
                                    online: "bg-green-500",
                                    offline: "bg-gray-400",
                                    away: "bg-amber-500",
                                    busy: "bg-yellow-500",
                                    dnd: "bg-red-500",
                                  };
                                  return (
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${statusColors[status]} border-2 border-white rounded-full`}></div>
                                  );
                                })()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {chat.unreadCount && chat.unreadCount > 0 && (
                                      <span className="px-2 py-0.5 text-xs font-semibold text-white bg-green-600 rounded-full min-w-[20px] text-center">
                                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                                      </span>
                                    )}
                                    {chat.last_message_at && (
                                      <span className="text-xs text-gray-400">
                                        {formatTime(new Date(chat.last_message_at))}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {chat.last_message && (
                                  <p className={`text-sm truncate ${chat.unreadCount && chat.unreadCount > 0 ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                                    {chat.last_message_sender_id === userId ? (
                                      <span>You: {chat.last_message}</span>
                                    ) : (
                                      chat.last_message
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                          </div>
                        )})}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
      {showCreateModal && (
        <CreateChatModal
          onClose={() => setShowCreateModal(false)}
          onCreateChat={handleCreateChat}
          currentUserId={userId}
        />
      )}
      
      {/* User Hover Popup */}
      {hoveredUser && (() => {
        let userData: any = null;
        let userStatus: any = null;
        
        // Fetch user data from API
        // For now, try to get from localStorage
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            const userObj = JSON.parse(userStr);
            if (userObj.id === hoveredUser.userId) {
              userData = userObj;
            }
          } catch (e) {
            console.error("Error parsing user data:", e);
          }
        }
        // TODO: Fetch status from presence API in real mode
        
        if (!userData) {
          return null;
        }
        
        return (
          <UserHoverPopup
            user={{
              id: userData.id,
              name: userData.name || "Unknown",
              email: userData.email || "",
              job_title: userData.job_title || localStorage.getItem(`jobTitle_${userData.id}`) || undefined,
              phone: userData.phone || localStorage.getItem(`phone_${userData.id}`) || undefined,
              avatar_url: userData.avatar_url,
              status: (userStatus?.status as "online" | "offline" | "away" | "busy" | "dnd") || "offline",
            }}
            position={hoveredUser.position}
          />
        );
      })()}
    </div>
  );
}
