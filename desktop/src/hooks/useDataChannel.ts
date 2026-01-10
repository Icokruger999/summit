import { useState, useEffect, useCallback, useRef } from "react";
import { Room, RoomEvent } from "livekit-client";

export function useDataChannel(room: Room | null, currentUserId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastTypingSentRef = useRef<number>(0);

  useEffect(() => {
    if (!room) {
      setIsConnected(false);
      setMessages([]);
      return;
    }

    setIsConnected(room.state === "connected");

    const handleData = (payload: Uint8Array, participant: any) => {
      try {
        const decoder = new TextDecoder();
        const messageStr = decoder.decode(payload);
        const data = JSON.parse(messageStr);
        
        // Handle typing indicators
        if (data.type === "typing" && data.userId !== currentUserId) {
          const userId = data.userId;
          const userName = data.userName || "Someone";
          
          setTypingUsers((prev) => ({
            ...prev,
            [userId]: userName,
          }));

          // Clear typing indicator after 3 seconds
          if (typingTimeoutRef.current[userId]) {
            clearTimeout(typingTimeoutRef.current[userId]);
          }
          typingTimeoutRef.current[userId] = setTimeout(() => {
            setTypingUsers((prev) => {
              const updated = { ...prev };
              delete updated[userId];
              return updated;
            });
            delete typingTimeoutRef.current[userId];
          }, 3000);
          return;
        }

        // Handle regular messages
        if (data.id && data.type !== "typing" && data.type !== "reaction") {
          console.log(`📨 Data channel received message:`, {
            id: data.id,
            from: data.senderId,
            currentUser: currentUserId,
            content: data.content?.substring(0, 50)
          });
          
          // Only process messages from other users (sender already has their message locally)
          if (data.senderId !== currentUserId) {
            console.log(`✅ Adding message from other user to state`);
            setMessages((prev) => {
              const exists = prev.find((m) => m.id === data.id);
              if (exists) {
                console.log(`⚠️ Message already exists in state, skipping`);
                return prev;
              }
              
              console.log(`➕ Adding new message to state`);
              // Add new message and sort by timestamp
              const newMessages = [...prev, data];
              return newMessages.sort((a, b) => {
                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                return timeA - timeB;
              });
            });
          } else {
            console.log(`⏭️ Skipping message from self (already in local state)`);
          }
        }
      } catch (error) {
        console.error("Error parsing data channel message:", error);
      }
    };

    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => {
      setIsConnected(false);
      // DON'T clear messages on disconnect - preserve chat history
      setTypingUsers({});
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
      typingTimeoutRef.current = {};
    };

    room.on(RoomEvent.DataReceived, handleData);
    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [room, currentUserId]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!room) {
        throw new Error("Room not initialized. Please wait for connection.");
      }

      if (room.state !== "connected") {
        throw new Error(`Room not connected. Current state: ${room.state}. Please wait for connection.`);
      }

      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);

        await room.localParticipant.publishData(
          data,
          { reliable: true, destinationIdentities: [] } as any
        );
      } catch (error: any) {
        console.error("Error publishing data to room:", error);
        throw new Error(`Failed to send message: ${error.message || "Unknown error"}`);
      }
    },
    [room]
  );

  const sendTypingIndicator = useCallback(
    async (userName: string) => {
      if (!room || !isConnected || !currentUserId) {
        return;
      }

      // Debounce: only send typing indicator every 2 seconds
      const now = Date.now();
      if (now - lastTypingSentRef.current < 2000) {
        return;
      }
      lastTypingSentRef.current = now;

      const typingData = {
        type: "typing",
        userId: currentUserId,
        userName,
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(typingData));

      await room.localParticipant.publishData(
        data,
        { reliable: true } as any
      );
    },
    [room, isConnected, currentUserId]
  );

  return {
    sendMessage,
    sendTypingIndicator,
    messages,
    typingUsers,
    isConnected,
  };
}
