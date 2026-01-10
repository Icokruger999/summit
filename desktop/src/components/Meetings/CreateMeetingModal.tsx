import { useState, useEffect } from "react";
import { meetingsApi, chatRequestsApi } from "../../lib/api";
import { X, Users, Repeat, Calendar, Clock, Search, CheckCircle, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { contactsCache } from "../../lib/cache";

interface CreateMeetingModalProps {
  userId: string;
  initialDate?: Date;
  onClose: () => void;
  onSuccess: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

export default function CreateMeetingModal({
  userId,
  initialDate,
  onClose,
  onSuccess,
}: CreateMeetingModalProps) {
  // Format date for datetime-local input: YYYY-MM-DDTHH:mm
  const getInitialStartTime = () => {
    if (initialDate) {
      const date = new Date(initialDate);
      // Set to 9 AM by default
      date.setHours(9, 0, 0, 0);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    }
    return "";
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState(getInitialStartTime());
  const [endTime, setEndTime] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [searchingParticipant, setSearchingParticipant] = useState(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactStatus, setContactStatus] = useState<Record<string, boolean>>({});

  // Load available users for invitation
  useEffect(() => {
    loadAvailableUsers();
    loadContacts();
  }, []);

  const loadContacts = async (useCache = true) => {
    // Load from cache immediately for instant display
    if (useCache) {
      const cachedContacts = contactsCache.get(userId);
      if (cachedContacts && cachedContacts.length >= 0) {
        console.log(`✅ Loaded ${cachedContacts.length} contacts from cache in meeting modal`);
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
      contactsCache.set(userId, contactsData);
      console.log(`✅ Fetched ${contactsData.length} fresh contacts in meeting modal`);
      
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
      const cachedContacts = contactsCache.get(userId);
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
    const searchByEmail = async () => {
      const trimmedQuery = participantSearch.trim();
      
      if (!trimmedQuery || !isEmailQuery(trimmedQuery)) {
        setSearchResult(null);
        setSearchError(null);
        return;
      }

      setSearchingParticipant(true);
      setSearchError(null);
      
      try {
        const { usersApi } = await import("../../lib/api");
        const user = await usersApi.searchByEmail(trimmedQuery);
        setSearchResult(user);
        // If user found and not already in availableUsers, add them
        if (!availableUsers.find(u => u.id === user.id)) {
          setAvailableUsers(prev => [...prev, user]);
        }
      } catch (error: any) {
        const statusCode = error.response?.status;
        if (statusCode === 404) {
          setSearchError("No user found with this email address");
        } else {
          setSearchError("Error searching for user. Please try again.");
        }
        setSearchResult(null);
      } finally {
        setSearchingParticipant(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(searchByEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [participantSearch]);

  // Update start time when initialDate changes
  useEffect(() => {
    if (initialDate) {
      const date = new Date(initialDate);
      date.setHours(9, 0, 0, 0);
      setStartTime(format(date, "yyyy-MM-dd'T'HH:mm"));
    }
  }, [initialDate]);

  const loadAvailableUsers = async () => {
    try {
      const { usersApi } = await import("../../lib/api");
      const users = await usersApi.getAll();
      setAvailableUsers(users);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const toggleRepeatDay = (day: number) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const meetingData: any = {
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        participant_ids: selectedParticipants,
      };

      // Add recurrence if enabled
      if (isRepeating && repeatDays.length > 0) {
        meetingData.recurrence = {
          enabled: true,
          days_of_week: repeatDays.sort(),
        };
      }

      await meetingsApi.create(meetingData);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating meeting:", error);
      alert(`Failed to create meeting: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border border-gray-200 animate-in slide-in-from-bottom-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Schedule Meeting</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Meeting title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Meeting description (optional)"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Participants */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Invite Participants
              </label>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Search by email (e.g., user@example.com) or name..."
                />
              </div>
              <div className="border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto">
                {isEmailQuery(participantSearch.trim()) ? (
                  // Email search mode
                  <div>
                    {searchingParticipant ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-xs">Searching...</p>
                      </div>
                    ) : searchError ? (
                      <div className="p-4 text-center">
                        <div className="text-red-500 mb-1">⚠️</div>
                        <p className="text-xs text-gray-600">{searchError}</p>
                      </div>
                    ) : searchResult ? (
                      // Show found user
                      <div className={`p-3 rounded-lg border-2 ${
                        contactStatus[searchResult.id] 
                          ? "border-green-200 bg-green-50" 
                          : "border-blue-200 bg-blue-50"
                      }`}>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedParticipants.includes(searchResult.id)}
                            onChange={() => toggleParticipant(searchResult.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {searchResult.name || searchResult.email}
                            </p>
                            {searchResult.name && (
                              <p className="text-xs text-gray-500">{searchResult.email}</p>
                            )}
                            {searchResult.company && (
                              <p className="text-xs text-gray-400 mt-1">{searchResult.company}</p>
                            )}
                          </div>
                          {contactStatus[searchResult.id] ? (
                            <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-lg flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Contact
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg flex items-center gap-1">
                              <UserPlus className="w-3 h-3" />
                              Will send chat request
                            </span>
                          )}
                        </label>
                        {!contactStatus[searchResult.id] && (
                          <p className="text-xs text-blue-600 mt-2 ml-7">
                            A chat request will be sent along with the meeting invitation
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : availableUsers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">
                    No users available
                  </p>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-400">
                      {!participantSearch.trim() 
                        ? "Enter a complete email address to search (e.g., user@example.com)"
                        : "Enter a complete email address to search. Partial matches are not shown."}
                    </p>
                  </div>
                )}
              </div>
              {selectedParticipants.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800 font-medium mb-2">
                    {selectedParticipants.length} participant(s) selected
                  </p>
                  {selectedParticipants.some(id => !contactStatus[id]) && (
                    <p className="text-xs text-blue-700">
                      A chat request will be sent to non-contacts along with the meeting invitation
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Repeat Meeting */}
            <div>
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRepeating}
                  onChange={(e) => setIsRepeating(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 flex-1">
                  <Repeat className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-gray-900">Repeat Meeting</span>
                </div>
              </label>

              {/* Repeat Days Dropdown */}
              {isRepeating && (
                <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in slide-in-from-top">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Repeat on:
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleRepeatDay(day.value)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                          repeatDays.includes(day.value)
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                  {repeatDays.length > 0 && (
                    <p className="text-xs text-gray-500 mt-3">
                      Meeting will repeat every{" "}
                      {repeatDays
                        .sort()
                        .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label)
                        .join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (isRepeating && repeatDays.length === 0)}
                className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Meeting"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

