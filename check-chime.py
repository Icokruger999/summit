#!/usr/bin/env python3
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    try:
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
    except Exception as e:
        return f"Error: {str(e)}"

print("Checking for Chime endpoints in backend...")
result = run_command("cd /var/www/summit && grep -n 'chime\\|meeting' index.js")
print("Chime endpoints:", result)

print("\nTesting Chime endpoint...")
result = run_command("curl -s https://summit.api.codingeverest.com/api/chime/meeting")
print("Chime API:", result)