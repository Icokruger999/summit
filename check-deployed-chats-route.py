#!/usr/bin/env python3
"""
Check the deployed chats.js route to see the GROUP_ADDED notification code
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

command = """
export HOME=/home/ubuntu
# Check the POST /group endpoint in the deployed chats.js
grep -A 50 "router.post.*group" /var/www/summit/dist/routes/chats.js | head -60
"""

print("🔍 Checking deployed chats route for GROUP_ADDED notifications...")
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
