#!/bin/bash
# Update presence route on production server

cd /var/www/summit/server/src/routes

# Backup current file
cp presence.ts presence.ts.backup

# Update the file
cat > presence.ts << 'EOF'
import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { query } from "../lib/db.js";

const router = express.Router();

// Time thresholds for presence status
const AWAY_THRESHOLD = 5 * 60 * 1000; // 5 minutes - mark as away
const OFFLINE_THRESHOLD = 10 * 60 * 1000; // 10 minutes - mark as offline

// Helper function to compute actual status based on last_seen
function computeActualStatus(dbStatus: string, lastSeen: string | null, updatedAt: string): string {
  // If status is already offline, keep it
  if (dbStatus === "offline") return "offline";
  
  // If user manually set busy or dnd, respect it (but check if they've been gone too long)
  if (dbStatus === "busy" || dbStatus === "dnd") {
    if (!updatedAt) return "offline";
    const timeSinceUpdate = Date.now() - new Date(updatedAt).getTime();
    // If they've been in busy/dnd for more than 10 minutes without activity, mark offline
    if (timeSinceUpdate > OFFLINE_THRESHOLD) return "offline";
    return dbStatus;
  }
  
  // For online/away status, check last_seen or updated_at
  const timestamp = lastSeen || updatedAt;
  if (!timestamp) return "offline";
  
  const timeSinceLastSeen = Date.now() - new Date(timestamp).getTime();
  
  // If more than 10 minutes, mark as offline
  if (timeSinceLastSeen > OFFLINE_THRESHOLD) return "offline";
  
  // If more than 5 minutes and status is online, mark as away
  if (timeSinceLastSeen > AWAY_THRESHOLD && dbStatus === "online") return "away";
  
  // Otherwise return the database status
  return dbStatus;
}

// Update user presence status
router.put("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { status } = req.body;

    if (!status || !["online", "offline", "away", "busy", "dnd"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be 'online', 'offline', 'away', 'busy', or 'dnd'" });
    }

    const now = new Date();
    // Always update last_seen for any status update (this shows activity)
    const lastSeen = now;

    // Upsert presence using PostgreSQL
    const result = await query(
      \`INSERT INTO presence (user_id, status, last_seen, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         status = EXCLUDED.status,
         last_seen = EXCLUDED.last_seen,
         updated_at = EXCLUDED.updated_at
       RETURNING *\`,
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
      \`SELECT user_id, status, last_seen, updated_at 
       FROM presence 
       WHERE user_id = ANY($1)\`,
      [userIds]
    );

    // Compute actual status based on last_seen timestamps
    const presenceData: Record<string, any> = {};
    result.rows.forEach((row) => {
      const actualStatus = computeActualStatus(row.status, row.last_seen, row.updated_at);
      presenceData[row.user_id] = {
        user_id: row.user_id,
        status: actualStatus,
        last_seen: row.last_seen,
        updated_at: row.updated_at,
      };
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
      \`SELECT user_id, status, last_seen, updated_at 
       FROM presence 
       WHERE user_id = $1\`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ user_id: userId, status: "offline", last_seen: null });
    }

    const row = result.rows[0];
    const actualStatus = computeActualStatus(row.status, row.last_seen, row.updated_at);

    res.json({
      user_id: row.user_id,
      status: actualStatus,
      last_seen: row.last_seen,
      updated_at: row.updated_at,
    });
  } catch (error: any) {
    console.error("Error fetching presence:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
EOF

echo "✅ presence.ts updated"

# Rebuild
cd /var/www/summit/server
npm run build

echo "✅ Build complete"

# Restart server
pm2 restart summit-backend

echo "✅ Server restarted"
sleep 2
pm2 status summit-backend
