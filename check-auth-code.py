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

print("1. Checking auth middleware in index.js...")
result = run_command("cd /var/www/summit && grep -n -A3 -B3 'authenticate\\|middleware\\|jwt\\|token' index.js | head -20")
print("Auth middleware:", result)

print("\n2. Checking login route...")
result = run_command("cd /var/www/summit && grep -n -A5 -B2 'login\\|/auth' index.js")
print("Login route:", result)

print("\n3. Checking if auth is commented out...")
result = run_command("cd /var/www/summit && grep -n '//' index.js | grep -i auth")
print("Commented auth:", result)