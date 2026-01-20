#!/usr/bin/env python3
"""
Add notify endpoint to existing Chime code
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
        TimeoutSeconds=60
    )
    command_id = response['Command']['CommandId']
    time.sleep(5)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip()

print("🔧 ADDING NOTIFY ENDPOINT")
print("=" * 60)

print("\n1. Backing up index.js...")
stdout = run_command("cp /var/www/summit/index.js /var/www/summit/index.js.backup-notify")
print("   ✅ Backed up")

print("\n2. Adding notify endpoint...")
# Add the endpoint after the DELETE meeting endpoint
add_endpoint = """
cd /var/www/summit
chmod 644 index.js

# Find the line after DELETE /api/chime/meeting and add notify endpoint
node << 'ENDOFNODE'
const fs = require('fs');
let content = fs.readFileSync('index.js', 'utf8');

// Find the DELETE meeting endpoint and add notify after it
const notifyEndpoint = `
app.post('/api/chime/notify', authenticate, async (req, res) => {
  try {
    const { recipientId, roomName, callType } = req.body;
    if (!recipientId || !roomName) {
      return res.status(400).json({ error: 'recipientId and roomName are required' });
    }
    const callerId = req.user.id;
    const callerName = req.user.name || req.user.email;
    console.log('📞 Sending call notification from', callerName, 'to user', recipientId);
    messageNotifier.notifyUser(recipientId, {
      type: 'INCOMING_CALL',
      callerId,
      callerName,
      roomName,
      callType: callType || 'video',
      timestamp: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending call notification:', error);
    res.status(500).json({ error: 'Failed to send call notification' });
  }
});`;

// Insert after the DELETE meeting endpoint
const deleteEndpointPattern = /app\.delete\('\/api\/chime\/meeting\/:meetingId'[^}]+}\);/;
content = content.replace(deleteEndpointPattern, (match) => match + notifyEndpoint);

fs.writeFileSync('index.js', content);
console.log('✅ Notify endpoint added');
ENDOFNODE
"""

stdout = run_command(add_endpoint)
print(stdout)

print("\n3. Restarting PM2...")
stdout = run_command("pm2 restart summit")
print("   ✅ Restarted")

print("\n4. Waiting...")
time.sleep(5)

print("\n5. Testing notify endpoint...")
stdout = run_command("curl -s -X POST http://localhost:4000/api/chime/notify -H 'Content-Type: application/json' -d '{}'")
print(stdout[:200])

print("\n" + "=" * 60)
print("✅ NOTIFY ENDPOINT ADDED")
