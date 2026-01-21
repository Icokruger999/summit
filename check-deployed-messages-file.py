#!/usr/bin/env python3
"""Check what routes exist in deployed messages.js"""
import boto3
import json
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

# Check what routes exist
command = """
echo "=== All router methods in messages.js ==="
grep -n "router\\." /var/www/summit/dist/routes/messages.js | grep -E "(get|post|put|delete|patch)" | head -20

echo ""
echo "=== File size and date ==="
ls -lh /var/www/summit/dist/routes/messages.js

echo ""
echo "=== First 50 lines of messages.js ==="
head -50 /var/www/summit/dist/routes/messages.js
"""

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [command]}
)

command_id = response['Command']['CommandId']
print(f"Command ID: {command_id}")
print("Waiting for command to complete...")
time.sleep(3)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)

print("\n" + output['StandardOutputContent'])
if output['StandardErrorContent']:
    print("STDERR:", output['StandardErrorContent'])
