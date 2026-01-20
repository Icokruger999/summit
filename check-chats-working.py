#!/usr/bin/env python3
"""Check if chats are working"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

check_cmd = '''
echo "=== Recent combined logs (looking for chats) ==="
tail -100 /var/www/summit/server/logs/pm2-combined-0.log | grep -i "chat\|message\|error" | tail -30

echo ""
echo "=== Check presence route ==="
cat /var/www/summit/server/dist/routes/presence.js | head -50
'''

print("Checking chats...")
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
