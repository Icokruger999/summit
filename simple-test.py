#!/usr/bin/env python3
import boto3
import time
import json

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command, wait=8):
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

# Login
print("1. Login...")
stdout = run_command('''curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' ''')
print(f"Response: {stdout[:200]}")

data = json.loads(stdout)
token = data.get('token', '')

# Get chats
print("\n2. Get chats...")
stdout = run_command(f'''curl -s "http://localhost:4000/api/chats" -H "Authorization: Bearer {token}"''')
print(f"Chats: {stdout}")

# Check logs
print("\n3. PM2 logs...")
stdout = run_command("PM2_HOME=/etc/.pm2 pm2 logs summit-backend --lines 30 --nostream 2>&1 | tail -30")
print(stdout)
