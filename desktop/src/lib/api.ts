// API client for backend communication
// NOTE: VITE_SERVER_URL MUST be set in environment (configured in amplify.yml for production)

// Get SERVER_URL - use production URL as fallback for web builds
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 
  (import.meta.env.MODE === "production" ? "https://summit-api.codingeverest.com" : undefined);

if (!SERVER_URL) {
  console.error("❌ VITE_SERVER_URL is not set and no fallback available! API calls will fail.");
  console.error("Environment mode:", import.meta.env.MODE);
  console.error("VITE_SERVER_URL:", import.meta.env.VITE_SERVER_URL);
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Get auth token from localStorage
export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

// Set auth token in localStorage
export function setAuthToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

// Remove auth token
export function removeAuthToken(): void {
  localStorage.removeItem("auth_token");
}

// Make authenticated API request
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  let response: Response;
  try {
    response = await fetch(`${SERVER_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
  } catch (error: any) {
    // Network error (connection refused, etc.)
    const networkError: any = new Error("Cannot connect to server. Please make sure the backend server is running.");
    networkError.response = { status: 0 };
    networkError.isNetworkError = true;
    throw networkError;
  }

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { error: `Request failed with status ${response.status}` };
    }
    const errorObj: any = new Error(errorData.error || "Request failed");
    errorObj.response = response;
    errorObj.errorData = errorData;
    throw errorObj;
  }

  return response.json();
}

// Auth API
export const authApi = {
  register: async (email: string, password: string, name?: string) => {
    return apiRequest<{ user: any; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  },

  login: async (email: string, password: string) => {
    try {
      return await apiRequest<{ user: any; token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    } catch (error: any) {
      // Preserve status code for error handling
      if (error.response) {
        throw { ...error, response: error.response };
      }
      throw error;
    }
  },

  getMe: async () => {
    return apiRequest<any>("/api/auth/me");
  },
};

// Meetings API
export const meetingsApi = {
  getAll: async () => {
    return apiRequest<any[]>("/api/meetings");
  },

  create: async (meeting: any) => {
    return apiRequest<any>("/api/meetings", {
      method: "POST",
      body: JSON.stringify(meeting),
    });
  },

  getInvitations: async () => {
    return apiRequest<any[]>("/api/meetings/invitations");
  },

  acceptInvitation: async (invitationId: string) => {
    return apiRequest<{ success: boolean }>(`/api/meetings/invitations/${invitationId}/accept`, {
      method: "POST",
    });
  },

  declineInvitation: async (invitationId: string) => {
    return apiRequest<{ success: boolean }>(`/api/meetings/invitations/${invitationId}/decline`, {
      method: "POST",
    });
  },
};

// Users API
export const usersApi = {
  getAll: async () => {
    return apiRequest<any[]>("/api/users");
  },

  searchByEmail: async (email: string) => {
    try {
      return await apiRequest<any>(`/api/users/search?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      // Re-throw with status code for error handling
      if (error.response) {
        throw { ...error, response: error.response };
      }
      throw error;
    }
  },

  getProfile: async (userId: string) => {
    try {
      return await apiRequest<any>(`/api/users/${userId}/profile`);
    } catch (error: any) {
      if (error.response) {
        throw { ...error, response: error.response };
      }
      throw error;
    }
  },

  updateProfile: async (data: { name?: string; job_title?: string; phone?: string; company?: string }) => {
    try {
      return await apiRequest<any>("/api/users/me/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      // Extract error message from response if available
      if (error.response) {
        const errorObj = { ...error, response: error.response };
        // Try to get error message from response body
        if (error.message) {
          errorObj.error = error.message;
        }
        throw errorObj;
      }
      throw error;
    }
  },
};

// Chats API
export const chatsApi = {
  getChats: async () => {
    // Removed verbose logging - only log errors
    try {
      return await apiRequest<any[]>("/api/chats");
    } catch (error: any) {
      console.error("❌ Chats API error:", error);
      throw error;
    }
  },

  getOrCreateDirectChat: async (otherUserId: string) => {
    return apiRequest<any>("/api/chats/direct", {
      method: "POST",
      body: JSON.stringify({ otherUserId }),
    });
  },

  updateLastMessage: async (chatId: string, lastMessage: string) => {
    return apiRequest<{ success: boolean }>(`/api/chats/${chatId}/last-message`, {
      method: "PATCH",
      body: JSON.stringify({ lastMessage }),
    });
  },
};

// Presence API
export const presenceApi = {
  updateStatus: async (status: "online" | "offline" | "away" | "busy" | "dnd") => {
    return apiRequest<{ success: boolean }>("/api/presence", {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  getBatch: async (userIds: string[]) => {
    return apiRequest<any[]>("/api/presence/batch", {
      method: "POST",
      body: JSON.stringify({ userIds }),
    });
  },

  get: async (userId: string) => {
    return apiRequest<any>(`/api/presence/${userId}`);
  },
};

// Messages API
export const messagesApi = {
  // Get message history for a chat
  getMessages: async (chatId: string, limit = 50, before?: string) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) params.append('before', before);
    return apiRequest<any[]>(`/api/messages/${chatId}?${params}`);
  },

  // Save a message to the database
  saveMessage: async (message: {
    id: string;
    chatId: string;
    content: string;
    type?: string;
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
    mimeType?: string;
  }) => {
    return apiRequest<{ success: boolean }>("/api/messages", {
      method: "POST",
      body: JSON.stringify(message),
    });
  },

  // Delete a message (soft delete)
  deleteMessage: async (messageId: string) => {
    return apiRequest<{ success: boolean }>(`/api/messages/${messageId}`, {
      method: "DELETE",
    });
  },

  markAsRead: async (messageIds: string[], chatId?: string) => {
    return apiRequest<{ success: boolean }>("/api/messages/read", {
      method: "POST",
      body: JSON.stringify({ messageIds, chatId }),
    });
  },

  sendTypingIndicator: async (chatId: string, isTyping: boolean) => {
    return apiRequest<{ success: boolean }>("/api/messages/typing", {
      method: "POST",
      body: JSON.stringify({ chatId, isTyping }),
    });
  },

  getReadReceipts: async (messageIds: string[]) => {
    return apiRequest<any[]>("/api/messages/reads", {
      method: "POST",
      body: JSON.stringify({ messageIds }),
    });
  },
};

// Chat Requests API
export const chatRequestsApi = {
  sendRequest: async (requesteeId: string, meetingId?: string, meetingTitle?: string) => {
    try {
      return await apiRequest<any>("/api/chat-requests", {
        method: "POST",
        body: JSON.stringify({ requesteeId, meetingId, meetingTitle }),
      });
    } catch (error: any) {
      if (error.response) {
        throw { ...error, response: error.response };
      }
      throw error;
    }
  },

  getPendingRequests: async () => {
    return apiRequest<any[]>("/api/chat-requests/received");
  },

  getSentRequests: async () => {
    return apiRequest<any[]>("/api/chat-requests/sent");
  },

  acceptRequest: async (requestId: string) => {
    return apiRequest<{ success: boolean }>(`/api/chat-requests/${requestId}/accept`, {
      method: "POST",
    });
  },

  declineRequest: async (requestId: string) => {
    return apiRequest<{ success: boolean }>(`/api/chat-requests/${requestId}/decline`, {
      method: "POST",
    });
  },

  getContacts: async () => {
    return apiRequest<any[]>("/api/chat-requests/contacts");
  },

  checkIsContact: async (userId: string) => {
    return apiRequest<{ isContact: boolean }>(`/api/chat-requests/contacts/check/${userId}`);
  },

  getRequestStatus: async (userId: string) => {
    return apiRequest<{ status: string | null; isContact: boolean; isRequester: boolean; requestId?: string }>(`/api/chat-requests/status/${userId}`);
  },
};

