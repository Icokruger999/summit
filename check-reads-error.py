#!/usr/bin/env python3
"""Check the backend logs for read receipts errors"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = [
    # Check recent error logs
    "echo '=== Recent PM2 Error Logs ===' && sudo pm2 logs summit-backend --err --lines 50 --nostream",
    # Check if reads endpoint exists in the code
    "echo '=== Check reads endpoint in code ===' && grep -n 'messages/reads' /var/www/summit/index.js || echo 'Not found in index.js'",
    # Check the messages routes
    "echo '=== Messages routes ===' && grep -n -A5 'messages' /var/www/summit/index.js | head -60",
    # Check port 4000
    "echo '=== Port 4000 ===' && sudo netstat -tlnp | grep 4000"
]

for cmd in commands:
    print(f"\nRunning: {cmd[:60]}...")
    response = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [cmd]},
        TimeoutSeconds=30
    )
    command_id = response['Command']['CommandId']
    time.sleep(3)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id
    )
    print(output.get('StandardOutputContent', ''))
    if output.get('StandardErrorContent'):
        print(f"STDERR: {output['StandardErrorContent']}")
