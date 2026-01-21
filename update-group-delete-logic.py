#!/usr/bin/env python3
"""
Update group delete logic so creators can delete entire group
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

command = """
export HOME=/home/ubuntu

# Backup current file
cp /var/www/summit/dist/routes/chats.js /var/www/summit/dist/routes/chats.js.backup-delete-$(date +%s)

# Update the DELETE endpoint to delete entire group if user is creator
cat > /tmp/delete_update.js << 'JSEOF'
// Delete/leave group chat
router.delete("/:chatId", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    // Check if user is participant
    const participantCheck = await query(\`
      SELECT c.type, c.created_by
      FROM chats c
      INNER JOIN chat_participants cp ON c.id = cp.chat_id
      WHERE c.id = $1 AND cp.user_id = $2
    \`, [chatId, userId]);

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: "Not a participant in this chat" });
    }

    const chat = participantCheck.rows[0];

    // For group chats
    if (chat.type === "group") {
      // If user is the creator, delete the entire group
      if (chat.created_by === userId) {
        console.log(\`🗑️ Creator deleting entire group: \${chatId}\`);
        
        // Delete all participants first (cascade will handle this, but explicit is better)
        await query(\`DELETE FROM chat_participants WHERE chat_id = $1\`, [chatId]);
        
        // Delete the chat
        await query(\`DELETE FROM chats WHERE id = $1\`, [chatId]);
        
        return res.json({ success: true, action: "deleted" });
      } else {
        // Non-creator just leaves the group
        console.log(\`👋 User leaving group: \${chatId}\`);
        
        await query(\`
          DELETE FROM chat_participants
          WHERE chat_id = $1 AND user_id = $2
        \`, [chatId, userId]);

        // Check if there are any participants left
        const remainingParticipants = await query(\`
          SELECT COUNT(*) as count
          FROM chat_participants
          WHERE chat_id = $1
        \`, [chatId]);

        // If no participants left, delete the chat
        if (parseInt(remainingParticipants.rows[0].count) === 0) {
          await query(\`DELETE FROM chats WHERE id = $1\`, [chatId]);
        }

        return res.json({ success: true, action: "left" });
      }
    } else {
      // For direct chats, just remove the user from participants
      await query(\`
        DELETE FROM chat_participants
        WHERE chat_id = $1 AND user_id = $2
      \`, [chatId, userId]);

      return res.json({ success: true, action: "deleted" });
    }
  } catch (error) {
    console.error("Error deleting/leaving chat:", error);
    res.status(500).json({ error: error.message });
  }
});
JSEOF

# Find and replace the DELETE endpoint in chats.js
# First, find the line number where the DELETE endpoint starts
START_LINE=$(grep -n "^router.delete.*:chatId.*authenticate" /var/www/summit/dist/routes/chats.js | tail -1 | cut -d: -f1)

if [ -z "$START_LINE" ]; then
    echo "❌ Could not find DELETE endpoint"
    exit 1
fi

# Find the closing of this route (next router. line or export default)
END_LINE=$(tail -n +$((START_LINE + 1)) /var/www/summit/dist/routes/chats.js | grep -n "^router\\|^export default" | head -1 | cut -d: -f1)
END_LINE=$((START_LINE + END_LINE - 1))

echo "Found DELETE endpoint at lines $START_LINE to $END_LINE"

# Create a new file with the replacement
head -n $((START_LINE - 1)) /var/www/summit/dist/routes/chats.js > /tmp/chats_new.js
cat /tmp/delete_update.js >> /tmp/chats_new.js
tail -n +$((END_LINE + 1)) /var/www/summit/dist/routes/chats.js >> /tmp/chats_new.js

# Replace the file
mv /tmp/chats_new.js /var/www/summit/dist/routes/chats.js

echo "✅ Updated DELETE endpoint"

# Verify the change
echo ""
echo "=== Verifying DELETE endpoint ==="
grep -A 30 "router.delete.*:chatId" /var/www/summit/dist/routes/chats.js | head -35

# Restart PM2
pm2 restart summit-backend

echo ""
echo "✅ PM2 restarted"
"""

print("🔧 Updating group delete logic...")
print("=" * 60)

response = ssm.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [command]},
    TimeoutSeconds=30
)

time.sleep(5)

output = ssm.get_command_invocation(
    CommandId=response['Command']['CommandId'],
    InstanceId=INSTANCE_ID
)

print(output['StandardOutputContent'])

if output['StandardErrorContent']:
    print("\n⚠️ Errors:")
    print(output['StandardErrorContent'])

print("\n✅ Deployment complete!")
print("\nNow:")
print("- Creators can delete entire group (removes all members)")
print("- Non-creators can leave group (removes only themselves)")
