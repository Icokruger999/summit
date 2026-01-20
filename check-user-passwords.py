#!/usr/bin/env python3
"""Check user password columns"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = [
    # Check user columns
    "echo '=== User columns ===' && sudo -u postgres psql -d summit -c \"\\d users\" | head -30",
    # Check password columns for ico
    "echo '=== Ico password columns ===' && sudo -u postgres psql -d summit -c \"SELECT email, password_hash IS NOT NULL as has_password, temp_password_hash IS NOT NULL as has_temp, requires_password_change FROM users WHERE email = 'ico@astutetech.co.za';\"",
    # Check all users password status
    "echo '=== All users password status ===' && sudo -u postgres psql -d summit -c \"SELECT email, password_hash IS NOT NULL as has_password, temp_password_hash IS NOT NULL as has_temp, requires_password_change FROM users;\"",
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
