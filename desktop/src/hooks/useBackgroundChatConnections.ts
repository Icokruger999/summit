import { useEffect, useRef } from "react";
import { Room, RoomEvent, DataPacket_Kind } from "livekit-client";
import { getAuthToken } from "../lib/api";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || "ws://localhost:7880";
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

interface BackgroundChatConnection {
  chatId: string;
  room: Room;
}

/**
 * Hook to maintain background connections to all user's chats
 * This ensures users receive messages even when not viewing a specific chat
 * IMPORTANT: This hook will NOT connect to the currently selected chat to avoid duplicate connections
 */
export function useBackgroundChatConnections({
  userId,
  chats,
  onNewMessage,
  enabled,
  selectedChatId,
}: {
  userId: string;
  chats: Array<{ id: string; dbId?: string }>;
  onNewMessage: (chatId: string, message: any, senderId: string) => void;
  enabled: boolean;
  selectedChatId?: string | null;
}) {
  const connectionsRef = useRef<Map<string, BackgroundChatConnection>>(new Map());

  useEffect(() => {
    if (!enabled || !userId) return;

    const directChats = chats.filter((chat) => chat.id.startsWith("direct-"));

    // Disconnect from the selected chat if it's currently connected in background
    // (MessageThread will handle the active connection)
    if (selectedChatId) {
      const selectedRoomName = `chat-${selectedChatId}`;
      const selectedConnection = connectionsRef.current.get(selectedRoomName);
      if (selectedConnection) {
        console.log(`🔌 Disconnecting background connection for selected chat: ${selectedRoomName}`);
        try {
          selectedConnection.room.disconnect();
        } catch (error) {
          console.error("Error disconnecting selected chat from background:", error);
        }
        connectionsRef.current.delete(selectedRoomName);
      }
    }

    // Clean up connections for chats that no longer exist or are selected
    connectionsRef.current.forEach((connection, roomName) => {
      const chatId = connection.chatId;
      const chatStillExists = directChats.some((chat) => chat.id === chatId);
      const isSelected = selectedChatId && chatId === selectedChatId;
      
      if (!chatStillExists || isSelected) {
        console.log(`🧹 Cleaning up background connection: ${roomName}`);
        try {
          connection.room.disconnect();
        } catch (error) {
          console.error("Error disconnecting during cleanup:", error);
        }
        connectionsRef.current.delete(roomName);
      }
    });

    // Connect to all direct chats in the background (except the selected one)
    directChats.forEach(async (chat) => {
      const roomName = `chat-${chat.id}`;

      // Skip if this is the selected chat (MessageThread handles it)
      if (selectedChatId && chat.id === selectedChatId) {
        return;
      }

      // Skip if already connected
      if (connectionsRef.current.has(roomName)) {
        return;
      }

      try {
        // Get auth token
        const token = getAuthToken();
        if (!token) return;

        // Get LiveKit token
        const response = await fetch(`${SERVER_URL}/api/livekit/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ roomName }),
        });

        if (!response.ok) {
          console.error(`Failed to get token for ${roomName}`);
          return;
        }

        const { token: livekitToken } = await response.json();

        // Create and connect to room
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        // Listen for messages
        const handleData = (payload: Uint8Array, participant: any) => {
          try {
            const decoder = new TextDecoder();
            const messageStr = decoder.decode(payload);
            const data = JSON.parse(messageStr);

            // Only handle actual messages (not typing indicators)
            if (data.id && data.type !== "typing" && data.senderId !== userId) {
              onNewMessage(chat.id, data, data.senderId);
            }
          } catch (error) {
            console.error("Error parsing background message:", error);
          }
        };

        room.on(RoomEvent.DataReceived, handleData);

        // Connect to room
        await room.connect(LIVEKIT_URL, livekitToken);

        connectionsRef.current.set(roomName, { chatId: chat.id, room });

        console.log(`✅ Background connection established for ${roomName}`);
      } catch (error) {
        console.error(`Failed to connect to background room ${roomName}:`, error);
      }
    });

    // Cleanup: disconnect from all rooms
    return () => {
      connectionsRef.current.forEach(({ room }) => {
        try {
          room.disconnect();
        } catch (error) {
          console.error("Error disconnecting background room:", error);
        }
      });
      connectionsRef.current.clear();
    };
  }, [chats, userId, enabled, onNewMessage, selectedChatId]);
}

