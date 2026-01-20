#!/usr/bin/env python3
"""
Get the very latest error from logs
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

print("🔍 GETTING LATEST CHIME ERROR")
print("=" * 60)

print("\n1. Getting last 100 lines of error log...")
stdout = run_command("pm2 logs summit --err --lines 100 --nostream | tail -100")
print(stdout)

print("\n2. Searching for 'Error creating Chime'...")
stdout = run_command("pm2 logs summit --err --lines 200 --nostream | grep -A 20 'Error creating Chime' | tail -30")
if stdout:
    print(stdout)
else:
    print("   No 'Error creating Chime' found")

print("\n3. Checking if error logging is working...")
stdout = run_command("grep 'console.error.*Error creating Chime' /var/www/summit/index.js")
print(stdout if stdout else "Error logging not found in code")

print("\n" + "=" * 60)
