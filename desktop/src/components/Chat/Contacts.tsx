import { useState, useMemo } from "react";
import { Users, Search, MessageSquare, Info } from "lucide-react";
import { useContacts } from "../../hooks/useContacts";
import UserProfilePopup from "./UserProfilePopup";
import { SkeletonContactItem } from "../ui/Skeleton";

interface ContactsProps {
  currentUserId: string;
  onStartChat?: (userId: string, contactName?: string) => void;
  onNewRequest?: (request: any) => void;
}

export default function Contacts({
  currentUserId,
  onStartChat,
  onNewRequest,
}: ContactsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  
  // Use dedicated contacts hook for better performance
  // Note: Contacts are preloaded in Dashboard, so this will use cached data if available
  const { 
    contacts, 
    loading, 
    refresh 
  } = useContacts({ 
    userId: currentUserId, 
    enabled: true,
    pollInterval: 10000 // Poll every 10 seconds (contacts change less frequently)
  });

  // Memoize filtered contacts for performance
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter((contact) => {
      return (
        contact.contact_name?.toLowerCase().includes(query) ||
        contact.contact_email?.toLowerCase().includes(query) ||
        contact.contact_company?.toLowerCase().includes(query)
      );
    });
  }, [contacts, searchQuery]);

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Search Skeleton */}
        <div className="p-4 border-b border-gray-200">
          <div className="h-10 w-full bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
        {/* Skeleton Contact Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          <SkeletonContactItem />
          <SkeletonContactItem />
          <SkeletonContactItem />
          <SkeletonContactItem />
          <SkeletonContactItem />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-white">
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">
              {searchQuery ? "No contacts found" : "No contacts yet"}
            </p>
            <p className="text-sm mt-2">
              {searchQuery
                ? "Try a different search term"
                : "Accepted chat requests will appear here"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredContacts.map((contact) => (
              <div
                key={contact.contact_id}
                className="w-full px-4 py-4 hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-sky-600 rounded-full flex items-center justify-center flex-shrink-0">
                  {contact.contact_avatar_url ? (
                    <img
                      src={contact.contact_avatar_url}
                      alt={contact.contact_name || contact.contact_email}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <Users className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {contact.contact_name || contact.contact_email}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {contact.contact_email}
                  </p>
                  {contact.contact_company && (
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {contact.contact_company}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProfile(contact.contact_id);
                    }}
                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-gray-500 hover:text-blue-600"
                    title="View profile"
                  >
                    <Info className="w-5 h-5" />
                  </button>
                  {onStartChat && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartChat(contact.contact_id, contact.contact_name || contact.contact_email);
                      }}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 hover:text-blue-700"
                      title="Start chat"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Profile Popup */}
      {selectedProfile && (
        <UserProfilePopup
          userId={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </>
  );
}
