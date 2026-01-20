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
        // Also include flat fields for frontend compatibility
        chat.other_user_id = row.other_participant.id;
        chat.other_user_name = row.other_participant.name;
        chat.other_user_email = row.other_participant.email;
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

// Create a group chat
router.post("/group", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name, memberIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Group name is required" });
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: "At least one member is required" });
    }

    // Include the creator in the members list
    const allMemberIds = [userId, ...memberIds.filter((id: string) => id !== userId)];

    console.log(`👥 Creating group chat "${name}" with ${allMemberIds.length} members`);

    // Create the chat
    const chatResult = await query(
      `INSERT INTO chats (name, type, created_by)
       VALUES ($1, 'group', $2)
       RETURNING id, name, type, created_by, created_at, updated_at`,
      [name.trim(), userId]
    );

    const chat = chatResult.rows[0];

    // Add all participants
    for (const memberId of allMemberIds) {
      await query(
        `INSERT INTO chat_participants (chat_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (chat_id, user_id) DO NOTHING`,
        [chat.id, memberId]
      );
    }

    console.log(`✅ Group chat created: ${chat.id}`);

    res.json({
      id: chat.id,
      name: chat.name,
      type: chat.type,
      created_by: chat.created_by,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
      memberIds: allMemberIds,
    });
  } catch (error: any) {
    console.error("Error creating group chat:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update group chat name
router.patch("/:chatId/name", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { chatId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Verify user is a participant and chat is a group
    const chatCheck = await query(`
      SELECT c.type, c.created_by
      FROM chats c
      INNER JOIN chat_participants cp ON c.id = cp.chat_id
      WHERE c.id = $1 AND cp.user_id = $2
    `, [chatId, userId]);

    if (chatCheck.rows.length === 0) {
      return res.status(403).json({ error: "Not a participant in this chat" });
    }

    if (chatCheck.rows[0].type !== "group") {
      return res.status(400).json({ error: "Can only rename group chats" });
    }

    // Update name
    await query(`
      UPDATE chats
      SET name = $1, updated_at = NOW()
      WHERE id = $2
    `, [name.trim(), chatId]);

    res.json({ success: true, name: name.trim() });
  } catch (error: any) {
    console.error("Error updating group chat name:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add members to group chat
router.post("/:chatId/members", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { chatId } = req.params;
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: "At least one member ID is required" });
    }

    // Verify user is a participant and chat is a group
    const chatCheck = await query(`
      SELECT c.type
      FROM chats c
      INNER JOIN chat_participants cp ON c.id = cp.chat_id
      WHERE c.id = $1 AND cp.user_id = $2
    `, [chatId, userId]);

    if (chatCheck.rows.length === 0) {
      return res.status(403).json({ error: "Not a participant in this chat" });
    }

    if (chatCheck.rows[0].type !== "group") {
      return res.status(400).json({ error: "Can only add members to group chats" });
    }

    // Add new members
    for (const memberId of memberIds) {
      await query(
        `INSERT INTO chat_participants (chat_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (chat_id, user_id) DO NOTHING`,
        [chatId, memberId]
      );
    }

    res.json({ success: true, addedCount: memberIds.length });
  } catch (error: any) {
    console.error("Error adding members to group chat:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete/leave group chat
router.delete("/:chatId", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { chatId } = req.params;

    // Check if user is participant
    const participantCheck = await query(`
      SELECT c.type, c.created_by
      FROM chats c
      INNER JOIN chat_participants cp ON c.id = cp.chat_id
      WHERE c.id = $1 AND cp.user_id = $2
    `, [chatId, userId]);

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: "Not a participant in this chat" });
    }

    const chat = participantCheck.rows[0];

    // For group chats, remove the user from participants
    if (chat.type === "group") {
      await query(`
        DELETE FROM chat_participants
        WHERE chat_id = $1 AND user_id = $2
      `, [chatId, userId]);

      // Check if there are any participants left
      const remainingParticipants = await query(`
        SELECT COUNT(*) as count
        FROM chat_participants
        WHERE chat_id = $1
      `, [chatId]);

      // If no participants left, delete the chat
      if (parseInt(remainingParticipants.rows[0].count) === 0) {
        await query(`DELETE FROM chats WHERE id = $1`, [chatId]);
      }

      res.json({ success: true, action: "left" });
    } else {
      // For direct chats, just remove the user from participants
      await query(`
        DELETE FROM chat_participants
        WHERE chat_id = $1 AND user_id = $2
      `, [chatId, userId]);

      res.json({ success: true, action: "deleted" });
    }
  } catch (error: any) {
    console.error("Error deleting/leaving chat:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

