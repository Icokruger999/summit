import { useState, useEffect, useCallback, useRef } from "react";
import { presenceApi } from "../lib/api";

// Time in milliseconds before user is considered "away"
const AWAY_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity

// Events that indicate user activity
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove", 
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

interface UseAutoAwayOptions {
  enabled?: boolean;
  awayTimeout?: number;
  currentStatus?: "online" | "offline" | "away" | "busy" | "dnd";
  onStatusChange?: (status: "online" | "away") => void;
}

export function useAutoAway(options: UseAutoAwayOptions = {}) {
  const { 
    enabled = true, 
    awayTimeout = AWAY_TIMEOUT,
    currentStatus = "online",
    onStatusChange 
  } = options;
  
  const [isAway, setIsAway] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusBeforeAwayRef = useRef<string | null>(null);

  // Don't auto-away if user manually set busy/dnd
  const shouldAutoAway = enabled && currentStatus !== "busy" && currentStatus !== "dnd";

  // Set user as away
  const setAway = useCallback(async () => {
    if (!shouldAutoAway || isAway) return;

    console.log("💤 User inactive - setting status to away");
    statusBeforeAwayRef.current = currentStatus;
    setIsAway(true);
    
    try {
      await presenceApi.updateStatus("away");
      onStatusChange?.("away");
    } catch (error) {
      console.error("Error setting away status:", error);
    }
  }, [shouldAutoAway, isAway, currentStatus, onStatusChange]);

  // Set user back to online
  const setOnline = useCallback(async () => {
    if (!isAway) return;
    
    console.log("👋 User active - setting status back to online");
    setIsAway(false);
    
    try {
      await presenceApi.updateStatus("online");
      onStatusChange?.("online");
    } catch (error) {
      console.error("Error setting online status:", error);
    }
    
    statusBeforeAwayRef.current = null;
  }, [isAway, onStatusChange]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // If user was away, bring them back online
    if (isAway) {
      setOnline();
    }
    
    // Set new timeout for going away
    if (shouldAutoAway) {
      timeoutRef.current = setTimeout(setAway, awayTimeout);
    }
  }, [isAway, shouldAutoAway, awayTimeout, setAway, setOnline]);

  // Set up activity listeners
  useEffect(() => {
    if (!shouldAutoAway) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    // Start initial timeout
    timeoutRef.current = setTimeout(setAway, awayTimeout);

    // Add activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Handle tab visibility
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleActivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [shouldAutoAway, awayTimeout, handleActivity, setAway]);

  return { isAway, resetActivity: handleActivity };
}
