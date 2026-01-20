#!/usr/bin/env python3
"""Check server error logs for reads endpoint"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = [
    # Check the server logs directory
    "echo '=== Server logs ===' && ls -la /var/www/summit/server/logs/",
    # Check pm2 error log
    "echo '=== PM2 Error Log ===' && tail -100 /var/www/summit/server/logs/pm2-error.log 2>/dev/null || echo 'Not found'",
    # Check pm2 out log for errors
    "echo '=== PM2 Out Log (last 100) ===' && tail -100 /var/www/summit/server/logs/pm2-out.log 2>/dev/null || echo 'Not found'",
    # Check if read_receipts table exists
    "echo '=== Check read_receipts table ===' && sudo -u postgres psql -d summit -c \"\\d read_receipts\" 2>/dev/null || echo 'Table check failed'"
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
