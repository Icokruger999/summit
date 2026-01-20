#!/usr/bin/env python3
"""
Add notify endpoint to existing Chime code - FIXED VERSION
Uses the existing notifyUser function
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

print("🔧 ADDING NOTIFY ENDPOINT (FIXED)")
print("=" * 60)

print("\n1. Backing up index.js...")
stdout = run_command("cp /var/www/summit/index.js /var/www/summit/index.js.backup-notify-fixed")
print("   ✅ Backed up")

print("\n2. Adding notify endpoint after DELETE meeting endpoint...")
# Add the endpoint after line 51 (the DELETE meeting endpoint)
add_endpoint = """
cd /var/www/summit
chmod 644 index.js

# Add notify endpoint after the DELETE meeting endpoint (line 51)
# Use sed to insert after the line containing "app.delete('/api/chime/meeting"
sed -i "/app\\.delete('\\/api\\/chime\\/meeting/a\\\\
app.post('/api/chime/notify', authenticate, async (req, res) => { try { const { recipientId, roomName, callType } = req.body; if (!recipientId || !roomName) { return res.status(400).json({ error: 'recipientId and roomName are required' }); } const callerId = req.user.id; const callerName = req.user.name || req.user.email; console.log('📞 Sending call notification from', callerName, 'to user', recipientId); notifyUser(recipientId, { type: 'INCOMING_CALL', callerId, callerName, roomName, callType: callType || 'video', timestamp: new Date().toISOString() }); res.json({ success: true }); } catch (error) { console.error('Error sending call notification:', error); res.status(500).json({ error: 'Failed to send call notification' }); } });" index.js

echo "✅ Notify endpoint added"
"""

stdout = run_command(add_endpoint)
print(stdout)

print("\n3. Verifying endpoint was added...")
stdout = run_command("grep -n \"app.post('/api/chime/notify\" /var/www/summit/index.js")
if stdout:
    print(f"   ✅ Found at: {stdout}")
else:
    print("   ❌ Endpoint not found!")

print("\n4. Restarting PM2...")
stdout = run_command("pm2 restart summit")
print("   ✅ Restarted")

print("\n5. Waiting for server to start...")
time.sleep(5)

print("\n6. Testing notify endpoint...")
stdout = run_command("curl -s -X POST http://localhost:4000/api/chime/notify -H 'Content-Type: application/json' -d '{}'")
print(stdout[:300])

print("\n" + "=" * 60)
print("✅ NOTIFY ENDPOINT ADDED")
