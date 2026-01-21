#!/usr/bin/env python3
"""
Check backend logs for group notification activity
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

command = """
export HOME=/home/ubuntu
# Check PM2 logs for GROUP_ADDED notifications
pm2 logs summit-backend --lines 100 --nostream | grep -i "group\|notification\|websocket" | tail -50
"""

print("🔍 Checking backend logs for group notifications...")
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

if output['StandardErrorContent']:
    print("\n⚠️ Errors:")
    print(output['StandardErrorContent'])

print("\n✅ Check complete!")
