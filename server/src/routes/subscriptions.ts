import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { 
  getSubscriptionStatus, 
  createSubscription, 
  addUserToSubscription,
  removeUserFromSubscription,
  getSubscriptionUsers,
  getUserByEmail
} from "../lib/db.js";
import { query } from "../lib/db.js";

const router = express.Router();

// Get current user's subscription status
router.get("/status", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const status = await getSubscriptionStatus(userId);
    
    res.json(status);
  } catch (error: any) {
    console.error("Error getting subscription status:", error);
    res.status(500).json({ error: error.message || "Failed to get subscription status" });
  }
});

// Create subscription (owner only)
router.post("/create", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { tier } = req.body;

    if (!tier || !['basic', 'pack', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: "Invalid subscription tier" });
    }

    // Check if user already has a subscription
    const existingStatus = await getSubscriptionStatus(userId);
    if (existingStatus.subscription && existingStatus.subscription.status === 'active') {
      return res.status(400).json({ error: "User already has an active subscription" });
    }

    const subscription = await createSubscription(userId, tier);
    
    res.json({
      message: "Subscription created successfully",
      subscription,
    });
  } catch (error: any) {
    console.error("Error creating subscription:", error);
    res.status(500).json({ error: error.message || "Failed to create subscription" });
  }
});

// Select subscription plan (UI only - no payment processing yet)
router.post("/select", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { tier } = req.body;

    if (!tier || !['basic', 'pack', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: "Invalid subscription tier" });
    }

    // For enterprise, just return contact info
    if (tier === 'enterprise') {
      return res.json({
        message: "Please contact us for Enterprise subscription",
        contactEmail: "summit@codingeverest.com",
        tier: 'enterprise',
      });
    }

    // For basic and pack, create subscription (payment processing deferred)
    const subscription = await createSubscription(userId, tier);
    
    res.json({
      message: "Subscription plan selected. Payment integration coming soon.",
      subscription,
      note: "This is a UI-only selection. Payment processing will be implemented later.",
    });
  } catch (error: any) {
    console.error("Error selecting subscription:", error);
    res.status(500).json({ error: error.message || "Failed to select subscription" });
  }
});

// Get users in subscription (owner only)
router.get("/users", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Get user's subscription
    const status = await getSubscriptionStatus(userId);
    
    if (!status.subscription || !status.is_owner) {
      return res.status(403).json({ error: "Only subscription owners can view users" });
    }

    const users = await getSubscriptionUsers(status.subscription.id);
    
    res.json({
      users,
      current_count: users.length,
      max_users: status.max_users,
    });
  } catch (error: any) {
    console.error("Error getting subscription users:", error);
    res.status(500).json({ error: error.message || "Failed to get subscription users" });
  }
});

// Add user to subscription by email (owner only, for pack subscriptions)
router.post("/users/add", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Get user's subscription
    const status = await getSubscriptionStatus(userId);
    
    if (!status.subscription || !status.is_owner) {
      return res.status(403).json({ error: "Only subscription owners can add users" });
    }

    if (status.subscription.tier !== 'pack' && status.subscription.tier !== 'enterprise') {
      return res.status(400).json({ error: "Can only add users to Pack or Enterprise subscriptions" });
    }

    // Check if subscription has space
    if (status.max_users && status.max_users > 0 && (status.current_users || 0) >= status.max_users) {
      return res.status(400).json({ 
        error: `Subscription limit reached (${status.max_users} users)` 
      });
    }

    // Find user by email
    const userToAdd = await getUserByEmail(email);
    if (!userToAdd) {
      return res.status(404).json({ error: "User not found with this email address" });
    }

    // Check if user already in a subscription
    if (userToAdd.subscription_id) {
      return res.status(400).json({ error: "User is already part of a subscription" });
    }

    // Add user to subscription
    await addUserToSubscription(status.subscription.id, userToAdd.id);
    
    res.json({
      message: "User added to subscription successfully",
      user: {
        id: userToAdd.id,
        email: userToAdd.email,
        name: userToAdd.name,
      },
    });
  } catch (error: any) {
    console.error("Error adding user to subscription:", error);
    res.status(500).json({ error: error.message || "Failed to add user to subscription" });
  }
});

// Remove user from subscription (owner only)
router.delete("/users/:userId", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { userId: userToRemoveId } = req.params;

    // Get user's subscription
    const status = await getSubscriptionStatus(userId);
    
    if (!status.subscription || !status.is_owner) {
      return res.status(403).json({ error: "Only subscription owners can remove users" });
    }

    // Don't allow removing owner
    if (userToRemoveId === userId) {
      return res.status(400).json({ error: "Cannot remove subscription owner" });
    }

    // Remove user from subscription
    await removeUserFromSubscription(status.subscription.id, userToRemoveId);
    
    res.json({
      message: "User removed from subscription successfully",
    });
  } catch (error: any) {
    console.error("Error removing user from subscription:", error);
    res.status(500).json({ error: error.message || "Failed to remove user from subscription" });
  }
});

export default router;
