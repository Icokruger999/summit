import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { query } from "../lib/db.js";

const router = express.Router();

// Update user presence status
router.put("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { status } = req.body;

    if (!status || !["online", "offline", "away", "busy", "dnd"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be 'online', 'offline', 'away', 'busy', or 'dnd'" });
    }

    // Upsert presence
    await query(`
      INSERT INTO presence (user_id, status, last_seen, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        status = $2,
        last_seen = CASE WHEN $2 = 'online' THEN NOW() ELSE presence.last_seen END,
        updated_at = NOW()
    `, [userId, status]);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating presence:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get presence for multiple users
router.post("/batch", authenticate, async (req: AuthRequest, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "userIds must be a non-empty array" });
    }

    const result = await query(`
      SELECT user_id, status, last_seen, updated_at
      FROM presence
      WHERE user_id = ANY($1::uuid[])
    `, [userIds]);

    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching presence:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get presence for a single user
router.get("/:userId", authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const result = await query(`
      SELECT user_id, status, last_seen, updated_at
      FROM presence
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.json({ user_id: userId, status: "offline", last_seen: null });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching presence:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

