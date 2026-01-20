#!/usr/bin/env python3
"""Check Chime endpoints structure in production"""
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

print("Checking Chime endpoints...")
stdout = run_command("grep -n 'app\\.' /var/www/summit/index.js | grep -i chime | head -20")
print(stdout)

print("\n\nChecking for messageNotifier...")
stdout = run_command("grep -n 'messageNotifier' /var/www/summit/index.js | head -10")
print(stdout)
