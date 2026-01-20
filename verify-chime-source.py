#!/usr/bin/env python3
"""
Verify chime source file
"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    command_id = response['Command']['CommandId']
    time.sleep(3)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip()

print("🔍 VERIFYING CHIME SOURCE")
print("=" * 60)

print("\n1. Checking git status...")
stdout = run_command("cd /var/www/summit-repo && git status")
print(stdout)

print("\n2. Checking if file exists...")
stdout = run_command("cat /var/www/summit-repo/server/src/routes/chime.ts | head -20")
print(stdout)

print("\n3. Listing all route files...")
stdout = run_command("ls -la /var/www/summit-repo/server/src/routes/")
print(stdout)

print("\n" + "=" * 60)
