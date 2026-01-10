import { useState, useEffect } from "react";
import { X, Users, User, Search, Check, UserPlus } from "lucide-react";
import { usersApi, chatRequestsApi } from "../../lib/api";
import NotificationToast from "../NotificationToast";
import { SkeletonContactItem, Skeleton } from "../ui/Skeleton";
import { contactsCache } from "../../lib/cache";

interface CreateChatModalProps {
  onClose: () => void;
  onCreateChat: (name: string, type: "direct" | "group", userIds: string[]) => void;
  currentUserId: string;
}

export default function CreateChatModal({
  onClose,
  onCreateChat,
  currentUserId,
}: CreateChatModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"direct" | "group">("direct");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [contactStatus, setContactStatus] = useState<Record<string, boolean>>({});
  const [requestStatus, setRequestStatus] = useState<Record<string, { status: string; isRequester: boolean }>>({});
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadUsers();
    loadContacts();
  }, []);

  // Refresh request status when search result changes
  useEffect(() => {
    if (searchResult?.id) {
      const checkStatus = async () => {
        try {
          const status = await chatRequestsApi.getRequestStatus(searchResult.id);
          if (status.status) {
            setRequestStatus((prev) => ({
              ...prev,
              [searchResult.id]: { status: status.status!, isRequester: status.isRequester },
            }));
          } else {
            // Clear status if no request exists
            setRequestStatus((prev) => {
              const updated = { ...prev };
              delete updated[searchResult.id];
              return updated;
            });
          }
        } catch (err) {
          console.error("Error checking request status:", err);
        }
      };
      checkStatus();
    }
  }, [searchResult?.id]);

  const loadUsers = async () => {
    try {
      const users = await usersApi.getAll();
      setAvailableUsers(users);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async (useCache = true) => {
    // Load from cache immediately for instant display
    if (useCache) {
      const cachedContacts = contactsCache.get(currentUserId);
      if (cachedContacts && cachedContacts.length >= 0) {
        console.log(`✅ Loaded ${cachedContacts.length} contacts from cache in modal`);
        setContacts(cachedContacts);
        
        // Create a map of contact IDs for quick lookup
        const contactMap: Record<string, boolean> = {};
        cachedContacts.forEach((contact: any) => {
          contactMap[contact.contact_id] = true;
        });
        setContactStatus(contactMap);
      }
    }

    // Fetch fresh data in the background
    try {
      const contactsData = await chatRequestsApi.getContacts();
      
      // Update cache with fresh data
      contactsCache.set(currentUserId, contactsData);
      console.log(`✅ Fetched ${contactsData.length} fresh contacts in modal`);
      
      setContacts(contactsData);
      
      // Create a map of contact IDs for quick lookup
      const contactMap: Record<string, boolean> = {};
      contactsData.forEach((contact: any) => {
        contactMap[contact.contact_id] = true;
      });
      setContactStatus(contactMap);
    } catch (error) {
      console.error("Error loading contacts:", error);
      // On error, if we have cached data, keep it
      const cachedContacts = contactsCache.get(currentUserId);
      if (!cachedContacts || cachedContacts.length === 0) {
        setContacts([]);
        setContactStatus({});
      }
    }
  };

  // Check if search query looks like an email
  const isEmailQuery = (query: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim());
  };

  // Search user by email when query looks like an email
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    
    // If no query or not a valid email, clear results immediately
    if (!trimmedQuery || !isEmailQuery(trimmedQuery)) {
      setSearchResult(null);
      setSearchError(null);
      setSearching(false);
      return;
    }

    // For complete emails, search immediately (no debounce)
    const searchByEmail = async () => {
      setSearching(true);
      setSearchError(null);
      
      try {
        const user = await usersApi.searchByEmail(trimmedQuery);
        setSearchResult(user);
        // If user found and not already in availableUsers, add them
        if (!availableUsers.find(u => u.id === user.id)) {
          setAvailableUsers(prev => [...prev, user]);
        }
        
        // Check request status for this user (non-blocking - don't wait for it)
        chatRequestsApi.getRequestStatus(user.id).then((status) => {
          if (status.status) {
            setRequestStatus((prev) => ({
              ...prev,
              [user.id]: { status: status.status!, isRequester: status.isRequester },
            }));
          } else {
            setRequestStatus((prev) => {
              const updated = { ...prev };
              delete updated[user.id];
              return updated;
            });
          }
        }).catch(() => {
          // Silently handle status check errors
        });
      } catch (error: any) {
        console.error("Search error:", error);
        const statusCode = error.response?.status;
        const errorMessage = error.errorData?.error || error.message || error.error;
        
        if (statusCode === 404) {
          setSearchError(errorMessage || "No user found with this email address");
        } else if (statusCode === 400) {
          setSearchError(errorMessage || "Invalid email address");
        } else {
          setSearchError(errorMessage || "Error searching for user. Please try again.");
        }
        setSearchResult(null);
      } finally {
        setSearching(false);
      }
    };

    // Search immediately for complete emails - no debounce!
    searchByEmail();
  }, [searchQuery]);

  // Only show results when exact email is entered and matched
  // No partial matching - only exact email results
  const filteredUsers: any[] = [];

  const toggleUserSelection = (userId: string) => {
    if (type === "direct") {
      // For direct chats, only one user can be selected
      setSelectedUserIds([userId]);
      const selectedUser = availableUsers.find((u) => u.id === userId);
      if (selectedUser) {
        setName(selectedUser.name || selectedUser.email);
      }
    } else {
      // For group chats, multiple users can be selected
      setSelectedUserIds((prev) =>
        prev.includes(userId)
          ? prev.filter((id) => id !== userId)
          : [...prev, userId]
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === "direct") {
      // For direct chats, send a chat request
      if (selectedUserIds.length === 0 || !searchResult) {
        return;
      }

      const selectedUserId = selectedUserIds[0];
      
      // Check if already a contact
      if (contactStatus[selectedUserId]) {
        // Already a contact, create chat directly
        const chatName = name.trim() || searchResult.name || searchResult.email;
        onCreateChat(chatName, type, [selectedUserId]);
        onClose();
        return;
      }

      // Send chat request
      setSendingRequest(true);
      try {
        await chatRequestsApi.sendRequest(selectedUserId);
        
        // Update request status to pending
        setRequestStatus((prev) => ({
          ...prev,
          [selectedUserId]: { status: "pending", isRequester: true },
        }));
        
        setNotification({
          message: "Chat request sent! You'll be able to chat once they accept.",
          type: "success",
        });
        // Close modal after a short delay to show the notification
        setTimeout(() => {
          onClose();
        }, 500);
      } catch (error: any) {
        console.error("Error sending chat request:", error);
        let errorMessage = "Failed to send chat request";
        
        // Try to extract error message from various possible locations
        if (error.errorData?.error) {
          errorMessage = error.errorData.error;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.error) {
          errorMessage = error.error;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        // Check if it's a 400 error with specific messages
        if (error.response?.status === 400) {
          if (errorMessage.includes("already contacts") || errorMessage.includes("Users are already contacts")) {
            // If they're already contacts, create chat
            const chatName = name.trim() || searchResult.name || searchResult.email;
            onCreateChat(chatName, type, [selectedUserId]);
            onClose();
            return;
          }
          
          if (errorMessage.includes("Chat request already exists")) {
            errorMessage = "A chat request has already been sent to this user.";
          }
        }
        
        setNotification({
          message: errorMessage,
          type: "error",
        });
      } finally {
        setSendingRequest(false);
      }
    } else {
      // For group chats, only allow contacts
      if (selectedUserIds.length > 0) {
        const chatName = name.trim() || `Group Chat (${selectedUserIds.length})`;
        onCreateChat(chatName, type, selectedUserIds);
        onClose();
      }
    }
  };

  const handleTypeChange = (newType: "direct" | "group") => {
    setType(newType);
    setSelectedUserIds([]);
    setName("");
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-200 animate-in slide-in-from-bottom-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Create Chat</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleTypeChange("direct")}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    type === "direct"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <User className={`w-6 h-6 mx-auto mb-2 ${
                    type === "direct" ? "text-blue-600" : "text-gray-400"
                  }`} />
                  <div className={`font-medium ${
                    type === "direct" ? "text-blue-600" : "text-gray-600"
                  }`}>
                    Direct
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("group")}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    type === "group"
                      ? "border-sky-500 bg-sky-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Users className={`w-6 h-6 mx-auto mb-2 ${
                    type === "group" ? "text-sky-600" : "text-gray-400"
                  }`} />
                  <div className={`font-medium ${
                    type === "group" ? "text-sky-600" : "text-gray-600"
                  }`}>
                    Group
                  </div>
                </button>
              </div>
            </div>

            {type === "group" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter group name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {type === "direct" ? "Search User by Email" : "Select Contacts"}
              </label>
              {type === "group" && (
                <>
                <p className="text-xs text-gray-500 mb-2">
                  Group chats can only be created with your contacts
                </p>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                      placeholder="Search contacts by name, email, or company..."
                    />
                  </div>
                </>
              )}
              {type === "direct" ? (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter email address (e.g., user@example.com)"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {loading ? (
                      <div className="p-4 space-y-0">
                        <SkeletonContactItem />
                        <SkeletonContactItem />
                        <SkeletonContactItem />
                      </div>
                    ) : !searchQuery.trim() ? (
                      <div className="p-8 text-center text-gray-500">
                        Enter a complete email address to search
                      </div>
                    ) : isEmailQuery(searchQuery.trim()) ? (
                  // Email search mode
                  <div>
                    {searching ? (
                      <div className="p-4">
                        <SkeletonContactItem />
                      </div>
                    ) : searchError ? (
                      <div className="p-8 text-center">
                        <div className="text-red-500 mb-2">⚠️</div>
                        <p className="text-sm font-medium text-gray-700 mb-1">{searchError}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {searchError.includes("No user found") 
                            ? "Make sure the email address is correct and the user is registered."
                            : "Please check the email format and try again."}
                        </p>
                      </div>
                    ) : searchResult ? (
                      // Show found user
                      <div className="p-4">
                        <div className={`p-4 rounded-xl border-2 ${
                          selectedUserIds.includes(searchResult.id) 
                            ? "border-blue-500 bg-blue-50" 
                            : "border-gray-200 bg-white"
                        }`}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-sky-600 rounded-full flex items-center justify-center flex-shrink-0">
                              {searchResult.avatar_url ? (
                                <img
                                  src={searchResult.avatar_url}
                                  alt={searchResult.name || searchResult.email}
                                  className="w-12 h-12 rounded-full"
                                />
                              ) : (
                                <User className="w-6 h-6 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {searchResult.name || searchResult.email}
                              </div>
                              {searchResult.name && (
                                <div className="text-sm text-gray-500 truncate">
                                  {searchResult.email}
                                </div>
                              )}
                              {searchResult.company && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {searchResult.company}
                                </div>
                              )}
                            </div>
                            {contactStatus[searchResult.id] && (
                              <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-lg">
                                Contact
                              </span>
                            )}
                          </div>
                          {!contactStatus[searchResult.id] && (
                            <p className="text-xs text-gray-500 mb-3">
                              This user is not in your contacts. A chat request will be sent.
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleUserSelection(searchResult.id)}
                            className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                              selectedUserIds.includes(searchResult.id)
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {selectedUserIds.includes(searchResult.id) && (
                              <Check className="w-4 h-4" />
                            )}
                            {selectedUserIds.includes(searchResult.id) ? "Selected" : "Select"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      Enter a complete email address to search. Partial matches are not shown.
                    </div>
                  )}
                  </div>
                </>
              ) : (
                // Group chat - show contacts only with search
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {loading ? (
                    <div className="p-4 space-y-0">
                      <SkeletonContactItem />
                      <SkeletonContactItem />
                      <SkeletonContactItem />
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No contacts yet</p>
                      <p className="text-sm mt-2">Accept chat requests to add contacts</p>
                    </div>
                  ) : (() => {
                    const filteredContacts = contacts.filter((contact) => {
                        if (!searchQuery.trim()) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          contact.contact_name?.toLowerCase().includes(query) ||
                          contact.contact_email?.toLowerCase().includes(query) ||
                          contact.contact_company?.toLowerCase().includes(query)
                        );
                    });
                    
                    if (filteredContacts.length === 0) {
                      return (
                        <div className="p-8 text-center text-gray-500">
                          <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-medium">No contacts found</p>
                          <p className="text-sm mt-2">Try a different search term</p>
                        </div>
                      );
                    }
                    
                    return filteredContacts.map((contact) => (
                        <button
                          key={contact.contact_id}
                          type="button"
                          onClick={() => toggleUserSelection(contact.contact_id)}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                            selectedUserIds.includes(contact.contact_id) ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-500 rounded-full flex items-center justify-center flex-shrink-0">
                            {contact.contact_avatar_url ? (
                              <img
                                src={contact.contact_avatar_url}
                                alt={contact.contact_name || contact.contact_email}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <Users className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {contact.contact_name || contact.contact_email}
                            </div>
                            {contact.contact_name && (
                              <div className="text-sm text-gray-500 truncate">
                                {contact.contact_email}
                              </div>
                            )}
                            {contact.contact_company && (
                              <div className="text-xs text-gray-400 mt-1 truncate">
                                {contact.contact_company}
                              </div>
                            )}
                          </div>
                          {selectedUserIds.includes(contact.contact_id) && (
                            <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          )}
                        </button>
                      ));
                  })()}
                </div>
              )}
              {selectedUserIds.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  {selectedUserIds.length} user{selectedUserIds.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  selectedUserIds.length === 0 || 
                  sendingRequest || 
                  (type === "direct" && searchResult && !contactStatus[searchResult.id] && requestStatus[searchResult.id]?.status === "pending" && requestStatus[searchResult.id].isRequester)
                }
                className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingRequest ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : type === "direct" && searchResult && !contactStatus[searchResult.id] ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    {requestStatus[searchResult.id]?.status === "pending" ? (
                      requestStatus[searchResult.id].isRequester ? "Request Sent" : "Pending"
                    ) : (
                      "Send Chat Request"
                    )}
                  </>
                ) : (
                  "Create"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          duration={4000}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  );
}
