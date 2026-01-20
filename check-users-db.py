#!/usr/bin/env python3
"""Check users in database"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = [
    # Check users
    "echo '=== Users in DB ===' && sudo -u postgres psql -d summit -c \"SELECT id, email, name FROM users LIMIT 10;\"",
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
