#!/usr/bin/env python3
"""Add Chime routes to the server"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

# Check if chime routes exist and add them
check_cmd = '''
echo "=== Check if chime.js exists ==="
ls -la /var/www/summit/server/dist/routes/ | grep chime || echo "No chime route file"

echo ""
echo "=== Check index.js for chime import ==="
grep -n "chime" /var/www/summit/server/dist/index.js || echo "No chime references in index.js"

echo ""
echo "=== Check source chime.ts ==="
ls -la /var/www/summit/server/src/routes/chime.ts 2>/dev/null || echo "No chime.ts source file"
'''

print("Checking Chime routes...")
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
