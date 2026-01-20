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

print("Testing login with Stacey@1122...")

stdout = run_command('''curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' ''')
print(f"Login response: {stdout[:200]}")

try:
    data = json.loads(stdout)
    token = data.get('token', '')
    
    if token:
        print("\n✅ Login successful!")
        
        # Get chats
        print("\nGetting chats...")
        stdout = run_command(f'''curl -s "http://localhost:4000/api/chats" -H "Authorization: Bearer {token}"''')
        print(f"Chats response: {stdout}")
        
        # Get contacts
        print("\nGetting contacts...")
        stdout = run_command(f'''curl -s "http://localhost:4000/api/chat-requests/contacts" -H "Authorization: Bearer {token}"''')
        print(f"Contacts response: {stdout}")
    else:
        print(f"\n❌ Login failed")
except Exception as e:
    print(f"Error: {e}")
