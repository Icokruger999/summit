#!/usr/bin/env python3
"""
Check if call notifications are working
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

print("🔍 CHECKING CALL NOTIFICATION SYSTEM")
print("=" * 60)

print("\n1. Checking if /api/chime/notify endpoint exists...")
stdout = run_command("grep -r 'notify' /var/www/summit/routes/chime.js || echo 'Not found in chime.js'")
print(stdout)

print("\n2. Checking recent backend logs for call notifications...")
stdout = run_command("pm2 logs summit --lines 50 --nostream | grep -i 'call\\|notify' || echo 'No call logs found'")
print(stdout)

print("\n3. Checking WebSocket connections...")
stdout = run_command("pm2 logs summit --lines 30 --nostream | grep -i 'websocket\\|connected' || echo 'No WebSocket logs'")
print(stdout)

print("\n4. Testing the notify endpoint directly...")
stdout = run_command("""
curl -s -X POST http://localhost:4000/api/chime/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"recipientId":"test","roomName":"test","callType":"video"}' || echo 'Endpoint test failed'
""")
print(stdout)

print("\n" + "=" * 60)
print("\nNow try making a call and check the logs again.")
