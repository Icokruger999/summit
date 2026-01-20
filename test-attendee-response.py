#!/usr/bin/env python3
"""Test the attendee endpoint response format"""
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

print("Checking recent attendee creation logs with full details...")
stdout = run_command("pm2 logs summit --lines 200 --nostream | grep -A 5 'Attendee created' | tail -50")
print(stdout)

print("\n\nChecking for any 500 errors...")
stdout2 = run_command("pm2 logs summit --lines 200 --nostream | grep -B 3 -A 3 '500' | tail -30")
print(stdout2)
