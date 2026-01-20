#!/usr/bin/env python3
"""
Check production routes
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

print("🔍 CHECKING PRODUCTION ROUTES")
print("=" * 60)

print("\n1. Listing production routes folder...")
stdout = run_command("ls -la /var/www/summit/routes/")
print(stdout)

print("\n2. Checking if chime.js exists in repo...")
stdout = run_command("ls -la /var/www/summit-repo/server/dist/routes/ | grep chime")
print(stdout if stdout else "   chime.js not found in repo dist")

print("\n3. Checking repo structure...")
stdout = run_command("ls -la /var/www/summit-repo/server/dist/")
print(stdout)

print("\n" + "=" * 60)
