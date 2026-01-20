#!/usr/bin/env python3
"""Check combined log for errors"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = [
    # Check combined log for errors
    "echo '=== Combined log (last 200 lines) ===' && tail -200 /var/www/summit/server/logs/pm2-combined-0.log | grep -i -A5 'error\\|500\\|reads'",
    # Check if there are any recent errors
    "echo '=== Recent errors ===' && grep -i 'error' /var/www/summit/server/logs/pm2-combined-0.log | tail -30",
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
