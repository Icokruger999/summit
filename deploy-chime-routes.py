#!/usr/bin/env python3
"""Deploy Chime routes to the server"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

# Create the chime.js route file
create_chime_cmd = '''
cat > /var/www/summit/server/dist/routes/chime.js << 'CHIME_EOF'
import express from "express";
import { authenticate } from "../middleware/auth.js";
import { messageNotifier } from "../lib/messageNotifier.js";
import { ChimeSDKMeetings } from "@aws-sdk/client-chime-sdk-meetings";
import crypto from "crypto";

const router = express.Router();

// Chime SDK MUST use us-east-1 region
const chimeClient = new ChimeSDKMeetings({
  region: "us-east-1",
});

// Store active meetings in memory
const activeMeetings = new Map();

// POST /api/chime/meeting - Create a new Chime meeting
router.post("/meeting", authenticate, async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: "chatId is required" });
    }

    // Hash chatId to ensure it's ≤64 characters
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

    // Cache the meeting
    if (meeting.Meeting) {
      activeMeetings.set(externalMeetingId, meeting.Meeting);
    }

    res.json({ meeting: meeting.Meeting });
  } catch (error) {
    console.error("Error creating Chime meeting:", error);
    res.status(500).json({ error: error.message || "Failed to create meeting" });
  }
});

// GET /api/chime/meeting/:chatId - Get existing meeting for a chat
router.get("/meeting/:chatId", authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;

    const externalMeetingId = crypto
      .createHash("sha256")
      .update(chatId)
      .digest("hex")
      .substring(0, 64);

    const cachedMeeting = activeMeetings.get(externalMeetingId);
    
    if (cachedMeeting) {
      try {
        const meetingInfo = await chimeClient.getMeeting({
          MeetingId: cachedMeeting.MeetingId,
        });
        
        if (meetingInfo.Meeting) {
          console.log("Found existing meeting:", cachedMeeting.MeetingId);
          return res.json({ meeting: meetingInfo.Meeting });
        }
      } catch (error) {
        console.log("Cached meeting no longer exists, removing from cache");
        activeMeetings.delete(externalMeetingId);
      }
    }

    res.status(404).json({ error: "No active meeting found for this chat" });
  } catch (error) {
    console.error("Error getting Chime meeting:", error);
    res.status(500).json({ error: error.message || "Failed to get meeting" });
  }
});

// POST /api/chime/attendee - Create attendee for a meeting
router.post("/attendee", authenticate, async (req, res) => {
  try {
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: "meetingId is required" });
    }

    console.log("Creating attendee for meeting:", meetingId);

    const attendee = await chimeClient.createAttendee({
      MeetingId: meetingId,
      ExternalUserId: req.user.id,
    });

    console.log("Attendee created:", attendee.Attendee?.AttendeeId);

    res.json({ attendee: attendee.Attendee });
  } catch (error) {
    console.error("Error creating attendee:", error);
    res.status(500).json({ error: error.message || "Failed to create attendee" });
  }
});

// DELETE /api/chime/meeting/:meetingId - End a meeting
router.delete("/meeting/:meetingId", authenticate, async (req, res) => {
  try {
    const { meetingId } = req.params;

    await chimeClient.deleteMeeting({
      MeetingId: meetingId,
    });

    console.log("Meeting deleted:", meetingId);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: error.message || "Failed to delete meeting" });
  }
});

// POST /api/chime/notify - Send call notification to another user
router.post("/notify", authenticate, async (req, res) => {
  try {
    const { recipientId, roomName, callType } = req.body;

    if (!recipientId || !roomName) {
      return res.status(400).json({ error: "recipientId and roomName are required" });
    }

    const callerId = req.user.id;
    const callerName = req.user.name || req.user.email;

    console.log("📞 Sending call notification from " + callerName + " to user " + recipientId);

    messageNotifier.notifyUser(recipientId, {
      callerId,
      callerName,
      roomName,
      callType: callType || "video",
      timestamp: new Date().toISOString(),
    }, "INCOMING_CALL");

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending call notification:", error);
    res.status(500).json({ error: error.message || "Failed to send call notification" });
  }
});

export default router;
CHIME_EOF

echo "✅ Created chime.js route file"
'''

print("Creating chime.js route file...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [create_chime_cmd]},
    TimeoutSeconds=30
)
command_id = response['Command']['CommandId']
time.sleep(5)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)
print(output.get('StandardOutputContent', ''))
if output.get('StandardErrorContent'):
    print(f"STDERR: {output['StandardErrorContent']}")

# Now add the import and route to index.js
add_route_cmd = '''
cd /var/www/summit/server/dist

# Add import for chime routes after the last import
sed -i '/import summitRoutes/a import chimeRoutes from "./routes/chime.js";' index.js

# Add the route after summit routes
sed -i '/app.use.*summit.*summitRoutes/a app.use("/api/chime", chimeRoutes);' index.js

echo "=== Verify chime is added ==="
grep -n "chime" index.js

# Restart PM2
pm2 restart summit-backend
sleep 3

echo ""
echo "=== PM2 Status ==="
pm2 list

echo ""
echo "=== Test chime endpoint ==="
curl -s http://localhost:4000/api/chime/meeting/test 2>&1 | head -c 200
'''

print("\nAdding chime routes to index.js...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [add_route_cmd]},
    TimeoutSeconds=60
)
command_id = response['Command']['CommandId']
time.sleep(10)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)
print(output.get('StandardOutputContent', ''))
if output.get('StandardErrorContent'):
    print(f"STDERR: {output['StandardErrorContent']}")
