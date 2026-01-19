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

print("Fixing DATABASE_URL...")

# Add DATABASE_URL to .env
result = run_command("cd /var/www/summit && grep DATABASE_URL .env || echo 'DATABASE_URL=postgresql://summit_user:KUQoTLZJcHN0YYXS6qiGJS9B7@127.0.0.1:6432/summit' >> .env")
print("DATABASE_URL added")

# Restart PM2
result = run_command("cd /var/www/summit && pm2 restart summit")
print("PM2 restarted")

# Test search API
time.sleep(3)
result = run_command('curl -s "https://summit.api.codingeverest.com/api/auth/register" -H "Content-Type: application/json" -d \'{"email":"test@test.com","name":"Test User","password":"test123"}\'')
print("Register test:", result[:200])

if "token" in result:
    print("Registration successful, testing search...")
else:
    print("Registration failed, trying existing user login...")