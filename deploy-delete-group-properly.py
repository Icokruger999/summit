#!/usr/bin/env python3
"""
Deploy delete group feature using sed (safer approach)
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

command = """
export HOME=/home/ubuntu

# Backup current file
cp /var/www/summit/dist/routes/chats.js /var/www/summit/dist/routes/chats.js.backup-delete-proper-$(date +%s)

# The current DELETE endpoint just removes user from participants
# We need to add logic to check if user is creator and delete entire group

# Find the section where we handle group chats and add creator check
# Current code:
#   if (chat.type === "group") {
#     await query(`DELETE FROM chat_participants WHERE chat_id = $1 AND user_id = $2`, [chatId, userId]);
#
# New code:
#   if (chat.type === "group") {
#     if (chat.created_by === userId) {
#       console.log(`🗑️ Creator deleting entire group: ${chatId}`);
#       await query(`DELETE FROM chat_participants WHERE chat_id = $1`, [chatId]);
#       await query(`DELETE FROM chats WHERE id = $1`, [chatId]);
#       return res.json({ success: true, action: "deleted" });
#     } else {
#       console.log(`👋 User leaving group: ${chatId}`);
#       await query(`DELETE FROM chat_participants WHERE chat_id = $1 AND user_id = $2`, [chatId, userId]);
#     }

# Add creator check after "if (chat.type === \\"group\\")"
sed -i '/if (chat.type === "group") {/,/await query.*DELETE FROM chat_participants WHERE chat_id.*user_id/ {
    /if (chat.type === "group") {/a\\
      // If user is the creator, delete the entire group\\
      if (chat.created_by === userId) {\\
        console.log(\`🗑️ Creator deleting entire group: \${chatId}\`);\\
        await query(\`DELETE FROM chat_participants WHERE chat_id = $1\`, [chatId]);\\
        await query(\`DELETE FROM chats WHERE id = $1\`, [chatId]);\\
        return res.json({ success: true, action: "deleted" });\\
      } else {\\
        console.log(\`👋 User leaving group: \${chatId}\`);\\
      }
}' /var/www/summit/dist/routes/chats.js

echo "✅ Updated DELETE endpoint"

# Verify the change
echo ""
echo "=== Verifying changes ==="
grep -A 15 "if (chat.type === \\"group\\")" /var/www/summit/dist/routes/chats.js | tail -20

# Check syntax
echo ""
echo "=== Checking syntax ==="
node --check /var/www/summit/dist/routes/chats.js && echo "✅ Syntax OK" || echo "❌ Syntax error"

# Restart PM2
echo ""
echo "=== Restarting PM2 ==="
pm2 restart summit-backend

sleep 3

# Test
echo ""
echo "=== Testing health endpoint ==="
curl -s http://localhost:4000/health
"""

print("🚀 Deploying delete group feature...")
print("=" * 60)

response = ssm.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [command]},
    TimeoutSeconds=30
)

time.sleep(6)

output = ssm.get_command_invocation(
    CommandId=response['Command']['CommandId'],
    InstanceId=INSTANCE_ID
)

print(output['StandardOutputContent'])

if output['StandardErrorContent']:
    print("\n⚠️ Errors:")
    print(output['StandardErrorContent'])

print("\n✅ Deployment complete!")
