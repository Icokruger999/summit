import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Phone, Video, Clock, Check, CheckCheck, X, Circle } from "lucide-react";
import { messagesApi, chatsApi, presenceApi } from "../../lib/api";
import { formatTime } from "../../lib/timeFormat";
import { useMessageWebSocket } from "../../hooks/useMessageWebSocket";
import { messageCache } from "../../lib/cache";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date | string;
  type: "text" | "file";
  status?: "sending" | "sent" | "received" | "read" | "failed";
}

interface MessageThreadSimpleProps {
  chatId: string;
  userId: string;
  chat?: {
    id: string;
    name: string;
    type: "direct" | "group";
    dbId?: string; // Database UUID (for API calls)
    other_user_id?: string;
    other_user_name?: string;
  };
  onStartCall: (roomName: string, callType?: "audio" | "video") => void;
  onMessageSent?: (chatId: string, message: string, timestamp: Date) => void;
}

export default function MessageThreadSimple({
  chatId,
  userId,
  chat,
  onStartCall,
  onMessageSent,
}: MessageThreadSimpleProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [dbChatId, setDbChatId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastTypingSentRef = useRef<number>(0);
  const isSendingMessageRef = useRef<boolean>(false);
  const lastEnterPressRef = useRef<number>(0);
  const [otherUserPresence, setOtherUserPresence] = useState<"online" | "offline" | "away" | "busy" | "dnd">("online");
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  // Handle real-time message notifications
  const handleNewMessage = useCallback(async (notification: any) => {
    console.log("📨 Real-time notification received:", notification);
    
    // Skip if this is our own message - we already have it optimistically
    if (notification.senderId === userId) {
      console.log("⏭️ Skipping own message notification (already have it)");
      return;
    }
    
    // Only process if it's for the current chat
    if (notification.chatId === dbChatId && dbChatId) {
      console.log("✅ Message is for current chat, adding immediately...");
      
      // Add message immediately from notification (no DB reload needed)
      const newMessage: Message = {
        id: notification.messageId,
        senderId: notification.senderId,
        senderName: notification.senderName || "Unknown",
        content: notification.content,
        timestamp: notification.timestamp ? new Date(notification.timestamp) : new Date(),
        type: (notification.type || "text") as "text" | "file",
        status: undefined, // Messages from others don't have status
      };
      
      // Add message immediately to UI
      setMessages((prev) => {
        // Check if message already exists
        const exists = prev.find(m => m.id === notification.messageId);
        if (exists) {
          console.log("⚠️ Message already exists, skipping duplicate");
          return prev;
        }
        
        const updated = [...prev, newMessage];
        // Update cache immediately
        messageCache.addMessage(chatId, newMessage, dbChatId);
        return updated;
      });
      
      // Mark message as read immediately since chat is currently viewed
      try {
        await messagesApi.markAsRead([notification.messageId], notification.chatId);
        console.log("✅ Marked new message as read");
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    } else {
      // If it's for a different chat, just reload the chat list
      window.dispatchEvent(new CustomEvent('messageUpdate', {
        detail: {
          chatId: notification.chatId,
          lastMessage: notification.content,
          timestamp: new Date(notification.timestamp),
        }
      }));
    }
  }, [dbChatId, userId, chatId]);

  // Listen for new message notifications from Dashboard's WebSocket
  useEffect(() => {
    const handleNewMessageNotification = (event: CustomEvent<any>) => {
      handleNewMessage(event.detail);
    };

    // Listen for messages being read (update status from "sent"/"received" to "read")
    const handleMessagesRead = async (event: CustomEvent<{ messageIds: string[], chatId: string, readBy: string }>) => {
      if (event.detail.chatId === dbChatId && dbChatId) {
        console.log("✅ Messages read notification received:", event.detail);
        
        // Immediately update message statuses to "read" (optimistic update)
        setMessages((prev) => {
          const updated = prev.map((msg) => {
            if (msg.senderId === userId && event.detail.messageIds.includes(msg.id)) {
              console.log(`📖 Updating message ${msg.id} status to "read"`);
              return { ...msg, status: "read" as const };
            }
            return msg;
          });
          // Update cache
          messageCache.set(chatId, updated, dbChatId);
          return updated;
        });
        
        // Immediately verify read receipts to ensure accuracy (optimistic update already done)
        // Verify asynchronously without blocking or delay
        if (event.detail.messageIds.length > 0) {
          messagesApi.getReadReceipts(event.detail.messageIds)
            .then((readReceipts) => {
              if (Object.keys(readReceipts).length > 0) {
                console.log(`✅ Verified read receipts for ${Object.keys(readReceipts).length} messages`);
                
                // Update any messages that now have read receipts but weren't already updated
                setMessages((prev) => {
                  const updated = prev.map((msg) => {
                    if (msg.senderId === userId && readReceipts[msg.id] && readReceipts[msg.id].length > 0 && msg.status !== "read") {
                      console.log(`📖 Confirmed message ${msg.id} is read via receipt verification`);
                      return { ...msg, status: "read" as const };
                    }
                    return msg;
                  });
                  messageCache.set(chatId, updated, dbChatId);
                  return updated;
                });
              }
            })
            .catch((error) => {
              console.error("Error verifying read receipts:", error);
            });
        }
      }
    };

    // Handle typing indicator notifications
    const handleTypingIndicator = (event: CustomEvent<{ chatId: string, userId: string, userName: string, isTyping: boolean }>) => {
      if (event.detail.chatId === dbChatId && dbChatId && event.detail.userId !== userId) {
        console.log("📝 Typing indicator received:", event.detail);
        
        if (event.detail.isTyping) {
          // User started typing
          setTypingUsers((prev) => ({
            ...prev,
            [event.detail.userId]: event.detail.userName,
          }));

          // Clear typing indicator after 3 seconds of inactivity
          if (typingTimeoutRef.current[event.detail.userId]) {
            clearTimeout(typingTimeoutRef.current[event.detail.userId]);
          }
          typingTimeoutRef.current[event.detail.userId] = setTimeout(() => {
            setTypingUsers((prev) => {
              const updated = { ...prev };
              delete updated[event.detail.userId];
              return updated;
            });
            delete typingTimeoutRef.current[event.detail.userId];
          }, 3000);
        } else {
          // User stopped typing
          setTypingUsers((prev) => {
            const updated = { ...prev };
            delete updated[event.detail.userId];
            return updated;
          });
          if (typingTimeoutRef.current[event.detail.userId]) {
            clearTimeout(typingTimeoutRef.current[event.detail.userId]);
            delete typingTimeoutRef.current[event.detail.userId];
          }
        }
      }
    };

    window.addEventListener('newMessageNotification' as any, handleNewMessageNotification as EventListener);
    window.addEventListener('messagesRead' as any, handleMessagesRead as EventListener);
    window.addEventListener('typingIndicator' as any, handleTypingIndicator as EventListener);
    return () => {
      window.removeEventListener('newMessageNotification' as any, handleNewMessageNotification as EventListener);
      window.removeEventListener('messagesRead' as any, handleMessagesRead as EventListener);
      window.removeEventListener('typingIndicator' as any, handleTypingIndicator as EventListener);
      // Clear all typing timeouts on cleanup
      Object.values(typingTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, [dbChatId, userId, chatId, handleNewMessage]);

  // Periodically poll for read receipts to ensure statuses stay up-to-date
  // This is a fallback in case WebSocket notifications are delayed (only for messages older than 5 seconds)
  useEffect(() => {
    if (!dbChatId || messages.length === 0) return;
    
    // Only poll if we have messages from the current user that might have read receipts
    const ownMessages = messages.filter(msg => msg.senderId === userId);
    if (ownMessages.length === 0) return;
    
    // Only poll messages that are not already marked as "read" and are older than 5 seconds
    // (new messages won't have read receipts yet anyway)
    const now = Date.now();
    const unreadOwnMessages = ownMessages.filter(msg => {
      if (msg.status === "read" || msg.status === "failed" || msg.status === "sending") return false;
      const messageTimestamp = msg.timestamp instanceof Date 
        ? msg.timestamp.getTime() 
        : new Date(msg.timestamp).getTime();
      const messageAge = now - messageTimestamp;
      return messageAge > 5000; // Only poll messages older than 5 seconds
    });
    
    if (unreadOwnMessages.length === 0) return;
    
    const pollReadReceipts = async () => {
      try {
        const messageIds = unreadOwnMessages.map(msg => msg.id);
        const readReceipts = await messagesApi.getReadReceipts(messageIds);
        
        // Check if any messages now have read receipts
        const hasNewReads = messageIds.some(id => readReceipts[id] && readReceipts[id].length > 0);
        
        if (hasNewReads) {
          console.log(`✅ Found updated read receipts via polling`);
          // Update message statuses
          setMessages((prev) => {
            const updated = prev.map((msg) => {
              if (msg.senderId === userId && readReceipts[msg.id] && readReceipts[msg.id].length > 0 && msg.status !== "read") {
                console.log(`📖 Updating message ${msg.id} status to "read" via polling`);
                return { ...msg, status: "read" as const };
              }
              return msg;
            });
            messageCache.set(chatId, updated, dbChatId);
            return updated;
          });
        }
      } catch (error) {
        console.error("Error polling read receipts:", error);
      }
    };
    
    // Poll every 500ms if there are unread messages (fallback for missed WebSocket notifications)
    // This is a lightweight fallback - WebSocket notifications should handle most updates in real-time
    const interval = setInterval(pollReadReceipts, 500); // Fast fallback polling for reliability
    
    // Poll immediately once
    pollReadReceipts();
    
    return () => {
      clearInterval(interval);
    };
  }, [dbChatId, messages, userId, chatId]);

  // Debug: Log when messages change
  useEffect(() => {
    console.log(`📊 Messages state updated for chat ${chatId}: ${messages.length} messages`);
    if (messages.length > 0) {
      console.log(`📊 Sample message:`, messages[0]);
    }
  }, [messages, chatId]);

  // Fetch other user's presence status for direct chats
  useEffect(() => {
    if (!chat || chat.type !== "direct") {
      setOtherUserPresence("online");
      return;
    }

    // Get other user ID from chat prop or extract from chatId
    let otherUserIdToFetch = chat.other_user_id || null;
    
    if (!otherUserIdToFetch && chatId.startsWith("direct-")) {
      const withoutPrefix = chatId.replace("direct-", "");
      const uuid1Match = withoutPrefix.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (uuid1Match) {
        const uuid1 = uuid1Match[1];
        const remaining = withoutPrefix.substring(uuid1.length + 1);
        const uuid2Match = remaining.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (uuid2Match) {
          const uuid2 = uuid2Match[1];
          otherUserIdToFetch = uuid1 === userId ? uuid2 : uuid1;
        }
      }
    }

    if (otherUserIdToFetch) {
      setOtherUserId(otherUserIdToFetch);
      
      // Fetch presence immediately
      presenceApi.get(otherUserIdToFetch)
        .then((presenceData: any) => {
          setOtherUserPresence(presenceData?.status || "online");
        })
        .catch((error) => {
          console.error("Error fetching presence:", error);
          setOtherUserPresence("online"); // Default to online
        });

      // Poll presence every 30 seconds
      const interval = setInterval(() => {
        presenceApi.get(otherUserIdToFetch!)
          .then((presenceData: any) => {
            setOtherUserPresence(presenceData?.status || "online");
          })
          .catch((error) => {
            console.error("Error fetching presence:", error);
          });
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [chatId, chat, userId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Load messages with caching for instant display
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setDbChatId(null);
      return;
    }

    let isCancelled = false;

    const loadMessages = async () => {
      // STEP 0: If chat.dbId is available, set it immediately (enables input field right away!)
      if (chat?.dbId && !isCancelled) {
        console.log(`⚡ Using dbId from chat prop: ${chat.dbId}`);
        setDbChatId(chat.dbId);
        // Link chatId to dbId in cache
        messageCache.linkChatId(chatId, chat.dbId);
      }

      // STEP 1: Load from cache IMMEDIATELY using frontend chatId (no API call needed)
      const cachedMessages = messageCache.get(chatId, chat?.dbId);
      let dbCachedMessages: any[] | null = null;
      
      if (cachedMessages && cachedMessages.length > 0) {
        console.log(`✅ Loaded ${cachedMessages.length} messages from cache instantly for chat ${chatId}`);
        const formattedCached = cachedMessages.map((msg: any) => ({
          id: msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName || "Unknown",
          content: msg.content,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
          type: (msg.type || "text") as "text" | "file",
          status: msg.senderId === userId ? (msg.status as "sent" || "sent") : undefined,
        }));
        setMessages(formattedCached);
      } else {
        // No cached messages - clear previous chat's messages, but don't show empty state yet
        // We'll fetch from server first to see if messages exist
        setMessages([]);
      }

      try {
        // STEP 2: Get database chat ID (only if not already set from chat prop)
        let currentDbChatId = chat?.dbId || null;
        
        if (!currentDbChatId && chatId.startsWith("direct-")) {
          const withoutPrefix = chatId.replace("direct-", "");
          const uuid1Match = withoutPrefix.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
          if (uuid1Match) {
            const uuid1 = uuid1Match[1];
            const remaining = withoutPrefix.substring(uuid1.length + 1);
            const uuid2Match = remaining.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
            if (uuid2Match) {
              const uuid2 = uuid2Match[1];
              const otherUserId = uuid1 === userId ? uuid2 : uuid1;
              
              const chatData = await chatsApi.getOrCreateDirectChat(otherUserId);
              if (!isCancelled) {
                currentDbChatId = chatData.id;
                setDbChatId(currentDbChatId);
                
                // Link frontend chatId to database ID in cache
                messageCache.linkChatId(chatId, currentDbChatId);
              }
            }
          }
        }
        
        // If we have a dbChatId (from prop or API), continue with message loading
        if (currentDbChatId && !isCancelled) {
          // Check cache again with database ID (might have different data)
          dbCachedMessages = messageCache.get(chatId, currentDbChatId);
          if (dbCachedMessages && dbCachedMessages.length > 0) {
            // Update if we don't have cached messages yet, or if db cache has more messages
            const hasNoCachedMessages = !cachedMessages || cachedMessages.length === 0;
            const dbCacheHasMore = cachedMessages && dbCachedMessages.length > cachedMessages.length;
            
            if (hasNoCachedMessages || dbCacheHasMore) {
              console.log(`✅ Updated with ${dbCachedMessages.length} messages from database ID cache`);
              const formattedDbCached = dbCachedMessages.map((msg: any) => ({
                id: msg.id,
                senderId: msg.senderId,
                senderName: msg.senderName || "Unknown",
                content: msg.content,
                timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
                type: (msg.type || "text") as "text" | "file",
                status: msg.senderId === userId ? (msg.status as "sent" || "sent") : undefined,
              }));
              if (!isCancelled) {
                setMessages(formattedDbCached);
              }
            }
          }
          
          // STEP 3: Always fetch fresh messages from server (ensures we have latest data)
          if (!isCancelled) {
            try {
              console.log(`📥 Fetching messages for chat ${currentDbChatId}...`);
              const history = await messagesApi.getMessages(currentDbChatId, 100);
              console.log(`📥 Messages API response:`, Array.isArray(history) ? `${history.length} messages` : history);
              
              if (!isCancelled && Array.isArray(history)) {
                console.log(`📨 Processing ${history.length} messages from server...`);
                console.log(`📨 First message sample:`, history[0]);
                
                // Filter and format messages
                const formattedMessages: Message[] = history
                  .filter((msg: any) => {
                    const isValid = msg && msg.id && msg.content;
                    if (!isValid) {
                      console.warn("⚠️ Filtered out invalid message:", msg);
                    }
                    return isValid;
                  })
                  .map((msg: any) => {
                    const formatted = {
                      id: msg.id,
                      senderId: msg.sender_id || msg.senderId,
                      senderName: msg.sender_name || msg.senderName || msg.sender_email || "Unknown",
                      content: msg.content || "",
                      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
                      type: (msg.type || "text") as "text" | "file",
                      status: (msg.senderId === userId ? "sent" : undefined) as "sending" | "sent" | "received" | "read" | "failed" | undefined, // Set status for own messages
                    };
                    return formatted;
                  });
                
                console.log(`✅ Formatted ${formattedMessages.length} valid messages for display`);
                if (formattedMessages.length > 0) {
                  console.log(`📨 Sample formatted message:`, formattedMessages[0]);
                }
                
                // FIRST: Fetch read receipts for messages sent by current user (before marking new ones as read)
                const ownMessageIds = formattedMessages
                  .filter(msg => msg.senderId === userId)
                  .map(msg => msg.id);
                
                let existingReadReceipts: Record<string, any[]> = {};
                if (ownMessageIds.length > 0 && !isCancelled) {
                  try {
                    const receipts = await messagesApi.getReadReceipts(ownMessageIds);
                    // Ensure receipts is a Record<string, any[]>
                    existingReadReceipts = receipts && typeof receipts === "object" && !Array.isArray(receipts) 
                      ? receipts as Record<string, any[]> 
                      : {};
                    console.log(`✅ Fetched existing read receipts for ${Object.keys(existingReadReceipts).length} messages`);
                  } catch (error) {
                    console.error("Error fetching existing read receipts:", error);
                    existingReadReceipts = {};
                  }
                }
                
                // Mark messages from other users as read (when chat is viewed)
                const messagesFromOthers = formattedMessages
                  .filter(msg => msg.senderId !== userId)
                  .map(msg => msg.id);
                
                if (messagesFromOthers.length > 0 && !isCancelled) {
                  try {
                    // Mark messages as read - don't await, fire and continue
                    messagesApi.markAsRead(messagesFromOthers, currentDbChatId)
                      .then(() => {
                        console.log(`✅ Marked ${messagesFromOthers.length} messages as read`);
                        
                        // Immediately re-fetch read receipts for own messages (WebSocket notification will handle most updates)
                        // Fetch asynchronously without blocking
                        if (ownMessageIds.length > 0 && !isCancelled) {
                          messagesApi.getReadReceipts(ownMessageIds)
                            .then((updatedReadReceipts) => {
                              if (!isCancelled && Object.keys(updatedReadReceipts).length > 0) {
                                console.log(`✅ Re-fetched read receipts after marking as read: ${Object.keys(updatedReadReceipts).length} messages now have receipts`);
                                
                                // Update message statuses immediately if read receipts exist
                                setMessages((prev) => {
                                  const updated = prev.map((msg) => {
                                    if (msg.senderId === userId && updatedReadReceipts[msg.id] && updatedReadReceipts[msg.id].length > 0 && msg.status !== "read") {
                                      console.log(`📖 Updating message ${msg.id} status to "read" after re-fetch`);
                                      return { ...msg, status: "read" as const };
                                    }
                                    return msg;
                                  });
                                  messageCache.set(chatId, updated, dbChatId);
                                  return updated;
                                });
                                
                                // Merge with existing receipts (new ones take precedence)
                                Object.assign(existingReadReceipts, updatedReadReceipts);
                              }
                            })
                            .catch((error) => {
                              console.error("Error re-fetching read receipts:", error);
                            });
                        }
                      })
                      .catch((error) => {
                        console.error("Error marking messages as read:", error);
                      });
                  } catch (error) {
                    console.error("Error in markAsRead call:", error);
                  }
                }
                
                // Update message statuses based on read receipts and message age
                const now = Date.now();
                formattedMessages.forEach(msg => {
                  if (msg.senderId === userId) {
                    const messageTimestamp = msg.timestamp instanceof Date 
                      ? msg.timestamp.getTime() 
                      : new Date(msg.timestamp).getTime();
                    const messageAge = now - messageTimestamp;
                    
                    if (existingReadReceipts[msg.id] && existingReadReceipts[msg.id].length > 0) {
                      // If read receipts exist, message is read
                      msg.status = "read";
                    } else if (messageAge > 5000) {
                      // If message is older than 5 seconds but no read receipt, it's likely "received" but not read yet
                      msg.status = "received";
                    } else {
                      // Recent message with no read receipt: still "sent"
                      msg.status = "sent";
                    }
                  }
                });
                console.log(`✅ Updated message statuses based on read receipts and age`);
                
                // Update cache with fresh data (store under both keys)
                messageCache.set(chatId, formattedMessages, currentDbChatId);
                
                // Always update UI with fresh data (this ensures messages show even if cache was empty)
                // Only update if we got a valid response (even if empty array - that means no messages)
                if (!isCancelled) {
                  setMessages(formattedMessages);
                  console.log(`✅ Updated UI with ${formattedMessages.length} messages (chatId: ${chatId}, dbChatId: ${currentDbChatId})`);
                } else {
                  console.warn("⚠️ Component was cancelled, not updating messages");
                }
              } else if (!isCancelled) {
                // History is not an array - could be error response or null
                console.warn("⚠️ Messages API returned unexpected response:", history);
                // If we already have cached messages, keep them
                // Otherwise, ensure empty state is shown (it should already be set)
                if ((!cachedMessages || cachedMessages.length === 0) && (!dbCachedMessages || dbCachedMessages.length === 0)) {
                  setMessages([]); // No cache, no valid server data - show empty state
                }
              }
            } catch (fetchError: any) {
              console.error("❌ Error fetching messages from server:", fetchError);
              console.error("Error details:", fetchError.response?.status, fetchError.message);
              
              // If we have cached messages, keep them displayed
              // Otherwise, only show empty state if we truly have no messages
              if ((!cachedMessages || cachedMessages.length === 0) && (!dbCachedMessages || dbCachedMessages.length === 0)) {
                // No cache at all, show empty state
                if (!isCancelled) {
                  setMessages([]);
                }
              }
              // If we had cached messages, they're already displayed, don't clear them
            }
          }
        }
      } catch (error: any) {
        console.error("❌ Error in loadMessages:", error);
        console.error("Error details:", error.response?.status, error.message);
        // On error, keep the cached messages if we have them
        if (!isCancelled) {
          // If we already had cached messages, they're already displayed
          // If not, try one more time with dbChatId if available
          if (!cachedMessages || cachedMessages.length === 0) {
            // Try to get from cache using database ID if we have it
            if (dbChatId || chat?.dbId) {
              const fallbackCached = messageCache.get(chatId, dbChatId || chat?.dbId);
              if (fallbackCached && fallbackCached.length > 0) {
                console.log(`✅ Using fallback cache with ${fallbackCached.length} messages`);
                const formattedCached = fallbackCached.map((msg: any) => ({
                  ...msg,
                  timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
                  status: msg.senderId === userId ? (msg.status || "sent") : undefined,
                }));
                setMessages(formattedCached);
                return; // Successfully loaded from fallback cache
              }
            }
            // If still no messages, keep empty array (empty state will show)
            setMessages([]);
          }
        }
      }
    };

    // Initial load
    loadMessages();

    return () => {
      isCancelled = true;
    };
  }, [chatId, userId, chat?.dbId]);

  const handleSendMessage = async (messageContentOverride?: string) => {
    // Use override content if provided (from handleKeyDown), otherwise use state
    const messageContent = (messageContentOverride || newMessage.trim());
    
    if (!messageContent || !dbChatId || sending) return;

    // Prevent multiple simultaneous sends
    setSending(true);

    // Typing indicator is already stopped in handleKeyDown, but ensure it's stopped here too
    stopTypingIndicator().catch(console.error);

    const messageId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const message: Message = {
      id: messageId,
      senderId: userId,
      senderName: "You",
      content: messageContent,
      timestamp: new Date(),
      type: "text",
      status: "sending", // Start with sending status
    };

    // Add message optimistically with "sending" status
    setMessages((prev) => {
      const updated = [...prev, message];
      // Update cache immediately (store under both chatId and dbChatId)
      messageCache.addMessage(chatId, message, dbChatId || undefined);
      return updated;
    });
    
    // Clear input field immediately for instant feedback
    setNewMessage("");

    try {
      // Save to database
      await messagesApi.saveMessage({
        id: messageId,
        chatId: dbChatId,
        content: messageContent,
        type: "text",
      });
      
      // Update status to "sent" after successful save
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === messageId ? { ...m, status: "sent" as const } : m
        );
        // Update cache with sent status (both keys)
        messageCache.updateMessageStatus(chatId, messageId, "sent", dbChatId || undefined);
        return updated;
      });
      
      // Call onMessageSent callback if provided
      if (onMessageSent) {
        onMessageSent(chatId, messageContent, new Date());
      }
      
      // Update chat list to show "You: xxx" immediately
      window.dispatchEvent(new CustomEvent('messageUpdate', {
        detail: {
          chatId: dbChatId,
          lastMessage: messageContent,
          timestamp: new Date(),
          senderId: userId, // Include sender ID so chat list shows "You: xxx"
        }
      }));
      
      // Message will appear for receiver via WebSocket notification
    } catch (error) {
      console.error("Error sending message:", error);
      // Update status to "failed"
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === messageId ? { ...m, status: "failed" as const } : m
        );
        // Update cache with failed status (both keys)
        messageCache.updateMessageStatus(chatId, messageId, "failed", dbChatId || undefined);
        return updated;
      });
      // Optionally remove failed message after a delay, or let user retry
      setTimeout(() => {
        setMessages((prev) => {
          const filtered = prev.filter(m => m.id !== messageId);
          // Update cache - remove failed message (both keys)
          messageCache.set(chatId, filtered, dbChatId || undefined);
          return filtered;
        });
      }, 5000);
    } finally {
      setSending(false);
    }
  };

  // Stop typing indicator helper
  const stopTypingIndicator = useCallback(async () => {
    if (!dbChatId) return;
    
    // Clear any pending typing timeouts
    if (typingTimeoutRef.current['typing']) {
      clearTimeout(typingTimeoutRef.current['typing']);
      delete typingTimeoutRef.current['typing'];
    }
    if (typingTimeoutRef.current['sendTyping']) {
      clearTimeout(typingTimeoutRef.current['sendTyping']);
      delete typingTimeoutRef.current['sendTyping'];
    }
    
    // Reset the last sent time so next typing session starts fresh
    lastTypingSentRef.current = 0;
    
    try {
      await messagesApi.sendTypingIndicator(dbChatId, false);
    } catch (error) {
      console.error("Error stopping typing indicator:", error);
    }
  }, [dbChatId]);

  // Send typing indicator when user types (debounced like WhatsApp/Teams)
  const handleInputChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setNewMessage(newValue);
    
    // Don't send typing indicator if we're about to send a message or if input is empty
    if (isSendingMessageRef.current || !dbChatId || !newValue.trim()) {
      // Clear typing timeout if input is empty
      if (!newValue.trim() && typingTimeoutRef.current['typing']) {
        clearTimeout(typingTimeoutRef.current['typing']);
        delete typingTimeoutRef.current['typing'];
        // Stop typing indicator immediately if input becomes empty
        await stopTypingIndicator();
      }
      return;
    }
    
    // Clear any existing "stop typing" timeout since user is still typing
    if (typingTimeoutRef.current['typing']) {
      clearTimeout(typingTimeoutRef.current['typing']);
      delete typingTimeoutRef.current['typing'];
    }
    
    // Send typing indicator after 1 second of typing (WhatsApp/Teams approach)
    // Only send if we haven't sent one recently (within last 2 seconds)
    const now = Date.now();
    const timeSinceLastSent = lastTypingSentRef.current === 0 ? Infinity : (now - lastTypingSentRef.current);
    
    // If this is the first keystroke or it's been more than 2 seconds since last indicator
    if (lastTypingSentRef.current === 0 || timeSinceLastSent > 2000) {
      // Clear any existing sendTyping timeout first
      if (typingTimeoutRef.current['sendTyping']) {
        clearTimeout(typingTimeoutRef.current['sendTyping']);
        delete typingTimeoutRef.current['sendTyping'];
      }
      
      // Debounce: Wait 1 second after first keystroke before sending (like WhatsApp/Teams)
      // This prevents sending indicator for very short typing (like backspacing)
      const sendTypingTimeout = setTimeout(async () => {
        // Only send if still valid conditions (chat exists, not sending message)
        if (dbChatId && !isSendingMessageRef.current) {
          try {
            // Send typing indicator (fire and forget)
            messagesApi.sendTypingIndicator(dbChatId, true).catch(console.error);
            lastTypingSentRef.current = Date.now();
          } catch (error) {
            console.error("Error sending typing indicator:", error);
          }
        }
      }, 1000); // 1 second delay after first keystroke (standard WhatsApp/Teams behavior)
      
      // Store this timeout so we can clear it if user stops typing before 1 second
      typingTimeoutRef.current['sendTyping'] = sendTypingTimeout;
    }
    
    // Stop typing indicator after 3 seconds of inactivity (standard UX timeout)
    // This will clear the indicator if user pauses typing
    typingTimeoutRef.current['typing'] = setTimeout(async () => {
      if (dbChatId && !isSendingMessageRef.current) {
        await stopTypingIndicator();
        // Reset the last sent time when we stop typing
        lastTypingSentRef.current = 0;
      }
    }, 3000); // 3 seconds of inactivity before stopping (like WhatsApp/Teams)
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      
      // Don't send if message is empty, chat is not ready, or already sending
      if (!newMessage.trim() || !dbChatId || sending) return;
      
      // Get message content BEFORE clearing input
      const messageContent = newMessage.trim();
      
      // Clear input field IMMEDIATELY for instant feedback (before async operations)
      setNewMessage("");
      
      // Mark that we're sending a message (prevents typing indicator from being sent)
      isSendingMessageRef.current = true;
      
      // Stop typing indicator immediately before sending message (fire and forget)
      stopTypingIndicator().catch(console.error);
      
      // Call handleSendMessage with the message content (pass content since input is already cleared)
      // Don't await to avoid blocking, but handle errors
      handleSendMessage(messageContent)
        .catch((error) => {
          console.error("Error in handleSendMessage:", error);
          // Restore message to input if send failed (for retry)
          setNewMessage(messageContent);
        })
        .finally(() => {
          // Reset flag after message send completes
          isSendingMessageRef.current = false;
        });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-sky-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* Profile picture placeholder */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-sky-500 flex items-center justify-center text-white font-semibold">
                {(chat?.name || chat?.other_user_name || "C").substring(0, 2).toUpperCase()}
              </div>
              {/* Online status indicator */}
              {chat?.type === "direct" && (
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  otherUserPresence === "online" ? "bg-green-500" :
                  otherUserPresence === "away" ? "bg-yellow-500" :
                  otherUserPresence === "busy" || otherUserPresence === "dnd" ? "bg-red-500" :
                  "bg-gray-400"
                }`}></div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{chat?.name || chat?.other_user_name || "Chat"}</h3>
              {chat?.type === "direct" && (
                <p className="text-xs text-gray-500">
                  {otherUserPresence === "online" ? "Online" :
                   otherUserPresence === "away" ? "Away" :
                   otherUserPresence === "busy" ? "Busy" :
                   otherUserPresence === "dnd" ? "Do not disturb" :
                   "Offline"}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onStartCall(`chat-${chatId}`, "audio")}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => onStartCall(`chat-${chatId}`, "video")}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
        {!messages || messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[200px]">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-sky-100 rounded-2xl flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-lg font-medium text-gray-600">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          <>
            {messages
              .filter((message) => message && message.id && message.content) // Filter out invalid messages
              .map((message) => {
                const isOwnMessage = message.senderId === userId;
                // Get initials for profile picture
                const getInitials = (name: string, isOwn: boolean) => {
                  if (isOwn) return "You";
                  const parts = name.split(" ");
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[1][0]).toUpperCase();
                  }
                  return name.substring(0, 2).toUpperCase();
                };
                
                return (
                  <div
                    key={message.id}
                    className="flex justify-start mb-4"
                  >
                    {/* Profile picture */}
                    <div className="flex-shrink-0 mr-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                        isOwnMessage 
                          ? "bg-gradient-to-br from-blue-400 to-sky-500 text-[9px]" 
                          : "bg-gradient-to-br from-orange-400 to-amber-500 text-xs"
                      }`}>
                        {getInitials(message.senderName, isOwnMessage)}
                      </div>
                    </div>
                    <div className="flex flex-col items-start flex-1 max-w-md">
                      {/* Sender name and timestamp */}
                      <div className="flex items-center gap-2 mb-1 px-2">
                        <span className="text-xs font-medium text-gray-700">
                          {isOwnMessage ? "You" : message.senderName}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      {/* Message bubble */}
                      <div className={`relative px-4 py-3 rounded-lg shadow-sm ${
                        isOwnMessage
                          ? "bg-blue-100 text-gray-900"
                          : "bg-white text-gray-900 border border-gray-200"
                      }`}>
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                          {message.content}
                        </p>
                        {isOwnMessage && message.status && (
                          <div className="flex items-center gap-1 text-xs mt-1 text-gray-500">
                            {message.status === "sending" && (
                              <Clock className="w-3 h-3 inline animate-pulse" />
                            )}
                            {message.status === "sent" && (
                              <Check className="w-3 h-3 inline" />
                            )}
                            {message.status === "received" && (
                              <CheckCheck className="w-3 h-3 inline" />
                            )}
                            {message.status === "read" && (
                              <CheckCheck className="w-3 h-3 inline text-blue-500" />
                            )}
                            {message.status === "failed" && (
                              <X className="w-3 h-3 inline text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          <div ref={messagesEndRef} />
          {/* Typing Indicator */}
          {Object.keys(typingUsers).length > 0 && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm">
                    {Object.values(typingUsers).join(", ")} {Object.keys(typingUsers).length === 1 ? "is" : "are"} typing...
                  </span>
                </div>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={sending || !dbChatId}
              className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all max-h-32"
              rows={1}
            />
          </div>
          <button
            onClick={() => {
              const content = newMessage.trim();
              if (content && !sending && dbChatId) {
                setNewMessage(""); // Clear input immediately
                handleSendMessage(content).catch((error) => {
                  console.error("Error sending message:", error);
                  setNewMessage(content); // Restore on error
                });
              }
            }}
            disabled={!newMessage.trim() || sending || !dbChatId}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-sky-600 text-white rounded-2xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

