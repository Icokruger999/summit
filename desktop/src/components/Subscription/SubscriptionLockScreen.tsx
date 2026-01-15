import { useState, useEffect } from "react";
import { Lock, CreditCard, Mail } from "lucide-react";
import SubscriptionModal from "./SubscriptionModal";
import { subscriptionsApi } from "../../lib/api";

interface SubscriptionLockScreenProps {
  userId: string;
}

export default function SubscriptionLockScreen({ userId }: SubscriptionLockScreenProps) {
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<'trial' | 'active' | 'expired' | 'locked'>('trial');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const subscriptionStatus = await subscriptionsApi.getStatus();
        setStatus(subscriptionStatus.status);
        
        // Auto-show modal if locked/expired
        if (subscriptionStatus.status === 'locked' || subscriptionStatus.status === 'expired') {
          setShowModal(true);
        }
      } catch (error) {
        console.error("Error checking subscription status:", error);
        // If we can't check status, assume locked
        setStatus('locked');
        setShowModal(true);
      }
    };

    if (userId) {
      checkStatus();
    }
  }, [userId]);

  // Don't show lock screen if user has active subscription or valid trial
  if (status === 'active' || (status === 'trial')) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center z-[9999]">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-red-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Trial Expired
            </h1>
            
            <p className="text-gray-600 mb-8">
              Your 3-day trial has ended. To continue using Summit, please select a subscription plan.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setShowModal(true)}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <CreditCard className="w-5 h-5" />
                Choose Subscription Plan
              </button>

              <button
                onClick={() => window.location.href = 'mailto:summit@codingeverest.com?subject=Subscription Inquiry'}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Contact Support
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Need help? Email us at{" "}
                <a 
                  href="mailto:summit@codingeverest.com" 
                  className="text-blue-600 hover:underline"
                >
                  summit@codingeverest.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <SubscriptionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubscriptionSelected={() => {
          // Refresh page or update status after subscription selected
          window.location.reload();
        }}
      />
    </>
  );
}
