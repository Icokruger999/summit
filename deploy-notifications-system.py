#!/usr/bin/env python3
"""
Deploy persistent notifications system
1. Create notifications table
2. Update chats route to save notifications to database
3. Add notifications API endpoint
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🚀 Deploying persistent notifications system...")
print("=" * 60)

# Step 1: Create notifications table
print("\n📊 Step 1: Creating notifications table...")
command1 = """
export HOME=/home/ubuntu
sudo -u postgres psql -d summit << 'EOF'
-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Verify table was created
\\d notifications
EOF
"""

response1 = ssm.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [command1]},
    TimeoutSeconds=30
)
time.sleep(4)
output1 = ssm.get_command_invocation(
    CommandId=response1['Command']['CommandId'],
    InstanceId=INSTANCE_ID
)
print(output1['StandardOutputContent'])

# Step 2: Update chats route to save notifications to database
print("\n📝 Step 2: Updating chats route to save notifications...")
command2 = """
export HOME=/home/ubuntu

# Backup current file
cp /var/www/summit/dist/routes/chats.js /var/www/summit/dist/routes/chats.js.backup-notifications-$(date +%s)

# Update the GROUP_ADDED notification code to also save to database
# Find the section where we send WebSocket notifications and add database insert
cat > /tmp/notification_update.js << 'JSEOF'
        // Send WebSocket notifications to all members except creator
        const { messageNotifier } = await import("../lib/messageNotifier.js");
        for (const memberId of memberIds) {
            if (memberId !== userId) {
                console.log(`🔔 Attempting to notify user ${memberId} of GROUP_ADDED`);
                
                // Save notification to database (persistent)
                await query(
                    `INSERT INTO notifications (user_id, type, title, message, data)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        memberId,
                        'GROUP_ADDED',
                        'Added to Group',
                        `${creatorName} added you to "${chat.name}"`,
                        JSON.stringify({ chatId: chat.id, chatName: chat.name, creatorId: userId })
                    ]
                );
                
                // Send WebSocket notification (real-time for online users)
                messageNotifier.notifyUser(memberId, {
                    type: "GROUP_ADDED",
                    chatId: chat.id,
                    chatName: chat.name,
                    creatorId: userId,
                    creatorName: creatorName,
                    timestamp: new Date().toISOString(),
                }, "GROUP_ADDED");
            }
        }
JSEOF

# Replace the notification section in chats.js
sed -i '/\\/\\/ Send WebSocket notifications to all members except creator/,/^        }$/c\\
'"$(cat /tmp/notification_update.js | sed 's/$/\\/')" /var/www/summit/dist/routes/chats.js

echo "✅ Updated chats route"
"""

response2 = ssm.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [command2]},
    TimeoutSeconds=30
)
time.sleep(4)
output2 = ssm.get_command_invocation(
    CommandId=response2['Command']['CommandId'],
    InstanceId=INSTANCE_ID
)
print(output2['StandardOutputContent'])

# Step 3: Create notifications API route
print("\n📡 Step 3: Creating notifications API route...")
command3 = """
export HOME=/home/ubuntu

# Create notifications route file
cat > /var/www/summit/dist/routes/notifications.js << 'EOF'
import express from "express";
import { authenticate } from "../middleware/auth.js";
import { query } from "../lib/db.js";

const router = express.Router();

// Get unread notifications for current user
router.get("/unread", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(
      `SELECT id, type, title, message, data, created_at
       FROM notifications
       WHERE user_id = $1 AND read = FALSE
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.post("/:notificationId/read", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;
    
    await query(
      `UPDATE notifications
       SET read = TRUE, read_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
router.post("/read-all", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await query(
      `UPDATE notifications
       SET read = TRUE, read_at = NOW()
       WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
EOF

# Add notifications route to index.js
sed -i '/import chatsRouter from/a\\
import notificationsRouter from "./routes/notifications.js";' /var/www/summit/dist/index.js

sed -i '/app.use("\/api\/chats", chatsRouter);/a\\
app.use("/api/notifications", notificationsRouter);' /var/www/summit/dist/index.js

echo "✅ Created notifications route and added to index.js"

# Restart PM2
pm2 restart summit-backend

echo ""
echo "✅ PM2 restarted"
"""

response3 = ssm.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [command3]},
    TimeoutSeconds=30
)
time.sleep(5)
output3 = ssm.get_command_invocation(
    CommandId=response3['Command']['CommandId'],
    InstanceId=INSTANCE_ID
)
print(output3['StandardOutputContent'])

if output3['StandardErrorContent']:
    print("\n⚠️ Errors:")
    print(output3['StandardErrorContent'])

print("\n" + "=" * 60)
print("✅ Persistent notifications system deployed!")
print("\nNext steps:")
print("1. Update frontend to fetch notifications on login")
print("2. Show notifications in NotificationCenter")
print("3. Mark as read when user views them")
