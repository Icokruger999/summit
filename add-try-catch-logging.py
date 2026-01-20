#!/usr/bin/env python3
"""
Add logging at every step of Chime meeting creation
"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    command_id = response['Command']['CommandId']
    time.sleep(3)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip()

print("🔧 ADDING STEP-BY-STEP LOGGING")
print("=" * 60)

print("\n1. Backing up...")
stdout = run_command("cd /var/www/summit && cp index.js index.js.backup-before-step-logging")
print("   ✅ Backup created")

print("\n2. Adding detailed step logging...")
fix_script = """
cd /var/www/summit
chmod 644 index.js

# Replace the Chime meeting endpoint with detailed logging
cat > /tmp/chime_endpoint.js << 'ENDOFFILE'
app.post('/api/chime/meeting', authenticate, async (req, res) => {
  console.log('=== CHIME MEETING CREATION START ===');
  try {
    const { chatId } = req.body;
    const userId = req.user.id;
    console.log('1. Request received - chatId:', chatId, 'userId:', userId);
    
    console.log('2. Creating CreateMeetingCommand...');
    const cmd = new CreateMeetingCommand({
      ClientRequestToken: \`\${chatId}-\${Date.now()}\`,
      MediaRegion: "us-east-1",
      ExternalMeetingId: chatId
    });
    console.log('3. Command created successfully');
    
    console.log('4. Sending command to Chime SDK...');
    const meetingResponse = await chimeClient.send(cmd);
    console.log('5. Response received from Chime SDK');
    
    const meeting = meetingResponse.Meeting;
    if (!meeting) {
      console.log('6. ERROR: No meeting in response');
      throw new Error('Failed to create meeting');
    }
    console.log('6. Meeting object received:', meeting.MeetingId);
    
    console.log('7. Storing meeting in activeMeetings...');
    activeMeetings.set(chatId, {
      meetingId: meeting.MeetingId,
      externalMeetingId: meeting.ExternalMeetingId,
      mediaRegion: meeting.MediaRegion,
      createdAt: new Date(),
      createdBy: userId
    });
    console.log('8. Meeting stored successfully');
    
    console.log('9. Sending response to client...');
    res.json({
      meeting: {
        MeetingId: meeting.MeetingId,
        MediaPlacement: meeting.MediaPlacement,
        MediaRegion: meeting.MediaRegion,
        ExternalMeetingId: meeting.ExternalMeetingId
      }
    });
    console.log('10. SUCCESS - Response sent');
    console.log('=== CHIME MEETING CREATION END ===');
  } catch (error) {
    console.log('=== CHIME MEETING CREATION ERROR ===');
    console.log('Error caught at step');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    console.log('Error code:', error.Code || error.code);
    console.log('Error stack:', error.stack);
    console.log('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    res.status(500).json({
      error: 'Failed to create meeting',
      details: error.message
    });
  }
});
ENDOFFILE

# Find and replace the endpoint
LINE_NUM=\$(grep -n "app.post('/api/chime/meeting'" index.js | cut -d: -f1)
if [ -n "\$LINE_NUM" ]; then
  # Delete old endpoint (it's all on one line)
  sed -i "\${LINE_NUM}d" index.js
  # Insert new endpoint at the same line
  sed -i "\${LINE_NUM}r /tmp/chime_endpoint.js" index.js
  echo "Endpoint replaced"
else
  echo "Endpoint not found"
fi
"""

stdout = run_command(fix_script)
print(stdout)

print("\n3. Restarting PM2...")
stdout = run_command("cd /var/www/summit && pm2 restart summit")
print("   ✅ PM2 restarted")

print("\n4. Waiting for server...")
time.sleep(5)

print("\n" + "=" * 60)
print("✅ STEP-BY-STEP LOGGING ADDED")
print("\nNow try creating a call and watch the logs:")
print("python summit/check-live-chime-error.py")
