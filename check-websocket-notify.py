#!/usr/bin/env python3
"""Check WebSocket notification sending"""
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

print("Checking call notification logs...")
stdout = run_command("pm2 logs summit --lines 200 --nostream | grep -i 'call notification\\|notifyUser\\|INCOMING_CALL' | tail -30")
print(stdout)

print("\n\nChecking notifyUser function in backend...")
stdout2 = run_command("grep -A 20 'function notifyUser' /var/www/summit/index.js")
print(stdout2)
