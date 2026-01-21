// Cache utility for storing chats and messages in localStorage
// Provides instant loading while fetching fresh data in the background

const CACHE_VERSION = "1";
const CACHE_PREFIX = "chat_cache_v" + CACHE_VERSION;

// Cache keys
const CHATS_CACHE_KEY = `${CACHE_PREFIX}_chats`;
const MESSAGES_CACHE_PREFIX = `${CACHE_PREFIX}_messages_`;
const CONTACTS_CACHE_KEY = `${CACHE_PREFIX}_contacts`;
const USERS_CACHE_KEY = `${CACHE_PREFIX}_users`;
const CACHE_TIMESTAMP_PREFIX = `${CACHE_PREFIX}_timestamp_`;
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Get cached data with expiry check
function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error("Error reading cache:", error);
    return null;
  }
}

// Set cached data with timestamp
function setCachedData<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error("Error writing cache:", error);
    // If localStorage is full, try to clear old cache
    if (error instanceof DOMException && error.code === 22) {
      clearExpiredCache();
      try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
      } catch (e) {
        console.error("Failed to write cache after cleanup:", e);
      }
    }
  }
}

// Clear expired cache entries
function clearExpiredCache(): void {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry = JSON.parse(cached);
            if (entry.timestamp && now - entry.timestamp > CACHE_EXPIRY_MS) {
              keysToRemove.push(key);
            }
          }
        } catch (e) {
          // Invalid entry, remove it
          if (key) keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    if (keysToRemove.length > 0) {
      console.log(`🧹 Cleaned up ${keysToRemove.length} expired cache entries`);
    }
  } catch (error) {
    console.error("Error clearing expired cache:", error);
  }
}

// Chat cache operations
export const chatCache = {
  // Get cached chats for a user
  get(userId: string): any[] | null {
    const key = `${CHATS_CACHE_KEY}_${userId}`;
    return getCachedData<any[]>(key);
  },

  // Set cached chats for a user
  set(userId: string, chats: any[]): void {
    const key = `${CHATS_CACHE_KEY}_${userId}`;
    setCachedData(key, chats);
  },

  // Update a single chat in cache
  updateChat(userId: string, updatedChat: any): void {
    const cached = chatCache.get(userId);
    if (cached) {
      const index = cached.findIndex((c) => c.id === updatedChat.id || c.dbId === updatedChat.dbId || c.dbId === updatedChat.id);
      if (index >= 0) {
        cached[index] = { ...cached[index], ...updatedChat };
      } else {
        cached.push(updatedChat);
      }
      chatCache.set(userId, cached);
    }
  },

  // Add a new chat to cache
  addChat(userId: string, newChat: any): void {
    const cached = chatCache.get(userId) || [];
    // Check if chat already exists
    const exists = cached.some((c) => c.id === newChat.id || c.dbId === newChat.dbId || c.dbId === newChat.id);
    if (!exists) {
      cached.push(newChat);
      chatCache.set(userId, cached);
    }
  },

  // Clear all chat cache for a user
  clear(userId: string): void {
    const key = `${CHATS_CACHE_KEY}_${userId}`;
    localStorage.removeItem(key);
  },
};

// Message cache operations - supports both frontend chatId and database ID
export const messageCache = {
  // Get cached messages for a chat (tries both frontend chatId and database ID)
  get(chatId: string, dbChatId?: string): any[] | null {
    // Try database ID first (more reliable)
    if (dbChatId) {
      const dbKey = `${MESSAGES_CACHE_PREFIX}db_${dbChatId}`;
      const dbCached = getCachedData<any[]>(dbKey);
      if (dbCached) return dbCached;
    }
    
    // Fallback to frontend chatId
    const key = `${MESSAGES_CACHE_PREFIX}${chatId}`;
    return getCachedData<any[]>(key);
  },

  // Set cached messages for a chat (stores under both keys for instant lookup)
  set(chatId: string, messages: any[], dbChatId?: string): void {
    // Limit to last 100 messages to prevent localStorage bloat
    const limitedMessages = messages.slice(-100);
    
    // Store under frontend chatId for instant lookup
    const key = `${MESSAGES_CACHE_PREFIX}${chatId}`;
    setCachedData(key, limitedMessages);
    
    // Also store under database ID for reliable lookup
    if (dbChatId) {
      const dbKey = `${MESSAGES_CACHE_PREFIX}db_${dbChatId}`;
      setCachedData(dbKey, limitedMessages);
    }
  },

  // Link frontend chatId to database ID (useful when we discover the mapping)
  linkChatId(chatId: string, dbChatId: string): void {
    // Copy messages from frontend chatId cache to database ID cache if needed
    const frontendKey = `${MESSAGES_CACHE_PREFIX}${chatId}`;
    const frontendCached = getCachedData<any[]>(frontendKey);
    if (frontendCached) {
      const dbKey = `${MESSAGES_CACHE_PREFIX}db_${dbChatId}`;
      setCachedData(dbKey, frontendCached);
    }
  },

  // Add a new message to cache
  addMessage(chatId: string, message: any, dbChatId?: string): void {
    const cached = messageCache.get(chatId, dbChatId) || [];
    // Check if message already exists
    const exists = cached.some((m) => m.id === message.id);
    if (!exists) {
      cached.push(message);
      // Keep only last 100 messages
      const limited = cached.slice(-100);
      messageCache.set(chatId, limited, dbChatId);
    } else {
      // Update existing message (e.g., status change)
      const index = cached.findIndex((m) => m.id === message.id);
      if (index >= 0) {
        cached[index] = { ...cached[index], ...message };
        messageCache.set(chatId, cached, dbChatId);
      }
    }
  },

  // Update message status (e.g., sending -> sent)
  updateMessageStatus(chatId: string, messageId: string, status: string, dbChatId?: string): void {
    const cached = messageCache.get(chatId, dbChatId);
    if (cached) {
      const index = cached.findIndex((m) => m.id === messageId);
      if (index >= 0) {
        cached[index].status = status;
        messageCache.set(chatId, cached, dbChatId);
      }
    }
  },

  // Prepend older messages (for pagination)
  prependMessages(chatId: string, olderMessages: any[], dbChatId?: string): void {
    const cached = messageCache.get(chatId, dbChatId) || [];
    // Remove duplicates and merge
    const messageIds = new Set(cached.map((m) => m.id));
    const newMessages = olderMessages.filter((m) => !messageIds.has(m.id));
    const merged = [...newMessages, ...cached];
    // Keep only last 100 messages
    const limited = merged.slice(-100);
    messageCache.set(chatId, limited, dbChatId);
  },

  // Clear messages cache for a chat
  clear(chatId: string, dbChatId?: string): void {
    const key = `${MESSAGES_CACHE_PREFIX}${chatId}`;
    localStorage.removeItem(key);
    if (dbChatId) {
      const dbKey = `${MESSAGES_CACHE_PREFIX}db_${dbChatId}`;
      localStorage.removeItem(dbKey);
    }
  },

  // Clear all message caches
  clearAll(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(MESSAGES_CACHE_PREFIX)) {
        if (key) keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  },
};

// Contacts cache operations
export const contactsCache = {
  // Get cached contacts for a user
  get(userId: string): any[] | null {
    const key = `${CONTACTS_CACHE_KEY}_${userId}`;
    return getCachedData<any[]>(key);
  },

  // Set cached contacts for a user
  set(userId: string, contacts: any[]): void {
    const key = `${CONTACTS_CACHE_KEY}_${userId}`;
    setCachedData(key, contacts);
  },

  // Add a contact to cache
  addContact(userId: string, contact: any): void {
    const cached = contactsCache.get(userId) || [];
    // Check if contact already exists
    const exists = cached.some((c) => c.contact_id === contact.contact_id || c.id === contact.id);
    if (!exists) {
      cached.push(contact);
      contactsCache.set(userId, cached);
    } else {
      // Update existing contact
      const index = cached.findIndex((c) => c.contact_id === contact.contact_id || c.id === contact.id);
      if (index >= 0) {
        cached[index] = { ...cached[index], ...contact };
        contactsCache.set(userId, cached);
      }
    }
  },

  // Remove a contact from cache
  removeContact(userId: string, contactId: string): void {
    const cached = contactsCache.get(userId);
    if (cached) {
      const filtered = cached.filter((c) => c.contact_id !== contactId && c.id !== contactId);
      contactsCache.set(userId, filtered);
    }
  },

  // Clear contacts cache for a user
  clear(userId: string): void {
    const key = `${CONTACTS_CACHE_KEY}_${userId}`;
    localStorage.removeItem(key);
  },
};

// Clear all cache (useful for logout or cache invalidation)
export function clearAllCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      if (key) keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  console.log("🧹 Cleared all cache");
}

// User cache operations - cache user names to avoid "Unknown" display
export const userCache = {
  // Get cached user info
  get(userId: string): { id: string; name: string; email?: string } | null {
    const key = `${USERS_CACHE_KEY}_${userId}`;
    return getCachedData<{ id: string; name: string; email?: string }>(key);
  },

  // Set cached user info
  set(userId: string, userInfo: { id: string; name: string; email?: string }): void {
    const key = `${USERS_CACHE_KEY}_${userId}`;
    setCachedData(key, userInfo);
  },

  // Get user name (returns cached name or null)
  getName(userId: string): string | null {
    const user = userCache.get(userId);
    return user?.name || null;
  },

  // Clear user cache
  clear(userId: string): void {
    const key = `${USERS_CACHE_KEY}_${userId}`;
    localStorage.removeItem(key);
  },
};

// Initialize: clear expired cache on load
if (typeof window !== "undefined") {
  clearExpiredCache();
  // Clear expired cache every 10 minutes
  setInterval(clearExpiredCache, 10 * 60 * 1000);
}

