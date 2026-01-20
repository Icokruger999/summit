#!/usr/bin/env python3
"""Fix presence route SQL syntax"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

# Fix the presence.js with correct SQL
fix_cmd = '''
cd /var/www/summit/server/dist/routes

# Create fixed presence.js
cat > presence.js << 'EOF'
import express from "express";
import { authenticate } from "../middleware/auth.js";
import { query } from "../lib/db.js";

const router = express.Router();

// Update user presence status
router.put("/", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.body;
        
        if (!status || !["online", "offline", "away", "busy", "dnd"].includes(status)) {
            return res.status(400).json({ error: "Invalid status. Must be 'online', 'offline', 'away', 'busy', or 'dnd'" });
        }
        
        const now = new Date().toISOString();
        
        if (status === 'online') {
            // When going online, update last_seen
            await query(`
                INSERT INTO presence (user_id, status, last_seen, updated_at)
                VALUES ($1, $2, $3, $3)
                ON CONFLICT (user_id) 
                DO UPDATE SET status = $2, last_seen = $3, updated_at = $3
            `, [userId, status, now]);
        } else {
            // When going offline/away, keep existing last_seen
            await query(`
                INSERT INTO presence (user_id, status, updated_at)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id) 
                DO UPDATE SET status = $2, updated_at = $3
            `, [userId, status, now]);
        }
        
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
        
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: "userIds array is required" });
        }
        
        const result = await query(`
            SELECT user_id, status, last_seen, updated_at
            FROM presence
            WHERE user_id = ANY($1::uuid[])
        `, [userIds]);
        
        // Convert to object keyed by user_id
        const presenceMap = {};
        result.rows.forEach(row => {
            presenceMap[row.user_id] = {
                status: row.status,
                lastSeen: row.last_seen,
                updatedAt: row.updated_at
            };
        });
        
        // Fill in missing users as offline
        userIds.forEach(id => {
            if (!presenceMap[id]) {
                presenceMap[id] = { status: 'offline', lastSeen: null, updatedAt: null };
            }
        });
        
        res.json(presenceMap);
    } catch (error) {
        console.error("Error fetching presence:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get presence for a single user
router.get("/:userId", authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await query(`
            SELECT user_id, status, last_seen, updated_at
            FROM presence
            WHERE user_id = $1
        `, [userId]);
        
        if (result.rows.length === 0) {
            return res.json({ status: 'offline', lastSeen: null, updatedAt: null });
        }
        
        const row = result.rows[0];
        res.json({
            status: row.status,
            lastSeen: row.last_seen,
            updatedAt: row.updated_at
        });
    } catch (error) {
        console.error("Error fetching presence:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
EOF

echo "=== Presence route fixed ==="

# Restart PM2
pm2 restart summit-backend
sleep 3

echo "=== Check for errors ==="
pm2 logs summit-backend --err --lines 10 --nostream
'''

print("Fixing presence SQL...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [fix_cmd]},
    TimeoutSeconds=60
)
command_id = response['Command']['CommandId']
time.sleep(10)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)
print(output.get('StandardOutputContent', ''))
if output.get('StandardErrorContent'):
    print(f"STDERR: {output['StandardErrorContent']}")
