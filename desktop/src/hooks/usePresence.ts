import { useState, useEffect, useCallback } from "react";
import { presenceApi } from "../lib/api";

interface Presence {
  user_id: string;
  status: "online" | "offline" | "away" | "busy" | "dnd";
  last_seen: string | null;
  updated_at: string;
}

export function usePresence(userId: string | null) {
  const [presence, setPresence] = useState<Presence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadPresence();
    // Poll for presence updates every 30 seconds
    const interval = setInterval(loadPresence, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  const loadPresence = async () => {
    if (!userId) return;
    try {
      const data = await presenceApi.get(userId);
      setPresence(data);
    } catch (error) {
      console.error("Error loading presence:", error);
      // Default to offline if error
      setPresence({
        user_id: userId,
        status: "offline",
        last_seen: null,
        updated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return { presence, loading, refetch: loadPresence };
}

export function usePresenceBatch(userIds: string[]) {
  const [presences, setPresences] = useState<Record<string, Presence>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userIds.length === 0) {
      setLoading(false);
      return;
    }

    loadPresences();
    // Poll for presence updates every 30 seconds
    const interval = setInterval(loadPresences, 30000);

    return () => clearInterval(interval);
  }, [userIds.join(",")]);

  const loadPresences = async () => {
    if (userIds.length === 0) return;
    try {
      const data = await presenceApi.getBatch(userIds);
      const presenceMap: Record<string, Presence> = {};
      data.forEach((p: Presence) => {
        presenceMap[p.user_id] = p;
      });
      setPresences(presenceMap);
    } catch (error) {
      console.error("Error loading presences:", error);
    } finally {
      setLoading(false);
    }
  };

  return { presences, loading, refetch: loadPresences };
}

// Hook to update current user's presence
export function useUpdatePresence() {
  const updateStatus = useCallback(async (status: "online" | "offline" | "away" | "busy" | "dnd") => {
    
    try {
      await presenceApi.updateStatus(status);
    } catch (error) {
      console.error("Error updating presence:", error);
    }
  }, []);

  useEffect(() => {
    
    // Set online when component mounts
    updateStatus("online");

    // Set offline when component unmounts or window closes
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline status update
      const token = localStorage.getItem("auth_token");
      if (token) {
        navigator.sendBeacon(
          `${import.meta.env.VITE_SERVER_URL || ""}/api/presence`,
          JSON.stringify({ status: "offline" })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updateStatus("offline");
    };
  }, [updateStatus]);

  return { updateStatus };
}

