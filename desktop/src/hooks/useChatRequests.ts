import { useState, useEffect, useRef } from "react";
import { chatRequestsApi } from "../lib/api";

interface ChatRequest {
  id: string;
  requester_id?: string;
  requestee_id?: string;
  status: string;
  created_at: string;
  requester_name?: string;
  requester_email?: string;
  [key: string]: any;
}

interface UseChatRequestsOptions {
  userId: string;
  enabled?: boolean;
  pollInterval?: number; // Polling interval in ms
  onNewRequest?: (request: ChatRequest) => void;
}

export function useChatRequests({ 
  userId, 
  enabled = true,
  pollInterval = 5000, // 5 seconds
  onNewRequest
}: UseChatRequestsOptions) {
  const [receivedRequests, setReceivedRequests] = useState<ChatRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ChatRequest[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const previousRequestIdsRef = useRef<Set<string>>(new Set());

  const fetchAll = async () => {
    if (!isMountedRef.current) {
      return;
    }

    try {
      setError(null);
      const [received, sent, contactsData] = await Promise.all([
        chatRequestsApi.getPendingRequests(),
        chatRequestsApi.getSentRequests(),
        chatRequestsApi.getContacts(),
      ]);
      
      if (isMountedRef.current) {
        // Check for new received requests
        const isInitialLoad = previousRequestIdsRef.current.size === 0;
        const currentRequestIds = new Set(received.map((r: any) => r.id));
        
        // Find new requests (requests that exist now but didn't exist before)
        const newRequests = received.filter((r: any) => !previousRequestIdsRef.current.has(r.id));
        
        // Notify if:
        // 1. It's the initial load AND there are pending requests (show existing requests on login)
        // 2. OR it's not the initial load AND there are new requests (show new requests after login)
        // 3. AND we have a callback
        if (onNewRequest) {
          if (isInitialLoad && received.length > 0) {
            // On initial load, notify about all existing pending requests
            received.forEach((request: any) => {
              onNewRequest(request);
            });
          } else if (!isInitialLoad && newRequests.length > 0) {
            // After initial load, notify about new requests only
            newRequests.forEach((request: any) => {
              onNewRequest(request);
            });
          }
        }
        
        // Update previous request IDs AFTER checking for new ones
        previousRequestIdsRef.current = currentRequestIds;
        
        setReceivedRequests(received);
        setSentRequests(sent);
        setContacts(contactsData);
        setLoading(false);
      }
    } catch (err: any) {
      console.error("❌ Error fetching chat requests:", err);
      if (isMountedRef.current) {
        setError(err.message || "Failed to load chat requests");
        setLoading(false);
      }
    }
  };

  // Setup polling for real-time updates
  useEffect(() => {
    if (!enabled || !userId) {
      console.log("❌ Polling disabled or no userId:", { enabled, userId });
      return;
    }

    // Mark as mounted
    isMountedRef.current = true;

    // Initial fetch
    fetchAll();

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      fetchAll();
    }, pollInterval);

    return () => {
      console.log("🛑 Cleaning up polling for userId:", userId);
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [userId, enabled, pollInterval]);

  // Manual refresh function
  const refresh = () => {
    fetchAll();
  };

  return {
    receivedRequests,
    sentRequests,
    contacts,
    loading,
    error,
    refresh,
  };
}
