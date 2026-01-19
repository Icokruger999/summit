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

print("1. Setting JWT Secret...")
jwt_secret = "summit-jwt-secret-2024-production-key-very-secure-random-string"
result = run_command(f"cd /var/www/summit && export JWT_SECRET='{jwt_secret}' && echo 'JWT_SECRET={jwt_secret}' >> .env")
print("JWT Secret set")

print("\n2. Restarting with new environment...")
result = run_command("cd /var/www/summit && pm2 restart summit --update-env")
print("Restart result:", result[:100])

print("\n3. Waiting 5 seconds...")
time.sleep(5)

print("\n4. Testing API...")
result = run_command("curl -s https://summit.api.codingeverest.com/api/users")
print("API Response:", result)