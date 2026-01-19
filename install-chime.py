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
            TimeoutSeconds=60
        )
        command_id = response['Command']['CommandId']
        time.sleep(5)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        return output.get('StandardOutputContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}"

print("1. Installing Chime SDK...")
result = run_command("cd /var/www/summit && npm install @aws-sdk/client-chime-sdk-meetings")
print("Install result:", result[:200])

print("\n2. Restarting backend...")
result = run_command("cd /var/www/summit && pm2 restart summit")
print("Restart result:", result)

print("\n3. Testing Chime endpoint...")
time.sleep(3)
result = run_command("curl -s https://summit.api.codingeverest.com/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"test@test.com\",\"password\":\"test123\"}'")
print("Login test:", result[:200])