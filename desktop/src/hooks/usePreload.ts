import { useEffect, useRef } from "react";
import { chatsApi, chatRequestsApi } from "../lib/api";

interface PreloadOptions {
  userId: string | null;
  enabled: boolean;
}

/**
 * Preload hook that silently initializes all app resources in the background
 * This runs during splash screen so everything is ready when user opens the app
 */
export function usePreload({ userId, enabled }: PreloadOptions) {
  const preloadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !userId || preloadedRef.current) {
      return;
    }

    preloadedRef.current = true;

    // Silently preload everything in parallel
    const preloadAll = async () => {
      try {
                // Preload contacts (cache will be used by useContacts hook)
                chatRequestsApi.getContacts().catch(() => {});

                // Don't preload chats here - ChatList will load them on mount
                // This prevents duplicate API calls

                // Preload chat requests
                chatRequestsApi.getPendingRequests().catch(() => {});
                chatRequestsApi.getSentRequests().catch(() => {});

        // Note: LiveKit connection will be established when user opens a chat
        // Connection is fast (~500ms), so no need to pre-connect
      } catch (error) {
        // Silently fail - don't block app startup
      }
    };

    preloadAll();
  }, [userId, enabled]);
}

