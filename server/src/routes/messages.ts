import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { query } from "../lib/db.js";
import { messageNotifier } from "../lib/messageNotifier.js";

const router = express.Router();

// Get messages for a specific chat
router.get("/:chatId", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { chatId } = req.params;
    const { limit = 50, before } = req.query;

    // OPTIMIZED: Combine access check and message fetch in single query
    // Fetch messages (with pagination) - access check built into JOIN
    let messagesQuery = `
      SELECT 
        m.id,
        m.chat_id,
        m.sender_id,
        m.content,
        m.type,
        m.file_name,
        m.file_url,
        m.file_size,
        m.mime_type,
        m.created_at,
        m.edited_at,
        u.name as sender_name,
        u.email as sender_email
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      INNER JOIN chat_participants cp ON m.chat_id = cp.chat_id AND cp.user_id = $1
      WHERE m.chat_id = $2 AND m.deleted_at IS NULL
    `;

    const queryParams: any[] = [userId, chatId];
    let paramIndex = 3;

    if (before) {
      messagesQuery += ` AND m.created_at < $${paramIndex}`;
      queryParams.push(before);
      paramIndex++;
    }

    messagesQuery += ` ORDER BY m.created_at DESC LIMIT $${paramIndex}`;
    queryParams.push(limit);

    const result = await query(messagesQuery, queryParams);

    // Return messages in ascending order (oldest first)
    const messages = result.rows.reverse().map(row => ({
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      content: row.content,
      type: row.type,
      fileName: row.file_name,
      fileUrl: row.file_url,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      timestamp: row.created_at,
      editedAt: row.edited_at,
    }));

    res.json(messages);
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: error.message });
  }
});

// Save a new message
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id, chatId, content, type = 'text', fileName, fileUrl, fileSize, mimeType } = req.body;

    if (!id || !chatId) {
      return res.status(400).json({ error: "Message ID and chat ID are required" });
    }

    // OPTIMIZED: Combine access check, duplicate check, insert, and update in fewer queries
    // Check access and message existence, then insert in a transaction-like pattern
    const accessCheck = await query(
      `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
      [chatId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: "You don't have access to this chat" });
    }

    // Check if message already exists (prevent duplicates) - use SELECT 1 for performance
    const existingMessage = await query(
      `SELECT 1 FROM messages WHERE id = $1`,
      [id]
    );

    if (existingMessage.rows.length > 0) {
      return res.json({ success: true, message: "Message already exists" });
    }

    // OPTIMIZED: Combine insert and update in a single query using CTE (Common Table Expression)
    await query(
      `WITH inserted_message AS (
        INSERT INTO messages (id, chat_id, sender_id, content, type, file_name, file_url, file_size, mime_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING chat_id, COALESCE($4, $6, 'File') as last_msg
      )
      UPDATE chats 
      SET last_message = (SELECT last_msg FROM inserted_message),
          last_message_at = NOW(),
          updated_at = NOW()
      WHERE id = (SELECT chat_id FROM inserted_message)`,
      [id, chatId, userId, content, type, fileName, fileUrl, fileSize, mimeType]
    );

    // Get participants in the chat (excluding sender - they already have the message)
    // Also get sender's name for the notification
    const [participants, senderInfo] = await Promise.all([
      query(
        `SELECT user_id FROM chat_participants WHERE chat_id = $1 AND user_id != $2`,
        [chatId, userId]
      ),
      query(
        `SELECT name, email FROM users WHERE id = $1`,
        [userId]
      )
    ]);

    const senderName = senderInfo.rows[0]?.name || senderInfo.rows[0]?.email || "Unknown";

    // Send real-time notification to other participants only (sender already has message optimistically)
    if (participants.rows.length > 0) {
      const userIds = participants.rows.map(row => row.user_id);
      messageNotifier.notifyUsers(userIds, {
        chatId,
        messageId: id,
        senderId: userId,
        senderName,
        content,
        type,
        timestamp: new Date().toISOString(),
      });
      console.log(`📤 Sent WebSocket notification to ${userIds.length} recipients for message ${id}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error saving message:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a message (soft delete)
router.delete("/:messageId", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { messageId } = req.params;

    // Verify user is the sender
    const messageCheck = await query(
      `SELECT sender_id FROM messages WHERE id = $1`,
      [messageId]
    );

    if (messageCheck.rows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (messageCheck.rows[0].sender_id !== userId) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    // Soft delete
    await query(
      `UPDATE messages SET deleted_at = NOW() WHERE id = $1`,
      [messageId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read (when chat is viewed)
router.post("/read", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { messageIds, chatId } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: "messageIds array is required" });
    }

    // If chatId is provided, verify user has access
    if (chatId) {
      const chatCheck = await query(
        `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
        [chatId, userId]
      );

      if (chatCheck.rows.length === 0) {
        return res.status(403).json({ error: "You don't have access to this chat" });
      }
    }

    // Get messages that belong to this user's chats and were sent by others
    const messagesQuery = chatId
      ? `SELECT m.id, m.sender_id 
         FROM messages m
         JOIN chat_participants cp ON m.chat_id = cp.chat_id
         WHERE m.id = ANY($1::text[]) 
           AND cp.user_id = $2
           AND m.chat_id = $3
           AND m.sender_id != $2
           AND m.deleted_at IS NULL`
      : `SELECT m.id, m.sender_id 
         FROM messages m
         JOIN chat_participants cp ON m.chat_id = cp.chat_id
         WHERE m.id = ANY($1::text[]) 
           AND cp.user_id = $2
           AND m.sender_id != $2
           AND m.deleted_at IS NULL`;

    const queryParams = chatId ? [messageIds, userId, chatId] : [messageIds, userId];
    const validMessages = await query(messagesQuery, queryParams);

    if (validMessages.rows.length === 0) {
      return res.json({ success: true, readCount: 0 });
    }

    // Insert read receipts (ON CONFLICT DO NOTHING handles duplicates)
    const insertQuery = `
      INSERT INTO read_receipts (message_id, user_id)
      SELECT unnest($1::text[]), $2
      ON CONFLICT (message_id, user_id) DO NOTHING
    `;

    const validMessageIds = validMessages.rows.map(row => row.id);
    await query(insertQuery, [validMessageIds, userId]);

    // Notify senders that their messages have been read
    const senders = new Set(validMessages.rows.map(row => row.sender_id));
    for (const senderId of senders) {
      const senderMessageIds = validMessages.rows.filter(row => row.sender_id === senderId).map(row => row.id);
      messageNotifier.notifyUser(senderId, {
        messageIds: senderMessageIds,
        readBy: userId,
        chatId,
      }, "MESSAGES_READ");
    }

    res.json({ success: true, readCount: validMessageIds.length });
  } catch (error: any) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get read receipts for messages
router.post("/reads", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: "messageIds array is required" });
    }

    // Get read receipts for messages sent by the current user
    // This helps the sender see which of their messages have been read
    const receiptsQuery = `
      SELECT rr.message_id, rr.user_id, rr.read_at, u.name as reader_name
      FROM read_receipts rr
      JOIN messages m ON rr.message_id = m.id
      JOIN users u ON rr.user_id = u.id
      WHERE rr.message_id = ANY($1::text[])
        AND m.sender_id = $2
      ORDER BY rr.read_at DESC
    `;

    const receipts = await query(receiptsQuery, [messageIds, userId]);

    // Group by message_id
    const receiptsByMessage: Record<string, any[]> = {};
    receipts.rows.forEach(row => {
      if (!receiptsByMessage[row.message_id]) {
        receiptsByMessage[row.message_id] = [];
      }
      receiptsByMessage[row.message_id].push({
        userId: row.user_id,
        userName: row.reader_name,
        readAt: row.read_at,
      });
    });

    res.json(receiptsByMessage);
  } catch (error: any) {
    console.error("Error fetching read receipts:", error);
    res.status(500).json({ error: error.message });
  }
});

// Send typing indicator
router.post("/typing", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { chatId, isTyping } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: "chatId is required" });
    }

    if (typeof isTyping !== "boolean") {
      return res.status(400).json({ error: "isTyping must be a boolean" });
    }

    // Verify user has access to this chat
    const chatCheck = await query(
      `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
      [chatId, userId]
    );

    if (chatCheck.rows.length === 0) {
      return res.status(403).json({ error: "You don't have access to this chat" });
    }

    // OPTIMIZED: Get user info and participants in parallel queries
    const [userInfo, participants] = await Promise.all([
      query(`SELECT name, email FROM users WHERE id = $1`, [userId]),
      query(`SELECT user_id FROM chat_participants WHERE chat_id = $1 AND user_id != $2`, [chatId, userId])
    ]);

    if (userInfo.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userName = userInfo.rows[0].name || userInfo.rows[0].email || "Someone";

    // Notify all other participants about typing status
    if (participants.rows.length > 0) {
      const userIds = participants.rows.map(row => row.user_id);
      userIds.forEach((participantId) => {
        messageNotifier.notifyUser(participantId, {
          chatId,
          userId,
          userName,
          isTyping,
        }, "TYPING");
      });
      console.log(`📝 Typing indicator sent to ${userIds.length} participants (isTyping: ${isTyping})`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error sending typing indicator:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
