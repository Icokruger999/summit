#!/usr/bin/env python3
"""
Check active WebSocket connections
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

command = """
export HOME=/home/ubuntu
# Check recent WebSocket connections
echo "=== Recent WebSocket Connections ==="
pm2 logs summit-backend --lines 200 --nostream | grep "WebSocket connected for user" | tail -10

echo ""
echo "=== Recent GROUP_ADDED Notifications ==="
pm2 logs summit-backend --lines 200 --nostream | grep "GROUP_ADDED\|Notified user" | tail -20

echo ""
echo "=== Check if messageNotifier is working ==="
pm2 logs summit-backend --lines 200 --nostream | grep "messageNotifier\|notifyUser" | tail -10
"""

print("🔍 Checking WebSocket connections and notifications...")
print("=" * 60)

response = ssm.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [command]},
    TimeoutSeconds=30
)

command_id = response['Command']['CommandId']
time.sleep(4)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=INSTANCE_ID
)

print(output['StandardOutputContent'])

print("\n✅ Check complete!")
