#!/usr/bin/env python3
"""Final status check"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

check_cmd = '''
echo "=== PM2 Status ==="
pm2 list

echo ""
echo "=== Health Check ==="
curl -s http://localhost:4000/health

echo ""
echo "=== Recent successful operations ==="
tail -50 /var/www/summit/server/logs/pm2-out-0.log | grep -E "✅|📥|📤" | tail -15

echo ""
echo "=== Any recent errors? ==="
tail -20 /var/www/summit/server/logs/pm2-error-0.log | grep -v "Warning\|NodeDeprecation\|a.co\|trace-warnings\|updates please" | tail -5 || echo "No recent errors"
'''

print("Final status check...")
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
