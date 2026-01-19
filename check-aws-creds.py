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

print("Checking AWS credentials...")
result = run_command("cd /var/www/summit && aws sts get-caller-identity")
print("AWS Identity:", result)

print("\nChecking .env file...")
result = run_command("cd /var/www/summit && cat .env")
print("Env file:", result)

print("\nRestarting with --update-env...")
result = run_command("cd /var/www/summit && pm2 restart summit --update-env")
print("Restart complete")

print("\nTesting Chime endpoint...")
time.sleep(3)
result = run_command("curl -s https://summit.api.codingeverest.com/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"test@test.com\",\"password\":\"test123\"}'")
print("Login test:", result[:200])