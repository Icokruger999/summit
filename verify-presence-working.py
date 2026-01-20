#!/usr/bin/env python3
"""Verify presence is working"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

check_cmd = '''
echo "=== Wait for new requests ==="
sleep 5

echo "=== Recent logs after restart ==="
tail -30 /var/www/summit/server/logs/pm2-combined-0.log | grep -i "presence\|error" || echo "No presence/error logs"

echo ""
echo "=== Check presence data in DB ==="
sudo -u postgres psql -d summit -c "SELECT user_id, status, last_seen FROM presence LIMIT 5;"
'''

print("Verifying presence...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [check_cmd]},
    TimeoutSeconds=30
)
command_id = response['Command']['CommandId']
time.sleep(10)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)
print(output.get('StandardOutputContent', ''))
if output.get('StandardErrorContent'):
    print(f"STDERR: {output['StandardErrorContent']}")
