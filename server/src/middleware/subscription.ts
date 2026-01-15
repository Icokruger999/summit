import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";
import { checkTrialExpired, getSubscriptionStatus } from "../lib/db.js";

// Check if user has active subscription or valid trial - blocks ALL access if expired
export async function checkSubscriptionAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const status = await getSubscriptionStatus(userId);
    
    // Allow access only if active subscription or valid trial
    if (status.status === 'active' || (status.status === 'trial' && (status.hours_remaining || 0) > 0)) {
      return next();
    }

    // Trial expired or locked - block ALL access (read and write)
    return res.status(403).json({ 
      error: "Your trial has expired. Please select a subscription plan to continue using Summit.",
      subscriptionStatus: status.status,
      hoursRemaining: status.hours_remaining || 0,
      requiresSubscription: true,
    });
  } catch (error: any) {
    console.error("Error checking subscription access:", error);
    return res.status(500).json({ error: "Failed to check subscription status" });
  }
}

// Check if trial has expired
export async function checkTrialExpiredMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const expired = await checkTrialExpired(userId);
    
    if (expired) {
      return res.status(403).json({ 
        error: "Your trial has expired. Please select a subscription plan to continue using Summit.",
        requiresSubscription: true,
      });
    }

    next();
  } catch (error: any) {
    console.error("Error checking trial expiration:", error);
    return res.status(500).json({ error: "Failed to check trial status" });
  }
}

// Enforce subscription access (blocks ALL operations if trial expired)
// This is an alias for checkSubscriptionAccess for clarity
export const enforceSubscription = checkSubscriptionAccess;
