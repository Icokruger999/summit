import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { query } from "../lib/db.js";
import { checkAndCreateChatRequest } from "./chatRequests.js";
import { messageNotifier } from "../lib/messageNotifier.js";

const router = express.Router();

// Get all meetings for a user (OPTIMIZED: Single query with JSON aggregation instead of N+1)
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Optimized: Get meetings and participants in a single query using JSON aggregation
    // Note: recurrence (JSONB) cannot be used in GROUP BY or aggregate functions directly
    // Solution: Use DISTINCT ON with a subquery to get unique meetings, then join participants
    const result = await query(`
      WITH meeting_base AS (
        SELECT DISTINCT ON (m.id)
          m.id,
          m.title,
          m.description,
          m.start_time,
          m.end_time,
          m.room_id,
          m.created_by,
          m.recurrence,
          m.created_at,
          m.updated_at
        FROM meetings m
        WHERE m.created_by = $1 OR EXISTS (
          SELECT 1 FROM meeting_participants mp2 
          WHERE mp2.meeting_id = m.id AND mp2.user_id = $1
        )
        ORDER BY m.id, m.start_time
      ),
      participants_agg AS (
        SELECT
          mp.meeting_id,
          json_agg(
            jsonb_build_object(
              'id', u.id,
              'email', u.email,
              'name', u.name,
              'avatar_url', u.avatar_url,
              'status', mp.status
            ) ORDER BY u.name
          ) FILTER (WHERE u.id IS NOT NULL) as participants
        FROM meeting_participants mp
        JOIN users u ON mp.user_id = u.id
        WHERE mp.meeting_id IN (SELECT id FROM meeting_base)
        GROUP BY mp.meeting_id
      )
      SELECT
        mb.*,
        COALESCE(pa.participants, '[]'::json) as participants
      FROM meeting_base mb
      LEFT JOIN participants_agg pa ON mb.id = pa.meeting_id
      ORDER BY mb.start_time ASC
    `, [userId]);

    // Format response - participants is already a JSON array
    const meetings = result.rows.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      room_id: meeting.room_id,
      created_by: meeting.created_by,
      recurrence: meeting.recurrence,
      created_at: meeting.created_at,
      updated_at: meeting.updated_at,
      participants: meeting.participants || [],
    }));

    res.json(meetings);
  } catch (error: any) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new meeting
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { title, description, start_time, end_time, participant_ids, recurrence, dont_include_creator } = req.body;

    // Generate room_id for LiveKit
    const room_id = `meeting-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create meeting
    const meetingResult = await query(`
      INSERT INTO meetings (title, description, start_time, end_time, room_id, created_by, recurrence)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title, description, start_time, end_time, room_id, userId, recurrence ? JSON.stringify(recurrence) : null]);

    const meeting = meetingResult.rows[0];

    // Add creator as participant only if not excluded
    if (!dont_include_creator) {
      await query(`
        INSERT INTO meeting_participants (meeting_id, user_id, status)
        VALUES ($1, $2, 'accepted')
        ON CONFLICT (meeting_id, user_id) DO UPDATE SET status = 'accepted'
      `, [meeting.id, userId]);
    }

    // Add participants (OPTIMIZED: Batch insert instead of loop)
    if (participant_ids && participant_ids.length > 0) {
      // Batch insert participants
      const participantValues = participant_ids.map((_: string, index: number) => 
        `($1, $${index + 2}, 'pending')`
      ).join(', ');
      const participantParams = [meeting.id, ...participant_ids];
      
      await query(`
        INSERT INTO meeting_participants (meeting_id, user_id, status)
        VALUES ${participantValues}
        ON CONFLICT (meeting_id, user_id) DO NOTHING
      `, participantParams);

      // Batch insert invitations
      const invitationValues = participant_ids.map((_: string, index: number) => 
        `($1, $2, $${index + 3}, 'pending')`
      ).join(', ');
      const invitationParams = [meeting.id, userId, ...participant_ids];
      
      await query(`
        INSERT INTO meeting_invitations (meeting_id, inviter_id, invitee_id, status)
        VALUES ${invitationValues}
        ON CONFLICT (meeting_id, invitee_id) DO NOTHING
      `, invitationParams);

      // Check if users are contacts (run in parallel but don't block)
      const chatRequestPromises = participant_ids.map(async (participantId: string) => {
        try {
          await checkAndCreateChatRequest(userId, participantId, meeting.id, title);
        } catch (error) {
          console.error(`Error creating chat request for meeting participant ${participantId}:`, error);
        }
      });
      
      // Run chat requests in background (don't await)
      Promise.all(chatRequestPromises).catch(err => 
        console.error('Error in chat request batch:', err)
      );

      // Get inviter info for notification
      const inviterInfo = await query(
        `SELECT name, email FROM users WHERE id = $1`,
        [userId]
      );
      const inviterName = inviterInfo.rows[0]?.name || inviterInfo.rows[0]?.email || "Someone";

      // Send WebSocket notifications to all participants about the meeting invitation
      participant_ids.forEach((participantId: string) => {
        messageNotifier.notifyUser(participantId, {
          meetingId: meeting.id,
          meetingTitle: title,
          meetingStartTime: start_time,
          meetingEndTime: end_time,
          inviterName,
          inviterId: userId,
        }, "MEETING_INVITATION");
      });
      
      console.log(`📅 Sent meeting invitation notifications to ${participant_ids.length} participants`);
    }

    // Get participants
    const participantsResult = await query(`
      SELECT u.id, u.email, u.name, u.avatar_url, mp.status
      FROM meeting_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.meeting_id = $1
    `, [meeting.id]);

    res.json({
      ...meeting,
      participants: participantsResult.rows,
    });
  } catch (error: any) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get meeting invitations for a user
router.get("/invitations", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const result = await query(`
      SELECT 
        mi.*,
        m.title,
        m.description,
        m.start_time,
        m.end_time,
        m.room_id,
        u.email as inviter_email,
        u.name as inviter_name
      FROM meeting_invitations mi
      JOIN meetings m ON mi.meeting_id = m.id
      JOIN users u ON mi.inviter_id = u.id
      WHERE mi.invitee_id = $1 AND mi.status = 'pending'
      ORDER BY m.start_time ASC
    `, [userId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching invitations:", error);
    res.status(500).json({ error: error.message });
  }
});

// Accept meeting invitation
router.post("/invitations/:id/accept", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const invitationId = req.params.id;

    // Update invitation status
    await query(`
      UPDATE meeting_invitations
      SET status = 'accepted', updated_at = NOW()
      WHERE id = $1 AND invitee_id = $2
    `, [invitationId, userId]);

    // Update participant status
    const invitationResult = await query(`
      SELECT meeting_id FROM meeting_invitations WHERE id = $1
    `, [invitationId]);

    if (invitationResult.rows.length > 0) {
      await query(`
        UPDATE meeting_participants
        SET status = 'accepted'
        WHERE meeting_id = $1 AND user_id = $2
      `, [invitationResult.rows[0].meeting_id, userId]);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error accepting invitation:", error);
    res.status(500).json({ error: error.message });
  }
});

// Decline meeting invitation
router.post("/invitations/:id/decline", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const invitationId = req.params.id;

    // Update invitation status
    await query(`
      UPDATE meeting_invitations
      SET status = 'declined', updated_at = NOW()
      WHERE id = $1 AND invitee_id = $2
    `, [invitationId, userId]);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error declining invitation:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a meeting
router.put("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const meetingId = req.params.id;
    const { title, description, start_time, end_time, participant_ids, recurrence } = req.body;

    // Check if user is the creator
    const checkResult = await query(
      "SELECT created_by FROM meetings WHERE id = $1",
      [meetingId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    if (checkResult.rows[0].created_by !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Update meeting
    const updateResult = await query(`
      UPDATE meetings
      SET title = $1, description = $2, start_time = $3, end_time = $4, recurrence = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [title, description, start_time, end_time, recurrence ? JSON.stringify(recurrence) : null, meetingId]);

    // Update participants if provided (OPTIMIZED: Batch operations)
    if (participant_ids) {
      // Delete existing participants
      await query("DELETE FROM meeting_participants WHERE meeting_id = $1", [meetingId]);

      // Batch insert new participants
      if (participant_ids.length > 0) {
        const values = participant_ids.map((_: string, index: number) => 
          `($1, $${index + 2}, 'pending')`
        ).join(', ');
        const params = [meetingId, ...participant_ids];
        
        await query(`
          INSERT INTO meeting_participants (meeting_id, user_id, status)
          VALUES ${values}
        `, params);
      }
    }

    res.json(updateResult.rows[0]);
  } catch (error: any) {
    console.error("Error updating meeting:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a meeting
router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const meetingId = req.params.id;

    // Check if user is the creator
    const checkResult = await query(
      "SELECT created_by FROM meetings WHERE id = $1",
      [meetingId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    if (checkResult.rows[0].created_by !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Delete meeting (cascade will handle participants and invitations)
    await query("DELETE FROM meetings WHERE id = $1", [meetingId]);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
