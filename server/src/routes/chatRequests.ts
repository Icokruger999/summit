import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { query } from "../lib/db.js";

const router = express.Router();

// Helper function to check and create/update chat request
export async function checkAndCreateChatRequest(
  requesterId: string,
  requesteeId: string,
  meetingId?: string,
  meetingTitle?: string
) {
  // Check if request already exists
  const existingRequest = await query(`
    SELECT id, status, meeting_id, meeting_title
    FROM chat_requests
    WHERE (requester_id = $1 AND requestee_id = $2) OR (requester_id = $2 AND requestee_id = $1)
  `, [requesterId, requesteeId]);

  if (existingRequest.rows.length > 0) {
    const existing = existingRequest.rows[0];
    
    // If already accepted, they're contacts - no need to create request
    if (existing.status === 'accepted') {
      return { exists: true, isContact: true };
    }
    
    // If declined, allow creating a new request (delete the old declined one)
    if (existing.status === 'declined') {
      await query(`DELETE FROM chat_requests WHERE id = $1`, [existing.id]);
      // Continue to create new request below
    } else {
      // If pending and we have meeting info, update it
      if (existing.status === 'pending' && meetingId && meetingTitle) {
        await query(`
          UPDATE chat_requests
          SET meeting_id = $1, meeting_title = $2, updated_at = NOW()
          WHERE id = $3
        `, [meetingId, meetingTitle, existing.id]);
        return { exists: true, updated: true, requestId: existing.id };
      }
      
      // If pending, return existing
      return { exists: true, requestId: existing.id, status: existing.status };
    }
  }

  // Create new request
  const result = await query(`
    INSERT INTO chat_requests (requester_id, requestee_id, meeting_id, meeting_title, status)
    VALUES ($1, $2, $3, $4, 'pending')
    RETURNING id
  `, [requesterId, requesteeId, meetingId || null, meetingTitle || null]);

  return { exists: false, created: true, requestId: result.rows[0].id };
}

// Send chat request
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { requesteeId, meetingId, meetingTitle } = req.body;

    if (!requesteeId) {
      return res.status(400).json({ error: "requesteeId is required" });
    }

    if (userId === requesteeId) {
      return res.status(400).json({ error: "Cannot send request to yourself" });
    }

    // Check if user exists
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [requesteeId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const result = await checkAndCreateChatRequest(userId, requesteeId, meetingId, meetingTitle);

    if (result.isContact) {
      return res.status(400).json({ error: "Users are already contacts" });
    }

    // If request already exists (pending), return it instead of error
    // Only return error if we're trying to create a duplicate without meeting info
    if (result.exists && !result.updated && !result.created) {
      // Request already exists - get it and return it
      const existingRequestId = result.requestId;
      
      // Get the existing request with user info
      const existingRequest = await query(`
      SELECT 
        cr.id,
        cr.requester_id,
        cr.requestee_id,
        cr.status,
        cr.meeting_id,
        cr.meeting_title,
        cr.created_at,
        cr.updated_at,
        u1.email as requester_email,
        u1.name as requester_name,
        u1.avatar_url as requester_avatar,
        u2.email as requestee_email,
        u2.name as requestee_name,
        u2.avatar_url as requestee_avatar
      FROM chat_requests cr
      JOIN users u1 ON cr.requester_id = u1.id
      JOIN users u2 ON cr.requestee_id = u2.id
      WHERE cr.id = $1
    `, [existingRequestId]);

      if (existingRequest.rows.length === 0) {
        return res.status(500).json({ error: "Failed to retrieve existing request" });
      }

      // Return the existing request (200 OK, not 201 Created)
      return res.json(existingRequest.rows[0]);
    }

    // Get the created/updated request with user info
    const requestResult = await query(`
      SELECT 
        cr.id,
        cr.requester_id,
        cr.requestee_id,
        cr.status,
        cr.meeting_id,
        cr.meeting_title,
        cr.created_at,
        cr.updated_at,
        u1.email as requester_email,
        u1.name as requester_name,
        u1.avatar_url as requester_avatar,
        u2.email as requestee_email,
        u2.name as requestee_name,
        u2.avatar_url as requestee_avatar
      FROM chat_requests cr
      JOIN users u1 ON cr.requester_id = u1.id
      JOIN users u2 ON cr.requestee_id = u2.id
      WHERE cr.id = $1
    `, [result.requestId]);

    if (requestResult.rows.length === 0) {
      return res.status(500).json({ error: "Failed to retrieve created request" });
    }

    res.status(201).json(requestResult.rows[0]);
  } catch (error: any) {
    console.error("Error sending chat request:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get pending requests (received by current user)
router.get("/received", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const result = await query(`
      SELECT 
        cr.id,
        cr.requester_id,
        cr.requestee_id,
        cr.status,
        cr.meeting_id,
        cr.meeting_title,
        cr.created_at,
        cr.updated_at,
        u.email as requester_email,
        u.name as requester_name,
        u.avatar_url as requester_avatar_url,
        u.company as requester_company,
        u.job_title as requester_job_title,
        u.phone as requester_phone
      FROM chat_requests cr
      JOIN users u ON cr.requester_id = u.id
      WHERE cr.requestee_id = $1 AND cr.status = 'pending'
      ORDER BY cr.created_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get sent requests
router.get("/sent", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const result = await query(`
      SELECT 
        cr.id,
        cr.requester_id,
        cr.requestee_id,
        cr.status,
        cr.meeting_id,
        cr.meeting_title,
        cr.created_at,
        cr.updated_at,
        u.email as requestee_email,
        u.name as requestee_name,
        u.avatar_url as requestee_avatar,
        u.company as requestee_company
      FROM chat_requests cr
      JOIN users u ON cr.requestee_id = u.id
      WHERE cr.requester_id = $1 AND cr.status = 'pending'
      ORDER BY cr.created_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching sent requests:", error);
    res.status(500).json({ error: error.message });
  }
});

// Accept chat request
router.post("/:id/accept", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const requestId = req.params.id;

    // Verify the request is for this user and is pending
    const requestCheck = await query(`
      SELECT requester_id, requestee_id, status
      FROM chat_requests
      WHERE id = $1 AND requestee_id = $2 AND status = 'pending'
    `, [requestId, userId]);

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: "Request not found or already processed" });
    }

    const request = requestCheck.rows[0];

    // Update request status to accepted
    await query(`
      UPDATE chat_requests
      SET status = 'accepted', updated_at = NOW()
      WHERE id = $1
    `, [requestId]);

    // Create reverse relationship (so both users see each other as contacts)
    // Check if reverse request exists
    const reverseCheck = await query(`
      SELECT id, status
      FROM chat_requests
      WHERE requester_id = $1 AND requestee_id = $2
    `, [userId, request.requester_id]);

    if (reverseCheck.rows.length === 0) {
      // Create reverse relationship
      await query(`
        INSERT INTO chat_requests (requester_id, requestee_id, status)
        VALUES ($1, $2, 'accepted')
        ON CONFLICT (requester_id, requestee_id) DO NOTHING
      `, [userId, request.requester_id]);
    } else if (reverseCheck.rows[0].status !== 'accepted') {
      // Update reverse relationship if it exists but isn't accepted
      await query(`
        UPDATE chat_requests
        SET status = 'accepted', updated_at = NOW()
        WHERE id = $1
      `, [reverseCheck.rows[0].id]);
    }

    // Create a direct chat between the two users so it appears in conversations
    let chatId = null;
    try {
      const chatResult = await query(
        `SELECT get_or_create_direct_chat($1, $2) as chat_id`,
        [userId, request.requester_id]
      );
      chatId = chatResult.rows[0]?.chat_id;
      console.log(`✅ Created/found chat ${chatId} for accepted contact request`);
    } catch (chatError) {
      console.error("Error creating chat for accepted request:", chatError);
      // Don't fail the accept if chat creation fails
    }

    res.json({ success: true, chatId });
  } catch (error: any) {
    console.error("Error accepting chat request:", error);
    res.status(500).json({ error: error.message });
  }
});

// Decline chat request
router.post("/:id/decline", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const requestId = req.params.id;

    // Verify the request is for this user and is pending
    const requestCheck = await query(`
      SELECT id
      FROM chat_requests
      WHERE id = $1 AND requestee_id = $2 AND status = 'pending'
    `, [requestId, userId]);

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: "Request not found or already processed" });
    }

    // Update request status to declined
    await query(`
      UPDATE chat_requests
      SET status = 'declined', updated_at = NOW()
      WHERE id = $1
    `, [requestId]);

    res.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error declining chat request:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all contacts (accepted requests) - Highly optimized query
router.get("/contacts", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Highly optimized query: UNION with DISTINCT ON to ensure unique contacts
    // Uses indexes on requester_id, requestee_id, and status
    const result = await query(`
      SELECT DISTINCT ON (contact_id)
        contact_id,
        contact_email,
        contact_name,
        contact_avatar_url,
        contact_company,
        contact_job_title,
        contact_phone,
        updated_at
      FROM (
        (
          SELECT 
            u.id as contact_id,
            u.email as contact_email,
            u.name as contact_name,
            u.avatar_url as contact_avatar_url,
            u.company as contact_company,
            u.job_title as contact_job_title,
            u.phone as contact_phone,
            cr.updated_at
          FROM chat_requests cr
          INNER JOIN users u ON cr.requestee_id = u.id
          WHERE cr.requester_id = $1 AND cr.status = 'accepted'
        )
        UNION ALL
        (
          SELECT 
            u.id as contact_id,
            u.email as contact_email,
            u.name as contact_name,
            u.avatar_url as contact_avatar_url,
            u.company as contact_company,
            u.job_title as contact_job_title,
            u.phone as contact_phone,
            cr.updated_at
          FROM chat_requests cr
          INNER JOIN users u ON cr.requester_id = u.id
          WHERE cr.requestee_id = $1 AND cr.status = 'accepted'
        )
      ) AS contacts
      ORDER BY contact_id, updated_at DESC
    `, [userId]);

    // Sort alphabetically by name (fallback to email) after deduplication
    const sorted = result.rows.sort((a, b) => {
      const nameA = (a.contact_name || a.contact_email || '').toLowerCase();
      const nameB = (b.contact_name || b.contact_email || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    res.json(sorted);
  } catch (error: any) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ 
      error: error.message || "Failed to fetch contacts"
    });
  }
});

// Check if two users are contacts
router.get("/contacts/check/:userId", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const otherUserId = req.params.userId;

    const result = await query(`
      SELECT id, status
      FROM chat_requests
      WHERE ((requester_id = $1 AND requestee_id = $2) OR (requester_id = $2 AND requestee_id = $1))
      AND status = 'accepted'
    `, [userId, otherUserId]);

    res.json({ isContact: result.rows.length > 0 });
  } catch (error: any) {
    console.error("Error checking contact status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Check request status between current user and another user
router.get("/status/:userId", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const otherUserId = req.params.userId;

    const result = await query(`
      SELECT id, status, requester_id, requestee_id
      FROM chat_requests
      WHERE (requester_id = $1 AND requestee_id = $2) OR (requester_id = $2 AND requestee_id = $1)
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId, otherUserId]);

    if (result.rows.length === 0) {
      return res.json({ status: null, isContact: false });
    }

    const request = result.rows[0];
    const isContact = request.status === 'accepted';
    const isRequester = request.requester_id === userId;

    res.json({
      status: request.status,
      isContact,
      isRequester,
      requestId: request.id,
    });
  } catch (error: any) {
    console.error("Error checking request status:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

