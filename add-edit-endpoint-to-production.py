#!/usr/bin/env python3
"""
Add message edit endpoint to production server
"""
import boto3
import time

# EC2 instance details
INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

# Create SSM client
ssm = boto3.client('ssm', region_name=REGION)

print("🚀 Adding message edit endpoint to production...")
print("=" * 60)

# Add the edit endpoint after the POST endpoint
commands = """
# Backup current file
cp /var/www/summit/dist/routes/messages.js /var/www/summit/dist/routes/messages.js.backup-$(date +%s)

# Add edit endpoint after the POST / endpoint
# Find the line with "export default router" and insert before it
sed -i '/export default router/i\\
// Edit a message\\
router.put("/:messageId", authenticate, async (req, res) => {\\
    try {\\
        const userId = req.user.id;\\
        const { messageId } = req.params;\\
        const { content } = req.body;\\
        if (!content || !content.trim()) {\\
            return res.status(400).json({ error: "Message content is required" });\\
        }\\
        const messageCheck = await query(\\
            `SELECT sender_id, chat_id FROM messages WHERE id = $1 AND deleted_at IS NULL`,\\
            [messageId]\\
        );\\
        if (messageCheck.rows.length === 0) {\\
            return res.status(404).json({ error: "Message not found" });\\
        }\\
        if (messageCheck.rows[0].sender_id !== userId) {\\
            return res.status(403).json({ error: "You can only edit your own messages" });\\
        }\\
        await query(\\
            `UPDATE messages SET content = $1, edited_at = NOW() WHERE id = $2`,\\
            [content.trim(), messageId]\\
        );\\
        const chatId = messageCheck.rows[0].chat_id;\\
        const participants = await query(\\
            `SELECT user_id FROM chat_participants WHERE chat_id = $1 AND user_id != $2`,\\
            [chatId, userId]\\
        );\\
        if (participants.rows.length > 0) {\\
            const userIds = participants.rows.map(row => row.user_id);\\
            messageNotifier.notifyUsers(userIds, {\\
                messageId,\\
                chatId,\\
                content: content.trim(),\\
                editedAt: new Date().toISOString(),\\
            }, "MESSAGE_EDITED");\\
        }\\
        res.json({ success: true, editedAt: new Date().toISOString() });\\
    }\\
    catch (error) {\\
        console.error("Error editing message:", error);\\
        res.status(500).json({ error: error.message });\\
    }\\
});\\
' /var/www/summit/dist/routes/messages.js

echo "✅ Edit endpoint added"

# Restart PM2
export HOME=/home/ubuntu
pm2 restart summit-backend

sleep 3

# Test the endpoint exists
echo ""
echo "🧪 Testing if edit endpoint was added..."
grep -A 5 "router.put.*:messageId" /var/www/summit/dist/routes/messages.js | head -10

echo ""
echo "✅ Done!"
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [commands]},
        TimeoutSeconds=120
    )
    
    command_id = response['Command']['CommandId']
    print(f"✅ Command sent: {command_id}")
    print("⏳ Waiting for execution...")
    
    # Wait for command to complete
    time.sleep(8)
    
    # Get command output
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    print("\n📤 Output:")
    print(output['StandardOutputContent'])
    
    if output['StandardErrorContent']:
        print("\n⚠️ Errors:")
        print(output['StandardErrorContent'])
    
    print("\n✅ Edit endpoint deployed!")
    print("Try editing a message now!")
    
except Exception as e:
    print(f"❌ Error: {e}")
