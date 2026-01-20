#!/usr/bin/env python3
import boto3
import time
import json

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command, wait=5):
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName='AWS-RunShellScript',
            Parameters={'commands': [command]},
            TimeoutSeconds=60
        )
        command_id = response['Command']['CommandId']
        time.sleep(wait)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        return output.get('StandardOutputContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}"

# Try different passwords
passwords = ["Summit@2024", "summit@2024", "Summit2024", "password123", "test123"]

print("Testing login for ico@astutetech.co.za with different passwords...")

for pwd in passwords:
    stdout = run_command(f'''curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{{"email":"ico@astutetech.co.za","password":"{pwd}"}}' ''')
    if "token" in stdout:
        print(f"✅ Password '{pwd}' works!")
        data = json.loads(stdout)
        token = data.get('token', '')
        
        # Now get chats
        print("\nGetting chats...")
        stdout = run_command(f'''curl -s "http://localhost:4000/api/chats" -H "Authorization: Bearer {token}"''')
        print(f"Chats: {stdout}")
        break
    else:
        print(f"❌ '{pwd}' - {stdout[:50]}")

# Check if there's an issue with the chats endpoint
print("\n\nChecking PM2 logs for errors...")
print(run_command("PM2_HOME=/etc/.pm2 pm2 logs summit-backend --lines 20 --nostream 2>&1 | grep -i error | tail -10"))
