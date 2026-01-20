#!/usr/bin/env python3
"""Check for attendee creation errors in detail"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=60
    )
    command_id = response['Command']['CommandId']
    time.sleep(4)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip()

print("Checking for attendee creation errors...")
stdout = run_command("pm2 logs summit --lines 300 --nostream | grep -A 10 'Creating attendee for meeting: 34ebb718' | tail -100")
print(stdout)

print("\n\nChecking for any Chime errors...")
stdout2 = run_command("pm2 logs summit --lines 300 --nostream | grep -i 'chime.*error\\|error.*chime\\|error creating attendee' | tail -30")
print(stdout2)
