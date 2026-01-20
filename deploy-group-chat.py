#!/usr/bin/env python3
import subprocess, json, time

# Deploy the group chat endpoint to chats.js
# This adds the POST /group endpoint

chats_js = '''import express from "express";
import { authenticate } from "../middleware/auth.js";
import { query } from "../lib/db.js";
const router = express.Router();

// Get all chats for the current user
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(`
      SELECT 
        c.id, c.name, c.type, c.created_by, c.created_at, c.updated_at,
        c.last_message, c.last_message_at,
        COALESCE(c.last_message_at, c.updated_at, c.created_at) as sort_date,
        (SELECT sender_id FROM messages WHERE chat_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message_sender_id,
        (SELECT json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url)
         FROM chat_participants ocp JOIN users u ON ocp.user_id = u.id
         WHERE ocp.chat_id = c.id AND ocp.user_id != $1 LIMIT 1) as other_participant
      FROM chats c
      INNER JOIN chat_participants cp ON c.id = cp.chat_id
      WHERE cp.user_id = $1
      ORDER BY sort_date DESC
    `, [userId]);
    const chats = result.rows.map((row) => {
      const chat = {
        id: row.id, name: row.name, type: row.type, created_by: row.created_by,
        created_at: row.created_at, updated_at: row.updated_at,
        last_message: row.last_message, last_message_at: row.last_message_at,
        last_message_sender_id: row.last_message_sender_id,
      };
      if (row.type === "direct" && row.other_participant) {
        chat.name = row.other_participant.name || row.other_participant.email;
        chat.other_user = row.other_participant;
        chat.other_user_id = row.other_participant.id;
        chat.other_user_name = row.other_participant.name;
        chat.other_user_email = row.other_participant.email;
      }
      return chat;
    });
    res.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get or create a direct chat
router.post("/direct", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.body;
    if (!otherUserId) return res.status(400).json({ error: "otherUserId is required" });
    if (userId === otherUserId) return res.status(400).json({ error: "Cannot create chat with yourself" });
    const result = await query(`SELECT get_or_create_direct_chat($1, $2) as chat_id`, [userId, otherUserId]);
    const chatId = result.rows[0].chat_id;
    const chatResult = await query(`
      SELECT c.id, c.name, c.type, c.created_by, c.created_at, c.updated_at, c.last_message, c.last_message_at,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url) as other_participant
      FROM chats c
      INNER JOIN chat_participants cp ON c.id = cp.chat_id
      JOIN users u ON cp.user_id = u.id
      WHERE c.id = $1 AND cp.user_id != $2 LIMIT 1
    `, [chatId, userId]);
    if (chatResult.rows.length === 0) return res.status(404).json({ error: "Chat not found" });
    const chat = chatResult.rows[0];
    res.json({
      id: chat.id, name: chat.other_participant.name || chat.other_participant.email,
      type: chat.type, created_by: chat.created_by, created_at: chat.created_at,
      updated_at: chat.updated_at, last_message: chat.last_message,
      last_message_at: chat.last_message_at, other_user: chat.other_participant,
    });
  } catch (error) {
    console.error("Error getting/creating direct chat:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a group chat
router.post("/group", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, memberIds } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Group name is required" });
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: "At least one member is required" });
    }
    const allMemberIds = [userId, ...memberIds.filter((id) => id !== userId)];
    console.log(`Creating group chat "${name}" with ${allMemberIds.length} members`);
    const chatResult = await query(
      `INSERT INTO chats (name, type, created_by) VALUES ($1, 'group', $2)
       RETURNING id, name, type, created_by, created_at, updated_at`,
      [name.trim(), userId]
    );
    const chat = chatResult.rows[0];
    for (const memberId of allMemberIds) {
      await query(
        `INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2) ON CONFLICT (chat_id, user_id) DO NOTHING`,
        [chat.id, memberId]
      );
    }
    console.log(`Group chat created: ${chat.id}`);
    res.json({
      id: chat.id, name: chat.name, type: chat.type, created_by: chat.created_by,
      created_at: chat.created_at, updated_at: chat.updated_at, memberIds: allMemberIds,
    });
  } catch (error) {
    console.error("Error creating group chat:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update chat's last message
router.patch("/:chatId/last-message", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const { lastMessage } = req.body;
    const check = await query(`SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`, [chatId, userId]);
    if (check.rows.length === 0) return res.status(403).json({ error: "Not a participant" });
    await query(`UPDATE chats SET last_message = $1, last_message_at = NOW(), updated_at = NOW() WHERE id = $2`, [lastMessage, chatId]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating chat last message:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
'''

cmd = f"""
cat > /var/www/summit/dist/routes/chats.js << 'ENDOFFILE'
{chats_js}
ENDOFFILE

echo "=== Deployed chats.js ==="
head -30 /var/www/summit/dist/routes/chats.js

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
