#!/usr/bin/env python3
"""Check if presence is working now"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

check_cmd = '''
echo "=== Recent logs (last 50 lines) ==="
pm2 logs summit-backend --lines 50 --nostream 2>/dev/null | grep -i "presence\|error\|chat" | tail -20

echo ""
echo "=== Check if presence table exists ==="
sudo -u postgres psql -d summit -c "\\d presence" 2>/dev/null || echo "Table doesn't exist"
'''

print("Checking presence...")
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
