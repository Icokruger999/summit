#!/usr/bin/env python3
"""Fully disable subscription check"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

# Check current state and fix
check_cmd = '''
cd /var/www/summit/server/dist

echo "=== Current subscription references ==="
grep -n "checkSubscriptionAccess\|Subscription" index.js

echo ""
echo "=== Routes section ==="
grep -n "app.use.*api" index.js
'''

print("Checking current state...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [check_cmd]},
    TimeoutSeconds=30
)
command_id = response['Command']['CommandId']
time.sleep(5)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)
print(output.get('StandardOutputContent', ''))
if output.get('StandardErrorContent'):
    print(f"STDERR: {output['StandardErrorContent']}")
