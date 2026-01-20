#!/usr/bin/env python3
"""Find where the backend is actually running from"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = [
    # Check PM2 process details
    "echo '=== PM2 Process Details ===' && sudo pm2 describe summit-backend | head -30",
    # Find index.js files
    "echo '=== Find index.js ===' && find /var/www -name 'index.js' 2>/dev/null | head -10",
    # Check what's in /var/www/summit
    "echo '=== /var/www/summit contents ===' && ls -la /var/www/summit/ 2>/dev/null || echo 'Dir not found'",
    # Check /var/www/summit/server
    "echo '=== /var/www/summit/server contents ===' && ls -la /var/www/summit/server/ 2>/dev/null || echo 'Dir not found'",
    # Check /var/www/summit/server/dist
    "echo '=== /var/www/summit/server/dist contents ===' && ls -la /var/www/summit/server/dist/ 2>/dev/null || echo 'Dir not found'",
    # Check PM2 ecosystem config
    "echo '=== PM2 ecosystem config ===' && cat /var/www/summit/server/ecosystem.config.cjs 2>/dev/null || echo 'Not found'"
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
