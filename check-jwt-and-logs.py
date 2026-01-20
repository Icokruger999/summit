#!/usr/bin/env python3
"""Check JWT secret and recent logs"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

check_cmd = '''
echo "=== PM2 Environment ==="
pm2 env 0 | grep -i jwt

echo ""
echo "=== .env file JWT ==="
grep JWT /var/www/summit/server/.env

echo ""
echo "=== ecosystem.config JWT ==="
grep JWT /var/www/summit/server/ecosystem.config.cjs

echo ""
echo "=== Recent PM2 logs ==="
pm2 logs summit-backend --lines 30 --nostream

echo ""
echo "=== Test external API ==="
curl -s -X POST https://summit.api.codingeverest.com/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}' | head -c 200
'''

print("Checking JWT and logs...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [check_cmd]},
    TimeoutSeconds=60
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
