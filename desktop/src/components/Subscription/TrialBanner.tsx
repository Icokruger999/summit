import { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { subscriptionsApi } from "../../lib/api";

interface TrialBannerProps {
  userId: string;
  onSelectPlan: () => void;
}

export default function TrialBanner({ userId, onSelectPlan }: TrialBannerProps) {
  const [hoursRemaining, setHoursRemaining] = useState<number | null>(null);
  const [status, setStatus] = useState<'trial' | 'active' | 'expired' | 'locked'>('trial');
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const subscriptionStatus = await subscriptionsApi.getStatus();
      setStatus(subscriptionStatus.status);
      
      if (subscriptionStatus.status === 'trial' && subscriptionStatus.hours_remaining !== undefined) {
        setHoursRemaining(Math.max(0, Math.floor(subscriptionStatus.hours_remaining)));
      } else {
        setHoursRemaining(null);
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;

    fetchStatus();
    
    // Update every minute
    const interval = setInterval(() => {
      fetchStatus();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [userId]);

  // Don't show banner if not in trial or if loading
  if (loading || status !== 'trial' || hoursRemaining === null) {
    return null;
  }

  // Determine banner style based on hours remaining
  const isCritical = hoursRemaining <= 1;
  const isWarning = hoursRemaining <= 24;

  const bgColor = isCritical 
    ? "bg-red-600" 
    : isWarning 
    ? "bg-orange-500" 
    : "bg-blue-600";
  
  const textColor = "text-white";

  return (
    <div className={`${bgColor} ${textColor} py-2 px-4 shadow-lg`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Clock className="w-5 h-5" />
          )}
          <span className="font-medium">
            {isCritical 
              ? `Trial expires in less than 1 hour!`
              : isWarning
              ? `Trial: ${hoursRemaining} hours remaining`
              : `Trial: ${hoursRemaining} hours remaining`}
          </span>
        </div>
        <button
          onClick={onSelectPlan}
          className="px-4 py-1.5 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm"
        >
          Choose Plan
        </button>
      </div>
    </div>
  );
}
