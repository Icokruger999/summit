#!/usr/bin/env python3
"""Check the attendee endpoint code"""
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

print("Checking attendee endpoint code...")
stdout = run_command("grep -n 'chime/attendee' /var/www/summit/index.js")
print(stdout)
print("\n\nGetting context around line...")
line_num = stdout.split(':')[0] if stdout else "0"
stdout2 = run_command(f"sed -n '{line_num},+40p' /var/www/summit/index.js")
print(stdout2)
