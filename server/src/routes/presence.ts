import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import supabase from "../lib/supabase.js";

const router = express.Router();

// Update user presence status
router.put("/", authenticate, async (req: AuthRequest, res) => {
  try {
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    const userId = req.user!.id;
    const { status } = req.body;

    if (!status || !["online", "offline", "away", "busy", "dnd"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be 'online', 'offline', 'away', 'busy', or 'dnd'" });
    }

    // Upsert presence using Supabase client (bypasses RLS with service role key)
    const now = new Date().toISOString();
    const lastSeen = status === 'online' ? now : null;

    const { data, error } = await supabase
      .from('presence')
      .upsert({
        user_id: userId,
        status: status,
        last_seen: lastSeen,
        updated_at: now
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error("Error updating presence:", error);
      throw error;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating presence:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get presence for multiple users
router.post("/batch", authenticate, async (req: AuthRequest, res) => {
  try {
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "userIds must be a non-empty array" });
    }

    const { data, error } = await supabase
      .from('presence')
      .select('user_id, status, last_seen, updated_at')
      .in('user_id', userIds);

    if (error) {
      console.error("Error fetching presence:", error);
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error("Error fetching presence:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get presence for a single user
router.get("/:userId", authenticate, async (req: AuthRequest, res) => {
  try {
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    const { userId } = req.params;

    const { data, error } = await supabase
      .from('presence')
      .select('user_id, status, last_seen, updated_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return res.json({ user_id: userId, status: "offline", last_seen: null });
      }
      console.error("Error fetching presence:", error);
      throw error;
    }

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching presence:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

