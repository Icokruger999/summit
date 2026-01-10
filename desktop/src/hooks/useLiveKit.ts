import { useState, useCallback, useRef } from "react";
import { Room, RoomOptions, RoomEvent } from "livekit-client";
import { getAuthToken } from "../lib/api";

// LiveKit URL - for production should be set via environment variable
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

// Server URL - MUST be set in production (via amplify.yml)
// No localhost fallback for web builds to prevent local file connections
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

if (!SERVER_URL && import.meta.env.MODE === "production") {
  console.error("❌ VITE_SERVER_URL is not set! LiveKit token requests will fail.");
}

export function useLiveKit() {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const connectingRef = useRef<string | null>(null);
  const currentRoomNameRef = useRef<string | null>(null);

  const connect = useCallback(async (roomName: string) => {
    // Prevent multiple simultaneous connections to the same room
    if (connectingRef.current === roomName) {
      console.log(`Already connecting to ${roomName}, skipping...`);
      return;
    }

    // If already connected to this room, don't reconnect
    if (roomRef.current && currentRoomNameRef.current === roomName && roomRef.current.state === "connected") {
      console.log(`Already connected to ${roomName}, skipping...`);
      return;
    }

    connectingRef.current = roomName;

    try {
      // Disconnect from previous room first if it exists
      const currentRoom = roomRef.current;
      if (currentRoom && currentRoom.state === "connected") {
        console.log("Disconnecting from previous room before connecting to new one");
        try {
          await currentRoom.disconnect();
        } catch (err) {
          console.warn("Error disconnecting previous room:", err);
        }
        setRoom(null);
        roomRef.current = null;
        setIsConnected(false);
      }

      // Get auth token from localStorage
      const token = getAuthToken();
      
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${SERVER_URL}/api/livekit/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get LiveKit token");
      }

      const { token: livekitToken } = await response.json();

      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event handlers before connecting
      newRoom.on(RoomEvent.Connected, () => {
        console.log(`✅ LiveKit room connected: ${roomName}`);
        setIsConnected(true);
      });

      newRoom.on(RoomEvent.Disconnected, (reason) => {
        console.log(`🔌 LiveKit room disconnected: ${roomName}`, reason);
        setIsConnected(false);
        // Only clear room if it's the current room
        if (roomRef.current === newRoom) {
          setRoom(null);
          roomRef.current = null;
          currentRoomNameRef.current = null;
        }
      });

      newRoom.on(RoomEvent.Reconnecting, () => {
        console.log(`🔄 LiveKit reconnecting to: ${roomName}`);
      });

      newRoom.on(RoomEvent.Reconnected, () => {
        console.log(`✅ LiveKit reconnected to: ${roomName}`);
        setIsConnected(true);
      });

      newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log(`🔗 LiveKit connection state: ${state}`);
      });

      // Connect to the room
      await newRoom.connect(LIVEKIT_URL, livekitToken);

      // Set the room ref and state
      roomRef.current = newRoom;
      currentRoomNameRef.current = roomName;
      setRoom(newRoom);

      // Wait for connection to be established
      if (newRoom.state === "connected") {
        setIsConnected(true);
      }
    } catch (error) {
      console.error("Failed to connect to LiveKit:", error);
      setIsConnected(false);
      setRoom(null);
      roomRef.current = null;
      currentRoomNameRef.current = null;
      throw error;
    } finally {
      connectingRef.current = null;
    }
  }, []);

  const disconnect = useCallback(async (roomName?: string) => {
    const currentRoom = roomRef.current;
    // If roomName is provided, only disconnect if it matches the current room
    if (roomName && currentRoomNameRef.current !== roomName) {
      console.log(`Skipping disconnect - room name mismatch: ${currentRoomNameRef.current} vs ${roomName}`);
      return;
    }
    
    if (currentRoom) {
      try {
        await currentRoom.disconnect();
      } catch (err) {
        console.warn("Error during disconnect:", err);
      }
      setIsConnected(false);
      setRoom(null);
      roomRef.current = null;
      currentRoomNameRef.current = null;
    }
    connectingRef.current = null;
  }, []);

  return {
    room,
    connect,
    disconnect,
    isConnected,
  };
}

