#!/bin/bash
cd /var/www/summit/server/src/routes

# Restore from backup
if [ -f "presence.ts.backup."* ]; then
    latest_backup=$(ls -t presence.ts.backup.* | head -1)
    cp "$latest_backup" presence.ts
    echo "Restored from $latest_backup"
else
    echo "No backup found, using simple working version"
    cat > presence.ts << 'EOF'
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
      return res.status(400).json({ error: "Invalid status" });
    }

    const now = new Date();
    const lastSeen = now;

    await query(
      `INSERT INTO presence (user_id, status, last_seen, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         status = EXCLUDED.status,
         last_seen = EXCLUDED.last_seen,
         updated_at = EXCLUDED.updated_at`,
      [userId, status, lastSeen, now]
    );

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

    const result = await query(
      `SELECT user_id, status, last_seen, updated_at 
       FROM presence 
       WHERE user_id = ANY($1)`,
      [userIds]
    );

    const presenceData: Record<string, any> = {};
    result.rows.forEach((row) => {
      presenceData[row.user_id] = row;
    });

    res.json(presenceData);
  } catch (error: any) {
    console.error("Error fetching presence:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get presence for a single user
router.get("/:userId", authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      `SELECT user_id, status, last_seen, updated_at 
       FROM presence 
       WHERE user_id = $1`,
      [userId]
    );

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
EOF
fi

cd /var/www/summit/server
npm run build
pm2 restart summit-backend
sleep 2
pm2 logs summit-backend --lines 20 --nostream
