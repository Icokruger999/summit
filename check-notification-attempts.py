#!/usr/bin/env python3
"""
Check if notifications were attempted for all group members
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

command = """
export HOME=/home/ubuntu
# Check all notification attempts (including failed ones)
echo "=== All notification logs around Power BI group creation ==="
pm2 logs summit-backend --lines 300 --nostream | grep -B 5 -A 5 "Power BI"

echo ""
echo "=== Check messageNotifier code for logging ==="
cat /var/www/summit/dist/lib/messageNotifier.js | grep -A 10 "notifyUser"
"""

print("🔍 Checking notification attempts...")
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
