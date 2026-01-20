#!/usr/bin/env python3
import boto3
import time

instance_id = "i-0fba58db502cc8d39"
region = "eu-west-1"

ssm = boto3.client('ssm', region_name=region)

print("DEPLOYING CHIME ROUTES SAFELY")
print("=" * 60)

# First, let's check what the auth middleware exports
check_auth = '''
echo "Checking auth middleware exports..."
grep -A 5 "export" /var/www/summit/dist/middleware/auth.js | head -20
'''

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': [check_auth]},
    TimeoutSeconds=30
)

command_id = response['Command']['CommandId']
time.sleep(3)

try:
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id,
    )
    print("AUTH MIDDLEWARE EXPORTS:")
    print(output['StandardOutputContent'])
except Exception as e:
    print(f"Error: {e}")

time.sleep(2)

# Now create the chime.js file with the CORRECT import
chime_js_content = '''import express from "express";
import { authenticate } from "../middleware/auth.js";
import { messageNotifier } from "../lib/messageNotifier.js";
import { ChimeSDKMeetings } from "@aws-sdk/client-chime-sdk-meetings";
import crypto from "crypto";

const router = express.Router();

const chimeClient = new ChimeSDKMeetings({
  region: "us-east-1",
});

const activeMeetings = new Map();

router.post("/meeting", authenticate, async (req, res) => {
  try {
    const { chatId } = req.body;
    if (!chatId) {
      return res.status(400).json({ error: "chatId is required" });
    }

    const externalMeetingId = crypto
      .createHash("sha256")
      .update(chatId)
      .digest("hex")
      .substring(0, 64);

    const meeting = await chimeClient.createMeeting({
      ExternalMeetingId: externalMeetingId,
      MediaRegion: "us-east-1",
      ClientRequestToken: Date.now().toString(),
    });

    console.log("Meeting created:", meeting.Meeting?.MeetingId);

    if (meeting.Meeting) {
      activeMeetings.set(externalMeetingId, meeting.Meeting);
    }

    res.json({ meeting: meeting.Meeting });
  } catch (error) {
    console.error("Error creating Chime meeting:", error);
    res.status(500).json({ error: error.message || "Failed to create meeting" });
  }
});

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

router.post("/notify", authenticate, async (req, res) => {
  try {
    const { recipientId, roomName, callType } = req.body;
    if (!recipientId || !roomName) {
      return res.status(400).json({ error: "recipientId and roomName are required" });
    }

    const callerId = req.user.id;
    const callerName = req.user.name || req.user.email;

    console.log(`📞 Sending call notification from ${callerName} to user ${recipientId}`);

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
'''

# Create the chime.js file
create_chime = f'''
cat > /var/www/summit/dist/routes/chime.js << 'CHIME_EOF'
{chime_js_content}
CHIME_EOF

echo "Chime route created"
ls -lah /var/www/summit/dist/routes/chime.js
'''

print("\n" + "="*60)
print("Creating chime.js file...")
print("="*60)

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': [create_chime]},
    TimeoutSeconds=30
)

command_id = response['Command']['CommandId']
time.sleep(3)

try:
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id,
    )
    print(output['StandardOutputContent'])
    if output['StandardErrorContent']:
        print("STDERR:", output['StandardErrorContent'])
except Exception as e:
    print(f"Error: {e}")

time.sleep(2)

# Add chime import and route to index.js
add_to_index = '''
# Check if chime is already imported
if grep -q "chimeRoutes" /var/www/summit/dist/index.js; then
    echo "Chime already in index.js"
else
    # Add import after other route imports
    sed -i '/import presenceRoutes from/a import chimeRoutes from "./routes/chime.js";' /var/www/summit/dist/index.js
    
    # Add route registration after presence route
    sed -i '/app.use("\\/api\\/presence", presenceRoutes);/a app.use("/api/chime", chimeRoutes);' /var/www/summit/dist/index.js
    
    echo "Chime added to index.js"
fi

# Verify it was added
echo "Checking index.js..."
grep -n "chime" /var/www/summit/dist/index.js
'''

print("\n" + "="*60)
print("Adding chime to index.js...")
print("="*60)

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': [add_to_index]},
    TimeoutSeconds=30
)

command_id = response['Command']['CommandId']
time.sleep(3)

try:
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id,
    )
    print(output['StandardOutputContent'])
    if output['StandardErrorContent']:
        print("STDERR:", output['StandardErrorContent'])
except Exception as e:
    print(f"Error: {e}")

time.sleep(2)

# Restart PM2
restart_pm2 = '''
export HOME=/home/ubuntu
pm2 restart summit-backend
sleep 3
pm2 status
pm2 logs summit-backend --lines 20 --nostream
'''

print("\n" + "="*60)
print("Restarting PM2...")
print("="*60)

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': [restart_pm2]},
    TimeoutSeconds=30
)

command_id = response['Command']['CommandId']
time.sleep(5)

try:
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id,
    )
    print(output['StandardOutputContent'])
    if output['StandardErrorContent']:
        print("STDERR:", output['StandardErrorContent'])
except Exception as e:
    print(f"Error: {e}")

time.sleep(2)

# Test the endpoints
test_endpoints = '''
echo "Testing health endpoint..."
curl -s http://localhost:4000/health

echo ""
echo "Testing chime endpoint (should get 401 without auth)..."
curl -s http://localhost:4000/api/chime/meeting/test
'''

print("\n" + "="*60)
print("Testing endpoints...")
print("="*60)

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': [test_endpoints]},
    TimeoutSeconds=30
)

command_id = response['Command']['CommandId']
time.sleep(3)

try:
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id,
    )
    print(output['StandardOutputContent'])
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*60)
print("DEPLOYMENT COMPLETE")
print("="*60)
