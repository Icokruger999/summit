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

print("1. Checking current .env file...")
result = run_command("cd /var/www/summit && ls -la .env* && head -5 .env")
print(result)

print("\n2. Adding JWT_SECRET to .env...")
jwt_secret = "summit-jwt-secret-2024-production-key-very-secure"
result = run_command(f"cd /var/www/summit && sed -i '/JWT_SECRET/d' .env && echo 'JWT_SECRET={jwt_secret}' >> .env")
print("JWT added to .env")

print("\n3. Verifying JWT in .env...")
result = run_command("cd /var/www/summit && grep JWT_SECRET .env")
print("JWT in file:", result)

print("\n4. Stopping and starting PM2...")
result = run_command("cd /var/www/summit && pm2 stop summit && pm2 start summit")
print("PM2 restart:", result[:100])

print("\n5. Testing API...")
time.sleep(3)
result = run_command("curl -s https://summit.api.codingeverest.com/api/users")
print("API Response:", result)