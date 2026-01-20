#!/usr/bin/env python3
"""Check auth route on server"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = [
    # Check auth route
    "echo '=== Auth route ===' && cat /var/www/summit/server/dist/routes/auth.js | head -150",
    # Check if bcrypt is comparing correctly - check a user's password hash
    "echo '=== User password hash ===' && sudo -u postgres psql -d summit -c \"SELECT email, LEFT(password_hash, 30) as hash_start FROM users WHERE email = 'ico@astutetech.co.za';\"",
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
