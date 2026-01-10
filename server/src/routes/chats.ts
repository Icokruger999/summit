import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { query } from "../lib/db.js";

const router = express.Router();

// Get all chats for the current user
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    console.log(`📥 GET /api/chats - User: ${userId}`);

    // Single optimized query - gets chats and other participant info in one go
    const result = await query(`
      SELECT 
        c.id,
        c.name,
        c.type,
        c.created_by,
        c.created_at,
        c.updated_at,
        c.last_message,
        c.last_message_at,
        COALESCE(c.last_message_at, c.updated_at, c.created_at) as sort_date,
        -- Get the sender ID of the last message
        (
          SELECT sender_id
          FROM messages
          WHERE chat_id = c.id AND deleted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 1
        ) as last_message_sender_id,
        -- Get other participant info for direct chats using subquery
        (
          SELECT json_build_object(
            'id', u.id,
            'name', u.name,
            'email', u.email,
            'avatar_url', u.avatar_url
          )
          FROM chat_participants ocp
          JOIN users u ON ocp.user_id = u.id
          WHERE ocp.chat_id = c.id AND ocp.user_id != $1
          LIMIT 1
        ) as other_participant
      FROM chats c
      INNER JOIN chat_participants cp ON c.id = cp.chat_id
      WHERE cp.user_id = $1
      ORDER BY sort_date DESC
    `, [userId]);

    const chatsWithParticipants = result.rows;

    console.log(`✅ Found ${chatsWithParticipants.length} chats for user ${userId}`);

    // Format the response
    const chats = chatsWithParticipants.map((row) => {
      const chat: any = {
        id: row.id,
        name: row.name,
        type: row.type,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_message: row.last_message,
        last_message_at: row.last_message_at,
      };

      // For direct chats, set name from other participant
      if (row.type === "direct" && row.other_participant) {
        chat.name = row.other_participant.name || row.other_participant.email;
        chat.other_user = row.other_participant;
      }

      // Include last message sender ID
      chat.last_message_sender_id = row.last_message_sender_id;

      return chat;
    });

    console.log(`📤 Sending ${chats.length} chats to client`);
    res.json(chats);
  } catch (error: any) {
    console.error("❌ Error fetching chats:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", error.detail || error.code);
    res.status(500).json({ error: error.message, details: error.detail || error.code });
  }
});

// Get or create a direct chat between current user and another user
router.post("/direct", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ error: "otherUserId is required" });
    }

    if (userId === otherUserId) {
      return res.status(400).json({ error: "Cannot create chat with yourself" });
    }

    console.log(`🔍 Getting/creating direct chat between ${userId} and ${otherUserId}`);
    
    // Use the database function to get or create the chat
    const result = await query(
      `SELECT get_or_create_direct_chat($1, $2) as chat_id`,
      [userId, otherUserId]
    );

    const chatId = result.rows[0].chat_id;
    console.log(`✅ Chat ID: ${chatId}`);

    // Get the full chat details
    const chatResult = await query(`
      SELECT 
        c.id,
        c.name,
        c.type,
        c.created_by,
        c.created_at,
        c.updated_at,
        c.last_message,
        c.last_message_at,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'avatar_url', u.avatar_url
        ) as other_participant
      FROM chats c
      INNER JOIN chat_participants cp ON c.id = cp.chat_id
      JOIN users u ON cp.user_id = u.id
      WHERE c.id = $1 AND cp.user_id != $2
      LIMIT 1
    `, [chatId, userId]);

    if (chatResult.rows.length === 0) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const chat = chatResult.rows[0];
    const response: any = {
      id: chat.id,
      name: chat.other_participant.name || chat.other_participant.email,
      type: chat.type,
      created_by: chat.created_by,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
      last_message: chat.last_message,
      last_message_at: chat.last_message_at,
      other_user: chat.other_participant,
    };

    res.json(response);
  } catch (error: any) {
    console.error("Error getting/creating direct chat:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update chat's last message
router.patch("/:chatId/last-message", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { chatId } = req.params;
    const { lastMessage } = req.body;

    // Verify user is a participant
    const participantCheck = await query(`
      SELECT 1 FROM chat_participants
      WHERE chat_id = $1 AND user_id = $2
    `, [chatId, userId]);

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: "Not a participant in this chat" });
    }

    // Update last message
    await query(`
      UPDATE chats
      SET last_message = $1, last_message_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `, [lastMessage, chatId]);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating chat last message:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

