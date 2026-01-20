#!/usr/bin/env python3
import subprocess, json, time

# Deploy the correct PostgreSQL-based presence.js
presence_js = '''import express from "express";
import { authenticate } from "../middleware/auth.js";
import { query } from "../lib/db.js";
const router = express.Router();

// Update user presence status
router.put("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;
    if (!status || !["online", "offline", "away", "busy", "dnd"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const now = new Date();
    await query(
      `INSERT INTO presence (user_id, status, last_seen, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) 
       DO UPDATE SET status = EXCLUDED.status, last_seen = EXCLUDED.last_seen, updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [userId, status, now, now]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating presence:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get presence for multiple users
router.post("/batch", authenticate, async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "userIds must be a non-empty array" });
    }
    const result = await query(
      `SELECT user_id, status, last_seen, updated_at FROM presence WHERE user_id = ANY($1)`,
      [userIds]
    );
    const presenceData = {};
    result.rows.forEach((row) => {
      presenceData[row.user_id] = {
        user_id: row.user_id,
        status: row.status,
        last_seen: row.last_seen,
        updated_at: row.updated_at,
      };
    });
    res.json(presenceData);
  } catch (error) {
    console.error("Error fetching presence:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get presence for a single user
router.get("/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query(
      `SELECT user_id, status, last_seen, updated_at FROM presence WHERE user_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.json({ user_id: userId, status: "offline", last_seen: null });
    }
    const row = result.rows[0];
    res.json({
      user_id: row.user_id,
      status: row.status,
      last_seen: row.last_seen,
      updated_at: row.updated_at,
    });
  } catch (error) {
    console.error("Error fetching presence:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
'''

# Escape for shell
presence_js_escaped = presence_js.replace("'", "'\\''")

cmd = f"""
cat > /var/www/summit/dist/routes/presence.js << 'ENDOFFILE'
{presence_js}
ENDOFFILE

echo "=== Deployed presence.js ==="
head -20 /var/www/summit/dist/routes/presence.js

echo ""
echo "=== Restarting PM2 ==="
export HOME=/home/ubuntu
pm2 restart summit-backend
sleep 3
pm2 status
"""

result = subprocess.run([
    "aws", "ssm", "send-command",
    "--instance-ids", "i-0fba58db502cc8d39",
    "--document-name", "AWS-RunShellScript",
    "--parameters", json.dumps({"commands": [cmd]}),
    "--region", "eu-west-1",
    "--output", "json"
], capture_output=True, text=True)

data = json.loads(result.stdout)
cmd_id = data['Command']['CommandId']
print(f"Command: {cmd_id}")
time.sleep(12)

result = subprocess.run([
    "aws", "ssm", "get-command-invocation",
    "--command-id", cmd_id,
    "--instance-id", "i-0fba58db502cc8d39",
    "--region", "eu-west-1",
    "--query", "StandardOutputContent",
    "--output", "text"
], capture_output=True, encoding='utf-8', errors='replace')

print(result.stdout)
