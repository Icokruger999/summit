import { useEffect, useRef, useCallback } from "react";

interface UseMessageWebSocketOptions {
  userId: string | null;
  onNewMessage: (message: any) => void;
  enabled?: boolean;
}

export function useMessageWebSocket({
  userId,
  onNewMessage,
  enabled = true,
}: UseMessageWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const isConnectingRef = useRef(false);
  const isIntentionallyClosedRef = useRef(false);
  // Use a ref to always have the latest callback without causing reconnections
  const onNewMessageRef = useRef(onNewMessage);
  
  // Update ref when callback changes
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log("✅ WebSocket already connected");
      } else {
        console.log("⏳ WebSocket already connecting...");
      }
      return;
    }

    if (!userId || !enabled || !isMountedRef.current) {
      return;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.warn("⚠️ No auth token found for WebSocket connection");
      return;
    }

    // Clean up any existing connection first
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // Ignore errors when closing
      }
      wsRef.current = null;
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    isConnectingRef.current = true;
    isIntentionallyClosedRef.current = false;

    try {
      // Use production API URL - MUST be set in environment (Amplify)
      // Use production URL as fallback for web builds (not localhost)
      const apiUrl = import.meta.env.VITE_SERVER_URL || 
        (import.meta.env.MODE === "production" ? "https://summit.api.codingeverest.com" : undefined);
      if (!apiUrl) {
        console.error("❌ VITE_SERVER_URL is not set! WebSocket cannot connect.");
        throw new Error("VITE_SERVER_URL environment variable is required");
      }
      
      // Convert https:// to wss:// and http:// to ws://
      const wsUrl = apiUrl.replace(/^https?:\/\//, (match) => {
        return match === "https://" ? "wss://" : "ws://";
      }).replace(/\/$/, ""); // Remove trailing slash if present
      
      // OPTION: Use Sec-WebSocket-Protocol instead of query string for better security
      // This avoids exposing token in URL and may bypass WAF rules
      // However, query string is also standard and works fine
      // Using query string for now as it's simpler and well-supported
      console.log("🔌 Connecting WebSocket to:", `${wsUrl}/ws`);
      
      // Note: Token in query string is standard practice for WebSocket auth
      // The browser WebSocket API doesn't support custom headers like Authorization
      // Query string is the recommended workaround
      const ws = new WebSocket(`${wsUrl}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) {
          ws.close();
          return;
        }
        console.log("✅ Message WebSocket connected");
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "NEW_MESSAGE") {
            console.log("📨 Received real-time message notification:", data.data);
            // Use ref to get latest callback without recreating connection
            onNewMessageRef.current(data.data);
          } else if (data.type === "MESSAGES_READ") {
            console.log("✅ Received messages read notification:", data.data);
            // Dispatch event for messages being read (so sender can update statuses)
            window.dispatchEvent(new CustomEvent('messagesRead', {
              detail: data.data
            }));
          } else if (data.type === "TYPING") {
            console.log("📝 Received typing indicator:", data.data);
            // Dispatch event for typing indicator
            window.dispatchEvent(new CustomEvent('typingIndicator', {
              detail: data.data
            }));
          } else if (data.type === "CONNECTED") {
            console.log("✅ WebSocket authenticated for user:", data.userId);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        // Only log errors if we're actually connecting/connected and it wasn't intentional
        if (!isIntentionallyClosedRef.current && isMountedRef.current) {
          const readyState = ws.readyState;
          // WebSocket.CONNECTING = 0, OPEN = 1, CLOSING = 2, CLOSED = 3
          if (readyState === WebSocket.CONNECTING || readyState === WebSocket.OPEN) {
            console.warn("⚠️ WebSocket error occurred (readyState:", readyState, ")");
          }
          // If it's already CLOSED or CLOSING, the onclose handler will handle it
        }
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        wsRef.current = null;

        // Don't log or reconnect if we intentionally closed it
        if (isIntentionallyClosedRef.current || !isMountedRef.current) {
          return;
        }

        // Normal closure codes: 1000 (normal), 1001 (going away), 1005 (no status)
        // Error codes: 1006 (abnormal), 1008 (policy violation/auth), 1011 (server error)
        if (event.code === 1000 || event.code === 1001) {
          console.log("🔌 WebSocket closed normally");
          return;
        }

        if (event.code === 1008) {
          console.error("❌ WebSocket closed due to authentication error. Check token.");
          return;
        }

        // Only log and reconnect for unexpected closures
        console.log("🔌 WebSocket disconnected. Code:", event.code, "Reason:", event.reason || "Unknown");
        
        // Reconnect with exponential backoff (only if mounted and enabled)
        if (isMountedRef.current && enabled && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`🔄 Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1}/5)`);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && enabled) {
              reconnectAttemptsRef.current++;
              connect();
            }
          }, delay);
        } else if (reconnectAttemptsRef.current >= 5) {
          console.warn("⚠️ Max reconnection attempts reached. Stopping reconnection.");
        }
      };
    } catch (error) {
      isConnectingRef.current = false;
      console.error("Error creating WebSocket:", error);
    }
  }, [userId, enabled]);

  const disconnect = useCallback(() => {
    isIntentionallyClosedRef.current = true;
    
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    // Close WebSocket if it exists
    if (wsRef.current) {
      try {
        // Check if it's already closed or closing
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close(1000, "Client disconnecting"); // Normal closure
        }
      } catch (error) {
        // Ignore errors when closing
      }
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [userId, enabled, connect, disconnect]);

  return { disconnect, reconnect: connect };
}

