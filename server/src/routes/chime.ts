import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { messageNotifier } from "../lib/messageNotifier.js";
import { ChimeSDKMeetings } from "@aws-sdk/client-chime-sdk-meetings";
import crypto from "crypto";

const router = express.Router();

const chimeClient = new ChimeSDKMeetings({
  region: process.env.AWS_REGION || "us-east-1",
});

// POST /api/chime/meeting - Create a new Chime meeting
router.post("/meeting", authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: "chatId is required" });
    }

    // Hash chatId to ensure it's ≤64 characters for ExternalMeetingId
    const externalMeetingId = crypto
      .createHash("sha256")
      .update(chatId)
      .digest("hex")
      .substring(0, 64);

    // Create meeting
    const meeting = await chimeClient.createMeeting({
      ExternalMeetingId: externalMeetingId,
      MediaRegion: "us-east-1",
      ClientRequestToken: Date.now().toString(),
    });

    console.log("Meeting created:", meeting.Meeting?.MeetingId);

    res.json({ meeting: meeting.Meeting });
  } catch (error: any) {
    console.error("Error creating Chime meeting:", error);
    res.status(500).json({ error: error.message || "Failed to create meeting" });
  }
});

// POST /api/chime/attendee - Create attendee for a meeting
router.post("/attendee", authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: "meetingId is required" });
    }

    console.log("Creating attendee for meeting:", meetingId);

    const attendee = await chimeClient.createAttendee({
      MeetingId: meetingId,
      ExternalUserId: req.user!.id,
    });

    console.log("Attendee created:", attendee.Attendee?.AttendeeId);

    res.json({ attendee: attendee.Attendee });
  } catch (error: any) {
    console.error("Error creating attendee:", error);
    res.status(500).json({ error: error.message || "Failed to create attendee" });
  }
});

// DELETE /api/chime/meeting/:meetingId - End a meeting
router.delete("/meeting/:meetingId", authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;

    await chimeClient.deleteMeeting({
      MeetingId: meetingId,
    });

    console.log("Meeting deleted:", meetingId);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: error.message || "Failed to delete meeting" });
  }
});

// POST /api/chime/notify - Send call notification to another user
router.post("/notify", authenticateToken, async (req, res) => {
  try {
    const { recipientId, roomName, callType } = req.body;

    if (!recipientId || !roomName) {
      return res.status(400).json({ error: "recipientId and roomName are required" });
    }

    const callerId = req.user!.id;
    const callerName = req.user!.name || req.user!.email;

    console.log(`📞 Sending call notification from ${callerName} to user ${recipientId}`);

    // Send WebSocket notification to recipient
    messageNotifier.notifyUser(recipientId, {
      type: "INCOMING_CALL",
      callerId,
      callerName,
      roomName,
      callType: callType || "video",
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error sending call notification:", error);
    res.status(500).json({ error: error.message || "Failed to send call notification" });
  }
});

export default router;
