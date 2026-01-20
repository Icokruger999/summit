#!/usr/bin/env python3
"""Check PM2 processes and reads endpoint"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = [
    # Check all PM2 processes
    "echo '=== All PM2 Processes ===' && sudo pm2 list",
    # Check what's listening on port 4000
    "echo '=== Port 4000 ===' && sudo ss -tlnp | grep 4000 || echo 'Nothing on 4000'",
    # Check the routes directory
    "echo '=== Routes in dist ===' && ls -la /var/www/summit/server/dist/routes/",
    # Check if messages route exists
    "echo '=== Messages route ===' && cat /var/www/summit/server/dist/routes/messages.js 2>/dev/null | head -100 || echo 'Not found'",
    # Check recent PM2 logs
    "echo '=== Recent PM2 logs ===' && sudo pm2 logs --lines 30 --nostream 2>/dev/null || echo 'No logs'"
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
