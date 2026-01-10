import { useState, useEffect, useRef } from "react";
import { chatRequestsApi } from "../lib/api";
import { contactsCache } from "../lib/cache";

interface UseContactsOptions {
  userId: string;
  enabled?: boolean;
  pollInterval?: number; // Polling interval in ms (0 to disable polling)
}

export function useContacts({ 
  userId, 
  enabled = true,
  pollInterval = 15000, // 15 seconds (contacts change less frequently)
}: UseContactsOptions) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const initialLoadDoneRef = useRef(false);

  const fetchContacts = async (showLoading = true, useCache = true) => {
    if (!isMountedRef.current) {
      return;
    }

    // Load from cache immediately if available (instant load)
    if (useCache) {
      const cachedContacts = contactsCache.get(userId);
      if (cachedContacts && cachedContacts.length >= 0) {
        console.log(`✅ Loaded ${cachedContacts.length} contacts from cache`);
        setContacts(cachedContacts);
        if (loading && showLoading) {
          setLoading(false);
        } else if (!loading) {
          setLoading(false); // Already loaded, just ensure it's false
        }
        if (!initialLoadDoneRef.current) {
          initialLoadDoneRef.current = true;
        }
      } else if (showLoading && !initialLoadDoneRef.current) {
        setLoading(true);
      }
    } else if (showLoading && !initialLoadDoneRef.current) {
      setLoading(true);
    }

    try {
      if (!initialLoadDoneRef.current) {
        setError(null);
      }
      // Fetch fresh data in the background
      const contactsData = await chatRequestsApi.getContacts();
      
      if (isMountedRef.current) {
        // Deduplicate contacts by contact_id (safety measure in case backend returns duplicates)
        const uniqueContacts = Array.from(
          new Map(contactsData.map((contact: any) => [contact.contact_id, contact])).values()
        );
        
        // Update cache with fresh data
        contactsCache.set(userId, uniqueContacts);
        console.log(`✅ Fetched ${uniqueContacts.length} fresh contacts from server`);
        
        // Update UI with fresh data
        setContacts(uniqueContacts);
        setLoading(false);
        initialLoadDoneRef.current = true;
      }
    } catch (err: any) {
      console.error("Error fetching contacts:", err);
      if (isMountedRef.current) {
        // On error, keep cached data if available
        const cachedContacts = contactsCache.get(userId);
        if (!cachedContacts || cachedContacts.length === 0) {
          setError(err.message || "Failed to load contacts");
        }
        setLoading(false);
      }
    }
  };

  // Setup polling for real-time updates
  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    isMountedRef.current = true;
    initialLoadDoneRef.current = false;

    // Initial fetch (use cache for instant load, fetch fresh in background)
    fetchContacts(true, true);

    // Set up polling interval (less frequent for contacts)
    if (pollInterval > 0) {
      pollingIntervalRef.current = setInterval(() => {
        fetchContacts(false, true); // Silent update (no loading spinner), use cache first
      }, pollInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [userId, enabled, pollInterval]);

  // Manual refresh function (bypasses cache)
  const refresh = () => {
    fetchContacts(true, false);
  };

  return {
    contacts,
    loading,
    error,
    refresh,
  };
}

