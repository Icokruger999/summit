import { useState } from "react";
import { X, Check, Mail, Users, Building2 } from "lucide-react";
import { subscriptionsApi } from "../../lib/api";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionSelected?: () => void;
  viewOnly?: boolean; // If true, show info only, no activation buttons
}

export default function SubscriptionModal({ 
  isOpen, 
  onClose, 
  onSubscriptionSelected,
  viewOnly = false
}: SubscriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'basic' | 'enterprise' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPlan = async (tier: 'basic' | 'enterprise') => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSelectedTier(tier);

    try {
      // Sandbox mode: Basic plan immediately unlocks the app by calling backend
      if (tier === 'basic') {
        // Call backend to create subscription
        await subscriptionsApi.selectPlan(tier);
        setSuccess("Basic subscription activated! Unlocking Summit...");
        if (onSubscriptionSelected) {
          setTimeout(() => {
            onSubscriptionSelected();
            onClose();
          }, 1500);
        }
        return;
      }

      // Enterprise requires contact
      if (tier === 'enterprise') {
        setSuccess("Please contact summit@codingeverest.com for Enterprise subscription details.");
      }
    } catch (err: any) {
      setError(err.errorData?.error || err.message || "Failed to select subscription plan");
    } finally {
      setLoading(false);
    }
  };

  const handleEnterpriseContact = () => {
    window.location.href = `mailto:summit@codingeverest.com?subject=Enterprise Subscription Inquiry&body=Hello,%0D%0A%0D%0AI am interested in an Enterprise subscription for Summit. Please provide more information about custom pricing and user limits.`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Subscription Plan</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Plan */}
            <div className="border-2 border-blue-500 rounded-xl p-6 hover:border-blue-600 transition-colors relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                RECOMMENDED
              </div>
              <div className="text-center mb-4 mt-2">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Basic</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">R200</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>1 user</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Unlimited messages</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Unlimited meetings</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Full feature access</span>
                </li>
              </ul>
              {!viewOnly && (
                <button
                  onClick={() => handleSelectPlan('basic')}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && selectedTier === 'basic' ? 'Processing...' : 'Select Plan'}
                </button>
              )}
            </div>

            {/* Enterprise Plan */}
            <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-gray-400 transition-colors">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Enterprise</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">Custom</span>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Custom user limit</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Unlimited messages</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Unlimited meetings</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Full feature access</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Priority support</span>
                </li>
              </ul>
              {!viewOnly && (
                <button
                  onClick={handleEnterpriseContact}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Contact Us
                </button>
              )}
            </div>
          </div>

          {!viewOnly && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 text-center">
                <strong>Sandbox Mode:</strong> Selecting Basic plan will immediately unlock Summit for testing.
              </p>
            </div>
          )}
          {viewOnly && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 text-center">
                <strong>Info:</strong> This is a preview. Create an account to select a subscription plan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
