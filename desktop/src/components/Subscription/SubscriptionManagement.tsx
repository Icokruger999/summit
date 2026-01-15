import { useState, useEffect } from "react";
import { Users, UserPlus, X, Mail } from "lucide-react";
import { subscriptionsApi } from "../../lib/api";

interface SubscriptionManagementProps {
  userId: string;
}

export default function SubscriptionManagement({ userId }: SubscriptionManagementProps) {
  const [subscriptionUsers, setSubscriptionUsers] = useState<any[]>([]);
  const [currentCount, setCurrentCount] = useState(0);
  const [maxUsers, setMaxUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const result = await subscriptionsApi.getUsers();
      setSubscriptionUsers(result.users);
      setCurrentCount(result.current_count);
      setMaxUsers(result.max_users);
      setIsOwner(true);
    } catch (error: any) {
      if (error.response?.status === 403) {
        setIsOwner(false);
      } else {
        console.error("Error fetching subscription users:", error);
        setError("Failed to load subscription users");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUsers();
    }
  }, [userId]);

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    setAddingUser(true);
    setError(null);
    setSuccess(null);

    try {
      await subscriptionsApi.addUser(newUserEmail.trim());
      setSuccess(`User ${newUserEmail} added successfully!`);
      setNewUserEmail("");
      fetchUsers(); // Refresh list
    } catch (err: any) {
      setError(err.errorData?.error || err.message || "Failed to add user");
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (userToRemoveId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${userEmail} from this subscription?`)) {
      return;
    }

    try {
      await subscriptionsApi.removeUser(userToRemoveId);
      setSuccess(`User removed successfully`);
      fetchUsers(); // Refresh list
    } catch (err: any) {
      setError(err.errorData?.error || err.message || "Failed to remove user");
    }
  };

  if (!isOwner) {
    return null; // Only show for subscription owners
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Subscription Users
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {currentCount} / {maxUsers === -1 ? 'Unlimited' : maxUsers} users
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Add User Section */}
      {maxUsers === -1 || currentCount < maxUsers ? (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add User to Subscription
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="Enter user email address"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddUser();
                }
              }}
            />
            <button
              onClick={handleAddUser}
              disabled={addingUser || !newUserEmail.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {addingUser ? 'Adding...' : 'Add'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            The user must have a Summit account with this email address.
          </p>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          Subscription limit reached. Remove a user to add another.
        </div>
      )}

      {/* Users List */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Users in Subscription:</h4>
        {subscriptionUsers.length === 0 ? (
          <p className="text-gray-500 text-sm">No users in subscription</p>
        ) : (
          subscriptionUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.name || 'No name'}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              {user.id !== userId && (
                <button
                  onClick={() => handleRemoveUser(user.id, user.email)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove user"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
