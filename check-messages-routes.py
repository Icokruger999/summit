#!/usr/bin/env python3
"""Check if messages routes are properly registered on production"""
import boto3
import json
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

# Check index.js for messages route registration
command = """
echo "=== Checking messages route registration ==="
grep -n "messages" /var/www/summit/dist/index.js | head -20

echo ""
echo "=== Checking if messages.js exists ==="
ls -la /var/www/summit/dist/routes/messages.js

echo ""
echo "=== Checking messages.js PUT route ==="
grep -n "router.put" /var/www/summit/dist/routes/messages.js | head -10
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
