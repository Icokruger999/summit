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

print("Restarting with explicit JWT_SECRET...")

# Kill all PM2 processes
result = run_command("cd /var/www/summit && pm2 delete all")
print("Deleted all PM2 processes")

# Start with explicit JWT_SECRET
result = run_command("cd /var/www/summit && JWT_SECRET='summit-jwt-secret-2024-production-key' pm2 start index.js --name summit")
print("Started with explicit JWT_SECRET")

# Test
time.sleep(3)
result = run_command("curl -s https://summit.api.codingeverest.com/api/users")
print("API Response:", result)