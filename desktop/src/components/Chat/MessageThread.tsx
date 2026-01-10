import { useState, useEffect, useRef } from "react";
// Removed unused import
import { useDataChannel } from "../../hooks/useDataChannel";
import { useLiveKit } from "../../hooks/useLiveKit";
import FileAttachment from "./FileAttachment";
import { Send, Video, Paperclip, User, Phone, PhoneOff, Check, CheckCheck, XCircle, Clock, Smile } from "lucide-react";
import { messagesApi, chatRequestsApi, usersApi, chatsApi, presenceApi } from "../../lib/api";
import { formatTime } from "../../lib/timeFormat";
import { sounds } from "../../lib/sounds";
import { SkeletonMessage } from "../ui/Skeleton";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: "text" | "file" | "call";
  fileUrl?: string;
  fileName?: string;
  readBy?: string[]; // Array of user IDs who have read this message
  status?: "sending" | "sent" | "delivered" | "read" | "failed"; // Message delivery status
  reactions?: Record<string, string[]>; // emoji -> array of user IDs who reacted
  callData?: {
    type: "ended" | "missed";
    duration?: number; // in minutes
    callType?: "audio" | "video";
  };
}

interface MessageThreadProps {
  chatId: string;
  userId: string;
  chat?: {
    id: string;
    name: string;
    type: "direct" | "group";
    userIds?: string[];
  };
  onStartCall: (roomName: string, callType?: "audio" | "video") => void;
  onMessageSent?: (chatId: string, message: string, timestamp: Date) => void;
}

export default function MessageThread({
  chatId,
  userId,
  chat,
  onStartCall,
  onMessageSent,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [readReceipts, setReadReceipts] = useState<Record<string, string[]>>({});
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [displayName, setDisplayName] = useState<string>("Chat");
  const [otherUserPresence, setOtherUserPresence] = useState<"online" | "offline" | "away" | "busy" | "dnd">("offline");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { room, connect, disconnect, isConnected } = useLiveKit();
  const { sendMessage, sendTypingIndicator, messages: dataChannelMessages, typingUsers } = useDataChannel(room, userId);
  
  // Listen for new messages and notify if chat is not selected
  useEffect(() => {
    if (!dataChannelMessages || dataChannelMessages.length === 0) return;
    
    // Get the latest message
    const latestMessage = dataChannelMessages[dataChannelMessages.length - 1];
    
    // Only notify if message is from someone else and chat might not be in view
    if (latestMessage && latestMessage.senderId !== userId) {
      // Dispatch event for background message handling
      window.dispatchEvent(new CustomEvent('newMessageReceived', {
        detail: {
          chatId,
          message: latestMessage,
          senderId: latestMessage.senderId,
        }
      }));
    }
  }, [dataChannelMessages, chatId, userId]);

  const commonReactions = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

  // Fetch contact name and presence status if chat object doesn't have a name (for direct chats)
  useEffect(() => {
    // If chat object exists and has a name, use it
    if (chat?.name) {
      setDisplayName(chat.name);
    }

    // Extract other user ID for presence fetching
    let otherUserId: string | undefined;
    
    // If no chat object or no name, try to fetch it from contacts or user profile
    if (chatId && chatId.startsWith("direct-")) {
      // Extract full UUIDs from format: direct-{uuid1}-{uuid2}
      const withoutPrefix = chatId.replace("direct-", "");
      const uuid1Match = withoutPrefix.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (uuid1Match) {
        const uuid1 = uuid1Match[1];
        const remaining = withoutPrefix.substring(uuid1.length + 1);
        const uuid2Match = remaining.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (uuid2Match) {
          const uuid2 = uuid2Match[1];
          otherUserId = uuid1 === userId ? uuid2 : uuid1;
        }
      }
    } else if (chat?.userIds && chat.userIds.length > 0) {
      // Use userIds from chat object if available
      otherUserId = chat.userIds.find((id: string) => id !== userId);
    }
    
    if (otherUserId) {
      // Fetch presence status
      presenceApi.get(otherUserId)
        .then((presenceData: any) => {
          setOtherUserPresence(presenceData?.status || "offline");
        })
        .catch((error) => {
          console.error("Error fetching presence:", error);
          setOtherUserPresence("offline");
        });
      
      // Poll presence every 10 seconds
      const presenceInterval = setInterval(() => {
        presenceApi.get(otherUserId!)
          .then((presenceData: any) => {
            setOtherUserPresence(presenceData?.status || "offline");
          })
          .catch((error) => {
            console.error("Error fetching presence:", error);
          });
      }, 10000);
      
      // Try to get contact name from contacts list first (faster)
      if (!chat?.name) {
        chatRequestsApi.getContacts()
          .then((contacts) => {
            const contact = contacts.find((c: any) => c.contact_id === otherUserId);
            if (contact) {
              setDisplayName(contact.contact_name || contact.contact_email || "Chat");
              return true; // Found in contacts
            }
            return false; // Not found in contacts
          })
          .then((foundInContacts) => {
            // If not found in contacts, try to fetch user profile
            if (!foundInContacts) {
              return usersApi.getProfile(otherUserId!);
            }
            return null;
          })
          .then((userInfo: any) => {
            if (userInfo) {
              setDisplayName(userInfo.name || userInfo.email || "Chat");
            }
          })
          .catch((error) => {
            console.error("Error fetching user/contact name:", error);
            // Keep default "Chat" name if fetch fails
            setDisplayName("Chat");
          });
      }
      
      return () => {
        clearInterval(presenceInterval);
      };
    } else if (chat?.type === "group") {
      setDisplayName(chat.name || "Group Chat");
      setOtherUserPresence("offline");
    } else {
      setDisplayName("Chat");
      setOtherUserPresence("offline");
    }
  }, [chatId, chat?.name, chat?.type, chat?.userIds, userId]);

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        
        const reactions = msg.reactions || {};
        const userReactions = reactions[emoji] || [];
        
        // Toggle reaction - remove if user already reacted, add if not
        const hasReacted = userReactions.includes(userId);
        const newReactions = { ...reactions };
        
        if (hasReacted) {
          newReactions[emoji] = userReactions.filter((id) => id !== userId);
          if (newReactions[emoji].length === 0) {
            delete newReactions[emoji];
          }
        } else {
          newReactions[emoji] = [...userReactions, userId];
        }
        
        // Send reaction via data channel
        if (isConnected) {
          const reactionData = {
            type: "reaction",
            messageId,
            emoji,
            userId,
            action: hasReacted ? "remove" : "add",
          };
          sendMessage(JSON.stringify(reactionData)).catch(console.error);
        }
        
        return {
          ...msg,
          reactions: Object.keys(newReactions).length > 0 ? newReactions : undefined,
        };
      })
    );
    setShowReactionPicker(null);
  };

  // Listen for call notifications
  useEffect(() => {
    const handleCallNotification = (event: CustomEvent) => {
      const { chatId: eventChatId, type, duration, callType } = event.detail;
      
      if (eventChatId !== chatId) return;
      
      const callMessage: Message = {
        id: `call-${Date.now()}`,
        senderId: "system",
        senderName: "System",
        content: type === "ended" 
          ? `${duration} min ${callType === "video" ? "video" : "audio"} call`
          : `Missed ${callType === "video" ? "video" : "audio"} call`,
        timestamp: new Date(),
        type: "call",
        callData: {
          type,
          duration,
          callType,
        },
      };
      
      setMessages((prev) => [...prev, callMessage]);
      
      // Dispatch message update event for chat list
      window.dispatchEvent(new CustomEvent('messageUpdate', {
        detail: {
          chatId,
          lastMessage: callMessage.content,
          timestamp: callMessage.timestamp,
        }
      }));
    };
    
    window.addEventListener('callNotification' as any, handleCallNotification as EventListener);
    return () => {
      window.removeEventListener('callNotification' as any, handleCallNotification as EventListener);
    };
  }, [chatId]);

  useEffect(() => {
    if (!chatId) {
      setIsConnecting(false);
      setMessages([]);
      return;
    }

    setIsConnecting(true);
    let isCancelled = false;

    // Load message history from database first
    const loadMessages = async () => {
      if (chatId.startsWith("direct-")) {
        // Extract UUIDs to get database chat ID
        const withoutPrefix = chatId.replace("direct-", "");
        const uuid1Match = withoutPrefix.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (uuid1Match) {
          const uuid1 = uuid1Match[1];
          const remaining = withoutPrefix.substring(uuid1.length + 1);
          const uuid2Match = remaining.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
          if (uuid2Match) {
            const uuid2 = uuid2Match[1];
            const otherUserId = uuid1 === userId ? uuid2 : uuid1;
            
            try {
              // Get or create chat to get database ID
              const chat = await chatsApi.getOrCreateDirectChat(otherUserId);
              if (!isCancelled && chat.id) {
                // Load message history
                const history = await messagesApi.getMessages(chat.id, 50);
                if (!isCancelled) {
                  setMessages(history.map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp),
                  })));
                }
              }
            } catch (error) {
              console.error("Error loading message history:", error);
            }
          }
        }
      }
    };

    loadMessages();

    // Connect to LiveKit room for real-time messages
    const roomName = `chat-${chatId}`;
    
    connect(roomName)
      .then(() => {
        if (!isCancelled) {
          setIsConnecting(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error("Failed to connect to chat room:", error);
          setIsConnecting(false);
        }
      });

    // Cleanup: disconnect when component unmounts or chatId changes
    return () => {
      isCancelled = true;
      disconnect(roomName);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]); // Only depend on chatId - connect/disconnect are stable

  useEffect(() => {
    if (isConnected) {
      setIsConnecting(false);
    }
  }, [isConnected]);

  useEffect(() => {
    // Sync incoming messages from data channel to local state
    console.log(`🔄 dataChannelMessages updated:`, dataChannelMessages?.length || 0, `messages`);
    
    if (dataChannelMessages && dataChannelMessages.length > 0) {
      console.log(`📥 Processing ${dataChannelMessages.length} messages from data channel`);
      
      // Add all messages from data channel to local state
      setMessages((prev) => {
        const messageMap = new Map(prev.map(m => [m.id, m]));
        let hasNewMessages = false;
        
        dataChannelMessages.forEach((dcMsg) => {
          if (!messageMap.has(dcMsg.id)) {
            console.log(`🆕 New message to add:`, dcMsg.id);
            messageMap.set(dcMsg.id, {
              ...dcMsg,
              status: undefined, // Messages from others don't have status
            });
            hasNewMessages = true;
          }
        });
        
        if (!hasNewMessages) {
          console.log(`✅ No new messages to add`);
          return prev;
        }
        
        // Convert to array and sort
        const allMessages = Array.from(messageMap.values());
        return allMessages.sort((a, b) => {
          const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
          const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
          return timeA - timeB;
        });
      });
      
      // Dispatch event for chat list update
      const latestMessage = dataChannelMessages[dataChannelMessages.length - 1];
      if (latestMessage) {
        window.dispatchEvent(new CustomEvent('messageUpdate', {
          detail: { 
            chatId, 
            lastMessage: latestMessage.content || latestMessage.fileName || "File", 
            timestamp: latestMessage.timestamp instanceof Date ? latestMessage.timestamp : new Date(latestMessage.timestamp)
          }
        }));
      }
    }
  }, [dataChannelMessages, chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when thread is opened - DISABLED (endpoint not implemented)
  // useEffect(() => {
  //   if (messages.length > 0) {
  //     const unreadMessageIds = messages
  //       .filter((m) => m.senderId !== userId)
  //       .map((m) => m.id);
      
  //     if (unreadMessageIds.length > 0) {
  //       messagesApi.markAsRead(unreadMessageIds).catch(() => {});
  //     }
  //   }
  // }, [messages, userId]);

  // Fetch read receipts for messages - DISABLED for now (endpoint not implemented)
  // useEffect(() => {
  //   const fetchReadReceipts = async () => {
  //     if (messages.length === 0) return;
      
  //     const myMessageIds = messages
  //       .filter((m) => m.senderId === userId)
  //       .map((m) => m.id);
      
  //     if (myMessageIds.length === 0) return;
      
  //     try {
  //       const receipts = await messagesApi.getReadReceipts(myMessageIds);
  //       const receiptsMap: Record<string, string[]> = {};
  //       receipts.forEach((receipt: any) => {
  //         if (!receiptsMap[receipt.message_id]) {
  //           receiptsMap[receipt.message_id] = [];
  //         }
  //         receiptsMap[receipt.message_id].push(receipt.user_id);
  //       });
  //       setReadReceipts(receiptsMap);
  //     } catch (error) {
  //       console.error("Error fetching read receipts:", error);
  //     }
  //   };

  //   // Fetch read receipts periodically
  //   fetchReadReceipts();
  //   const interval = setInterval(fetchReadReceipts, 5000); // Check every 5 seconds
    
  //   return () => clearInterval(interval);
  // }, [messages, userId]);

  // Send typing indicator when user types
  useEffect(() => {
    if (newMessage.trim() && isConnected) {
      sendTypingIndicator("You");
    }
  }, [newMessage, isConnected, sendTypingIndicator]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const messageContent = newMessage.trim();
    const message: Message = {
      id: messageId,
      senderId: userId,
      senderName: "You",
      content: messageContent,
      timestamp: new Date(),
      type: "text",
      status: "sending", // Start with sending status
    };

    // If this is a direct chat, ensure the chat record exists BEFORE sending
    // This ensures both users see the chat in their list immediately
    let chatDbId: string | null = null;
    if (chatId.startsWith("direct-")) {
      // Extract full UUIDs from format: direct-{uuid1}-{uuid2}
      // UUIDs have format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (8-4-4-4-12)
      const withoutPrefix = chatId.replace("direct-", "");
      // Find the split point - UUIDs are 36 chars each (32 hex + 4 hyphens)
      // The two UUIDs are separated by a single hyphen
      const uuid1Match = withoutPrefix.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (uuid1Match) {
        const uuid1 = uuid1Match[1];
        const remaining = withoutPrefix.substring(uuid1.length + 1); // +1 for the separator hyphen
        const uuid2Match = remaining.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (uuid2Match) {
          const uuid2 = uuid2Match[1];
          const otherUserId = uuid1 === userId ? uuid2 : uuid1;
          
          if (otherUserId) {
            // Always create/get chat record (ensures both users see it)
            try {
              const chat = await chatsApi.getOrCreateDirectChat(otherUserId);
              chatDbId = chat.id;
              // Notify immediately so chat appears in list
              window.dispatchEvent(new CustomEvent('chatCreated', { detail: { chatId: chat.id } }));
            } catch (error) {
              console.error("Error creating chat record:", error);
              // Continue anyway - message will still be sent via LiveKit
            }
          }
        }
      }
    }

    // Add message immediately with "sending" status - this ensures it shows up right away
    setMessages((prev) => {
      // Check if message already exists (prevent duplicates)
      const exists = prev.find(m => m.id === messageId);
      if (exists) return prev;
      return [...prev, message];
    });
    setNewMessage("");

    // Check room connection state before sending
    if (!room || room.state !== "connected") {
      // Mark as failed if not connected - user can retry later
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, status: "failed" as const } : m
        )
      );
      // Try to reconnect
      if (!room) {
        const roomName = `chat-${chatId}`;
        connect(roomName).catch((err) => {
          console.error("Failed to reconnect:", err);
        });
      }
      return;
    }

    try {
      const messagePayload = JSON.stringify(message);
      console.log(`📤 Sending message via LiveKit:`, {
        id: messageId,
        senderId: userId,
        content: messageContent.substring(0, 50),
        timestamp: message.timestamp
      });
      
      await sendMessage(messagePayload);
      console.log(`✅ Message sent successfully via LiveKit`);
      
      // Mark as sent after successful send
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, status: "sent" as const } : m
        )
      );
      
      // Save message to database for persistent storage
      if (chatDbId) {
        try {
          await messagesApi.saveMessage({
            id: messageId,
            chatId: chatDbId,
            content: messageContent,
            type: "text",
          });
        } catch (error) {
          console.error("Error saving message to database:", error);
          // Don't fail the send if database save fails
        }
      }
      
      // Notify parent component about the new message
      if (onMessageSent) {
        onMessageSent(chatId, messageContent, new Date());
      }
      // Also dispatch custom event for ChatList to listen to
      window.dispatchEvent(new CustomEvent('messageUpdate', {
        detail: { chatId, lastMessage: messageContent, timestamp: new Date() }
      }));
      
      // In a real app, "delivered" would come from the server when recipient receives it
      // For now, we'll assume it's delivered after sending
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.status === "sent" ? { ...m, status: "delivered" as const } : m
          )
        );
      }, 1000);
    } catch (error: any) {
      console.error("Error sending message:", error);
      // Mark as failed on error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, status: "failed" as const } : m
        )
      );
      
      // If error is about connection, try to reconnect
      if (error?.message?.includes("not connected") || error?.message?.includes("Room not")) {
        const roomName = `chat-${chatId}`;
        connect(roomName).catch(() => {});
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-sky-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{displayName}</h3>
            {chat?.type === "direct" && chat.userIds ? (() => {
              // Use fetched presence status
              const statusColors = {
                online: "bg-green-500",
                offline: "bg-gray-400",
                away: "bg-yellow-500",
                busy: "bg-red-500",
                dnd: "bg-purple-500",
              };
              const statusTexts = {
                online: "Online",
                offline: "Offline",
                away: "Away",
                busy: "Busy",
                dnd: "Do Not Disturb",
              };
              const statusColor = statusColors[otherUserPresence] || "bg-gray-400";
              const statusText = statusTexts[otherUserPresence] || "Offline";
              
              return (
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
                  <p className="text-sm text-gray-500">{statusText}</p>
                </div>
              );
            })() : chat?.type === "group" ? (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <p className="text-sm text-gray-500">Group Chat</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500 animate-pulse" : isConnecting ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                }`}></div>
                <p className="text-sm text-gray-500">
                  {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Disconnected"}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                sounds.callInitiated();
                onStartCall(`chat-${chatId}`, "audio");
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
              title="Audio Call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                sounds.callInitiated();
                onStartCall(`chat-${chatId}`, "video");
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
              title="Video Call"
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
        {isConnecting && messages.length === 0 ? (
          <div className="space-y-4">
            <SkeletonMessage />
            <SkeletonMessage isOwn />
            <SkeletonMessage />
            <SkeletonMessage isOwn />
            <SkeletonMessage />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-sky-100 rounded-2xl flex items-center justify-center mb-4">
              <Send className="w-10 h-10 text-blue-500" />
            </div>
            <p className="text-lg font-medium text-gray-600">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            // Render call notification differently
            if (message.type === "call") {
              return (
                <div key={message.id} className="flex justify-center mb-4">
                  <div className="px-4 py-2 bg-gray-100 rounded-full">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {message.callData?.type === "missed" ? (
                        <>
                          <PhoneOff className="w-4 h-4 text-red-500" />
                          <span>{message.content}</span>
                        </>
                      ) : (
                        <>
                          <Phone className="w-4 h-4 text-blue-500" />
                          <span>{message.content}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            
            const isOwnMessage = message.senderId === userId;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4 group relative`}
                onMouseEnter={() => {
                  // Only show picker on other people's messages
                  if (!isOwnMessage) {
                    setHoveredMessageId(message.id);
                  }
                }}
                onMouseLeave={(e) => {
                  // Don't hide if moving to the picker
                  const relatedTarget = e.relatedTarget;
                  if (relatedTarget && relatedTarget instanceof HTMLElement && relatedTarget.closest('.reaction-picker-container')) {
                    return;
                  }
                  setHoveredMessageId(null);
                  setShowReactionPicker(null);
                }}
              >
                <div className={`relative max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                  message.senderId === userId
                    ? "bg-gradient-to-br from-blue-500 to-sky-600 text-white"
                    : "bg-white text-gray-900 border border-gray-200"
                }`}>
                  {message.senderId !== userId && chat?.type === "group" && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-white">
                          {message.senderName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                        </span>
                      </div>
                      <span className="text-xs font-medium opacity-90">{message.senderName}</span>
                    </div>
                  )}
                  <div className={message.senderId === userId ? "text-white" : "text-gray-900"}>
                    {message.type === "file" ? (
                      <a
                        href={message.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 hover:underline ${
                          message.senderId === userId ? "text-blue-100" : "text-blue-600"
                        }`}
                      >
                        <Paperclip className="w-4 h-4" />
                        {message.fileName || message.content}
                      </a>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 text-xs mt-2 ${
                    message.senderId === userId ? "text-blue-100" : "text-gray-400"
                  }`}>
                    <span>{formatTime(message.timestamp)}</span>
                    {/* Message status indicators for sent messages */}
                    {message.senderId === userId && (
                      <div className="flex items-center ml-1" title={
                        message.status === "failed" ? "Failed to send - tap to retry" :
                        message.status === "sending" ? "Sending..." :
                        message.status === "read" || (readReceipts[message.id] && readReceipts[message.id].length > 0) ? "Read" :
                        message.status === "delivered" ? "Delivered" :
                        message.status === "sent" ? "Sent" :
                        "Sending"
                      }>
                        {message.status === "failed" ? (
                          <button
                            onClick={async () => {
                              // Retry sending failed message
                              const failedMessage = message;
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === failedMessage.id ? { ...m, status: "sending" as const } : m
                                )
                              );

                              if (!isConnected) {
                                const roomName = `chat-${chatId}`;
                                await connect(roomName).catch(console.error);
                                // Wait a bit for connection
                                await new Promise(resolve => setTimeout(resolve, 500));
                              }

                              if (isConnected) {
                                try {
                                  await sendMessage(JSON.stringify(failedMessage));
                                  setMessages((prev) =>
                                    prev.map((m) =>
                                      m.id === failedMessage.id ? { ...m, status: "sent" as const } : m
                                    )
                                  );
                                  setTimeout(() => {
                                    setMessages((prev) =>
                                      prev.map((m) =>
                                        m.id === failedMessage.id && m.status === "sent" ? { ...m, status: "delivered" as const } : m
                                      )
                                    );
                                  }, 1000);
                                } catch (error) {
                                  console.error("Error retrying message:", error);
                                  setMessages((prev) =>
                                    prev.map((m) =>
                                      m.id === failedMessage.id ? { ...m, status: "failed" as const } : m
                                    )
                                  );
                                }
                              } else {
                                setMessages((prev) =>
                                  prev.map((m) =>
                                    m.id === failedMessage.id ? { ...m, status: "failed" as const } : m
                                  )
                                );
                              }
                            }}
                            className="hover:opacity-80 transition-opacity"
                            title="Failed to send - Click to retry"
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-300" />
                          </button>
                        ) : message.status === "sending" ? (
                          <div title="Sending">
                            <Clock className="w-3.5 h-3.5 text-blue-200/50 animate-pulse" />
                          </div>
                        ) : message.status === "read" || (readReceipts[message.id] && readReceipts[message.id].length > 0) ? (
                          <div title="Read">
                            <CheckCheck className="w-3 h-3 text-white fill-white" />
                          </div>
                        ) : message.status === "delivered" ? (
                          <div title="Delivered">
                            <CheckCheck className="w-3.5 h-3.5 text-blue-200/70" />
                          </div>
                        ) : message.status === "sent" ? (
                          <div title="Sent">
                            <Check className="w-3.5 h-3.5 text-blue-200/50" />
                          </div>
                        ) : (
                          <div title="Sending">
                            <Clock className="w-3.5 h-3.5 text-blue-200/50 animate-pulse" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Reactions - always show on other people's messages */}
                  {!isOwnMessage && message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(message.reactions).map(([emoji, userIds]) => (
                        userIds.length > 0 && (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message.id, emoji)}
                            className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-all hover:scale-110 ${
                              userIds.includes(userId)
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-gray-100 text-gray-600 border border-gray-200"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="font-medium">{userIds.length}</span>
                          </button>
                        )
                      ))}
                    </div>
                  )}
                  
                  {/* Reactions on own messages - only show if others reacted */}
                  {isOwnMessage && message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(message.reactions).map(([emoji, userIds]) => (
                        userIds.length > 0 && (
                          <div
                            key={emoji}
                            className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                              userIds.includes(userId)
                                ? "bg-white/30 text-white border border-white/40"
                                : "bg-white/20 text-white/80 border border-white/20"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="font-medium">{userIds.length}</span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Reaction Picker - appears on hover, only on other people's messages */}
                {!isOwnMessage && hoveredMessageId === message.id && (
                  <div 
                    className="absolute top-full left-0 mt-2 z-10 reaction-picker-container"
                    onMouseEnter={() => {
                      // Keep picker visible when hovering over it
                      setHoveredMessageId(message.id);
                    }}
                    onMouseLeave={() => {
                      setHoveredMessageId(null);
                      setShowReactionPicker(null);
                    }}
                  >
                    <div className="bg-white rounded-full shadow-lg border border-gray-200 p-1 flex items-center gap-1">
                      {commonReactions.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(message.id, emoji)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all hover:scale-125 text-lg"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all text-gray-600"
                        title="More reactions"
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        {/* Typing Indicators */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="flex justify-start mb-2">
            <div className="px-4 py-2 bg-gray-100 rounded-2xl text-sm text-gray-600">
              {Object.values(typingUsers).join(", ")} {Object.keys(typingUsers).length === 1 ? "is" : "are"} typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        <div className="flex gap-3 items-end">
          <FileAttachment
            onFileSent={async (fileUrl, fileName, _fileType) => {
              const message: Message = {
                id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
                senderId: userId,
                senderName: "You",
                content: fileName,
                timestamp: new Date(),
                type: "file",
                fileUrl,
                fileName,
              };
              try {
                await sendMessage(JSON.stringify(message));
                setMessages((prev) => [...prev, message]);
              } catch (error) {
                console.error("Error sending file:", error);
              }
            }}
          />
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              disabled={isConnecting}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={isConnecting || !newMessage.trim()}
            className="p-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center"
            title={!isConnected && !isConnecting ? "Not connected - message will send when connection is restored" : ""}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
