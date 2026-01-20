#!/usr/bin/env python3
"""
Test the complete call notification flow
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
    time.sleep(4)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip()

print("🧪 TESTING CALL NOTIFICATION FLOW")
print("=" * 60)

print("\n1. Checking if notify endpoint exists...")
stdout = run_command("grep -c \"app.post('/api/chime/notify\" /var/www/summit/index.js")
if stdout and int(stdout) > 0:
    print("   ✅ Notify endpoint exists")
else:
    print("   ❌ Notify endpoint NOT found!")
    exit(1)

print("\n2. Checking WebSocket connections...")
stdout = run_command("pm2 logs summit --lines 10 --nostream | grep 'WebSocket connected'")
print(f"   Recent connections:\n{stdout}")

print("\n3. Testing notify endpoint with mock data...")
test_cmd = """
# Get a valid token first (login as test user)
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"stacey@codingeverest.com","password":"password"}' | jq -r '.token')

echo "Token: ${TOKEN:0:20}..."

# Test notify endpoint
curl -s -X POST http://localhost:4000/api/chime/notify \\
  -H 'Content-Type: application/json' \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{
    "recipientId": "faa9eae9-c75a-47fd-b8b8-127e5e69e742",
    "roomName": "test-room-123",
    "callType": "video"
  }'
"""
stdout = run_command(test_cmd)
print(f"   Response: {stdout}")

print("\n4. Checking server logs for notification...")
time.sleep(2)
stdout = run_command("pm2 logs summit --lines 20 --nostream | grep -i 'call notification' | tail -5")
if stdout:
    print(f"   ✅ Found notification logs:\n{stdout}")
else:
    print("   ⚠️  No notification logs found (might be normal if recipient not connected)")

print("\n" + "=" * 60)
print("✅ CALL NOTIFICATION FLOW TEST COMPLETE")
print("\nNEXT STEPS:")
print("1. User A calls User B from the frontend")
print("2. Frontend sends POST to /api/chime/notify with recipientId")
print("3. Backend sends INCOMING_CALL via WebSocket to User B")
print("4. User B's frontend receives the notification and shows incoming call UI")
