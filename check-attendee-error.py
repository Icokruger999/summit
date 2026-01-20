#!/usr/bin/env python3
"""
Check attendee endpoint error
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

print("🔍 CHECKING ATTENDEE ENDPOINT ERROR")
print("=" * 60)

print("\n1. Checking recent error logs...")
stdout = run_command("pm2 logs summit --err --lines 100 --nostream | grep -A 10 -B 5 'attendee\\|Attendee' || echo 'No attendee errors found'")
print(stdout)

print("\n2. Checking all recent errors...")
stdout = run_command("pm2 logs summit --err --lines 50 --nostream")
print(stdout)

print("\n3. Checking stdout for attendee logs...")
stdout = run_command("pm2 logs summit --out --lines 50 --nostream | grep -i 'attendee' || echo 'No attendee logs'")
print(stdout)

print("\n" + "=" * 60)
