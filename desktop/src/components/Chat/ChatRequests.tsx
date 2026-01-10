import { useState } from "react";
import { UserPlus, Check, X, Calendar, Eye, Send, Inbox } from "lucide-react";
import { chatRequestsApi } from "../../lib/api";
import UserProfilePopup from "./UserProfilePopup";
import { useChatRequests } from "../../hooks/useChatRequests";
import { SkeletonRequestItem } from "../ui/Skeleton";

interface ChatRequestsProps {
  currentUserId: string;
  onRequestAccepted?: () => void;
  onNewRequest?: (request: any) => void;
}

export default function ChatRequests({
  currentUserId,
  onRequestAccepted,
  onNewRequest,
}: ChatRequestsProps) {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);

  // Use real-time hook for automatic updates
  const { 
    receivedRequests: pendingRequests, 
    sentRequests,
    loading, 
    refresh 
  } = useChatRequests({ 
    userId: currentUserId, 
    enabled: true,
    onNewRequest: onNewRequest
  });

  const handleAccept = async (requestId: string) => {
    try {
      await chatRequestsApi.acceptRequest(requestId);
      refresh();
      if (onRequestAccepted) {
        onRequestAccepted();
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Failed to accept request. Please try again.");
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await chatRequestsApi.declineRequest(requestId);
      refresh();
    } catch (error) {
      console.error("Error declining request:", error);
      alert("Failed to decline request. Please try again.");
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await chatRequestsApi.declineRequest(requestId);
      refresh();
    } catch (error) {
      console.error("Error canceling request:", error);
      alert("Failed to cancel request. Please try again.");
    }
  };

  const handleSeeMore = (request: any) => {
    setProfileData({
      name: request.requester_name || request.requestee_name,
      email: request.requester_email || request.requestee_email,
      company: request.requester_company || request.requestee_company,
      avatar_url: request.requester_avatar_url || request.requestee_avatar_url,
    });
    setSelectedProfile(request.requester_id || request.requestee_id);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header Skeleton */}
        <div className="p-4 border-b border-gray-200">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
        </div>
        {/* Content Skeleton */}
        <div className="flex-1 overflow-y-auto">
          {/* Received Requests Section Skeleton */}
          <div className="border-b border-gray-200 pb-4">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="h-5 w-36 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="px-4 pt-3 space-y-3">
              <SkeletonRequestItem />
              <SkeletonRequestItem />
            </div>
          </div>
          {/* Sent Requests Section Skeleton */}
          <div className="pt-4">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="px-4 pt-3 space-y-3">
              <SkeletonRequestItem />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Chat Requests</h2>
          <p className="text-sm text-gray-500 mt-1">Pending requests</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Received Requests Section */}
          <div className="border-b border-gray-200 pb-4">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-700">Received Requests</h3>
                {pendingRequests.length > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-medium text-white bg-red-500 rounded-full">
                    {pendingRequests.length}
                  </span>
                )}
              </div>
            </div>
            <div className="px-4 pt-3 space-y-3">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Inbox className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No received requests</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`p-4 rounded-xl border-2 ${
                      request.meeting_id
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-sky-600 rounded-full flex items-center justify-center flex-shrink-0">
                        {request.requester_avatar_url ? (
                          <img
                            src={request.requester_avatar_url}
                            alt={request.requester_name || request.requester_email}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <UserPlus className="w-6 h-6 text-white" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {request.requester_name || request.requester_email}
                            </h3>
                            <p className="text-sm text-gray-500 truncate">
                              {request.requester_email}
                            </p>
                            {request.requester_company && (
                              <p className="text-xs text-gray-400 mt-1">
                                {request.requester_company}
                              </p>
                            )}
                          </div>
                          {request.meeting_id && (
                            <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          )}
                        </div>

                        {/* Meeting Info */}
                        {request.meeting_id && request.meeting_title && (
                          <div className="mt-3 p-3 bg-blue-100 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <p className="text-sm font-medium text-blue-900">
                                Invited you to a meeting
                              </p>
                            </div>
                            <p className="text-sm text-blue-700 ml-6">
                              {request.meeting_title}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => handleSeeMore(request)}
                            className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            See More
                          </button>
                          <button
                            onClick={() => handleDecline(request.id)}
                            className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Decline
                          </button>
                          <button
                            onClick={() => handleAccept(request.id)}
                            className="px-4 py-1.5 text-sm text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-lg hover:shadow-lg transition-all flex items-center gap-2 font-medium ml-auto"
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sent Requests Section */}
          <div className="pt-4">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-700">Sent Requests</h3>
                {sentRequests.length > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-200 rounded-full">
                    {sentRequests.length}
                  </span>
                )}
              </div>
            </div>
            <div className="px-4 pt-3 space-y-3">
              {sentRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Send className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No sent requests</p>
                </div>
              ) : (
                sentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-xl border-2 border-gray-200 bg-white"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                        {request.requestee_avatar_url ? (
                          <img
                            src={request.requestee_avatar_url}
                            alt={request.requestee_name || request.requestee_email}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <UserPlus className="w-6 h-6 text-white" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {request.requestee_name || request.requestee_email}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {request.requestee_email}
                        </p>
                        {request.requestee_company && (
                          <p className="text-xs text-gray-400 mt-1">
                            {request.requestee_company}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">
                          Pending
                        </span>
                        <button
                          onClick={() => handleCancelRequest(request.id)}
                          className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Popup */}
      {selectedProfile && profileData && (
        <UserProfilePopup
          userId={selectedProfile}
          initialData={profileData}
          onClose={() => {
            setSelectedProfile(null);
            setProfileData(null);
          }}
        />
      )}
    </>
  );
}
