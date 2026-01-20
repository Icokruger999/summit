#!/usr/bin/env python3
"""Verify Chime routes are working"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

check_cmd = '''
echo "=== Recent PM2 logs ==="
pm2 logs summit-backend --lines 20 --nostream

echo ""
echo "=== Check for errors ==="
tail -20 /var/www/summit/server/logs/pm2-error-0.log | grep -v "Warning\|NodeDeprecation" | tail -10
'''

print("Verifying Chime routes...")
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
