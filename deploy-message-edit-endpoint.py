#!/usr/bin/env python3
"""Deploy message edit endpoint to production"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

print("🚀 Deploying message edit endpoint...")

# The edit endpoint code (from messages.ts)
edit_endpoint = r'''
// Edit a message
router.put("/:messageId", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Verify user is the sender and message exists
    const messageCheck = await query(
      `SELECT sender_id, chat_id FROM messages WHERE id = $1 AND deleted_at IS NULL`,
      [messageId]
    );

    if (messageCheck.rows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (messageCheck.rows[0].sender_id !== userId) {
      return res.status(403).json({ error: "You can only edit your own messages" });
    }

    // Update message
    await query(
      `UPDATE messages SET content = $1, edited_at = NOW() WHERE id = $2`,
      [content.trim(), messageId]
    );

    // Notify other participants about the edit
    const chatId = messageCheck.rows[0].chat_id;
    const participants = await query(
      `SELECT user_id FROM chat_participants WHERE chat_id = $1 AND user_id != $2`,
      [chatId, userId]
    );

    if (participants.rows.length > 0) {
      const userIds = participants.rows.map(row => row.user_id);
      messageNotifier.notifyUsers(userIds, {
        messageId,
        chatId,
        content: content.trim(),
        editedAt: new Date().toISOString(),
      }, "MESSAGE_EDITED");
    }

    res.json({ success: true, editedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error editing message:", error);
    res.status(500).json({ error: error.message });
  }
});
'''

# Create a backup first
backup_command = """
echo "📦 Creating backup..."
cp /var/www/summit/dist/routes/messages.js /var/www/summit/dist/routes/messages.js.backup-$(date +%s)
echo "✅ Backup created"
"""

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [backup_command]}
)
command_id = response['Command']['CommandId']
print(f"Backup command ID: {command_id}")
time.sleep(2)

# Find the line number where to insert (after DELETE route, before /read route)
find_insert_point = """
echo "🔍 Finding insertion point..."
grep -n "router.delete" /var/www/summit/dist/routes/messages.js | tail -1
echo ""
grep -n 'router.post("/read"' /var/www/summit/dist/routes/messages.js | head -1
"""

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [find_insert_point]}
)
command_id = response['Command']['CommandId']
print(f"Find command ID: {command_id}")
time.sleep(2)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)
print("\n" + output['StandardOutputContent'])

# The DELETE route ends around line 138, and /read starts at line 140
# We'll insert the PUT route between them

# Create a temporary file with the edit endpoint
create_temp_file = f"""
cat > /tmp/edit_endpoint.txt << 'EDIT_EOF'
{edit_endpoint}
EDIT_EOF

echo "✅ Created temp file with edit endpoint"
"""

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [create_temp_file]}
)
command_id = response['Command']['CommandId']
print(f"Create temp file command ID: {command_id}")
time.sleep(2)

# Insert the edit endpoint after the DELETE route
insert_command = """
echo "📝 Inserting edit endpoint..."

# Split the file at line 138 (after DELETE route closes)
head -138 /var/www/summit/dist/routes/messages.js > /tmp/messages_part1.js
tail -n +139 /var/www/summit/dist/routes/messages.js > /tmp/messages_part2.js

# Combine: part1 + edit endpoint + part2
cat /tmp/messages_part1.js > /tmp/messages_new.js
cat /tmp/edit_endpoint.txt >> /tmp/messages_new.js
cat /tmp/messages_part2.js >> /tmp/messages_new.js

# Replace the original file
cp /tmp/messages_new.js /var/www/summit/dist/routes/messages.js

echo "✅ Edit endpoint inserted"

# Verify
echo ""
echo "🔍 Verifying PUT route exists..."
grep -n "router.put" /var/www/summit/dist/routes/messages.js
"""

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [insert_command]}
)
command_id = response['Command']['CommandId']
print(f"Insert command ID: {command_id}")
time.sleep(3)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)
print("\n" + output['StandardOutputContent'])
if output['StandardErrorContent']:
    print("STDERR:", output['StandardErrorContent'])

# Restart PM2
restart_command = """
echo "🔄 Restarting PM2..."
export HOME=/home/ubuntu
pm2 restart summit-backend
sleep 2
pm2 status
echo ""
echo "✅ PM2 restarted"

echo ""
echo "🧪 Testing health endpoint..."
curl -s http://localhost:4000/health
"""

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [restart_command]}
)
command_id = response['Command']['CommandId']
print(f"\nRestart command ID: {command_id}")
time.sleep(4)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)
print("\n" + output['StandardOutputContent'])
if output['StandardErrorContent']:
    print("STDERR:", output['StandardErrorContent'])

print("\n✅ Deployment complete!")
print("\n🧪 Now test with: python summit/test-message-edit.py")
