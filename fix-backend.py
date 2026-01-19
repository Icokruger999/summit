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

print("Checking if backend is running...")
result = run_command("cd /var/www/summit && pm2 status")
print("PM2 status:", result[:200])

print("\nRestarting backend...")
result = run_command("cd /var/www/summit && pm2 restart summit")
print("Restarted")

print("\nTesting API...")
time.sleep(3)
result = run_command("curl -s https://summit.api.codingeverest.com/api/users")
print("API test:", result)