#!/usr/bin/env python3
"""Fix presence route to use PostgreSQL instead of Supabase"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

# Create a new presence.js that uses PostgreSQL
fix_cmd = '''
cd /var/www/summit/server/dist/routes

# Backup current presence.js
cp presence.js presence.js.backup

# Create new presence.js using PostgreSQL
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
        const lastSeen = status === 'online' ? now : null;
        
        // Upsert presence
        await query(`
            INSERT INTO presence (user_id, status, last_seen, updated_at)
            VALUES ($1, $2, COALESCE($3, last_seen), $4)
            ON CONFLICT (user_id) 
            DO UPDATE SET status = $2, last_seen = COALESCE($3, presence.last_seen), updated_at = $4
        `, [userId, status, lastSeen, now]);
        
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

echo "=== Presence route updated ==="

# Restart PM2
pm2 restart summit-backend
sleep 3

echo "=== PM2 Status ==="
pm2 list

echo "=== Test presence endpoint ==="
pm2 logs summit-backend --lines 10 --nostream
'''

print("Fixing presence route...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [fix_cmd]},
    TimeoutSeconds=60
)
command_id = response['Command']['CommandId']
time.sleep(15)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)
print(output.get('StandardOutputContent', ''))
if output.get('StandardErrorContent'):
    print(f"STDERR: {output['StandardErrorContent']}")
