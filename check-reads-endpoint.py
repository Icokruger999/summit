#!/usr/bin/env python3
"""Check the reads endpoint in messages.js"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = [
    # Check for reads endpoint in messages.js
    "echo '=== Search for reads in messages.js ===' && grep -n 'reads' /var/www/summit/server/dist/routes/messages.js || echo 'Not found'",
    # Check full messages.js
    "echo '=== Full messages.js ===' && cat /var/www/summit/server/dist/routes/messages.js",
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
