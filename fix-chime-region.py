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

print("Updating AWS_REGION to us-east-1 for Chime...")
result = run_command("cd /var/www/summit && sed -i 's/AWS_REGION=eu-west-1/AWS_REGION=us-east-1/' .env")
print("Updated region")

print("Restarting backend...")
result = run_command("cd /var/www/summit && pm2 restart summit --update-env")
print("Restarted")

print("Testing Chime with us-east-1...")
time.sleep(3)
result = run_command('curl -s "https://summit.api.codingeverest.com/api/auth/login" -H "Content-Type: application/json" -d \'{"email":"test@test.com","password":"test123"}\' | head -200')
print("Login result:", result)