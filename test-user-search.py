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
        
        stdout = output.get('StandardOutputContent', '').strip()
        return stdout
    except Exception as e:
        return f"Error: {str(e)}"

print("Testing user search for ico@astutetech.co.za...")

# 1. Login as test user
print("\n1. Logging in as test@test.com...")
stdout = run_command('''curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' ''')

try:
    data = json.loads(stdout)
    token = data.get('token', '')
    
    if token:
        print("✅ Login successful")
        
        # 2. Search for ico@astutetech.co.za
        print("\n2. Searching for ico@astutetech.co.za...")
        stdout = run_command(f'''curl -s "http://localhost:4000/api/users/search?email=ico@astutetech.co.za" \
          -H "Authorization: Bearer {token}"''')
        print(f"Result: {stdout}")
        
        # 3. Search with different case
        print("\n3. Searching with ICO@ASTUTETECH.CO.ZA (uppercase)...")
        stdout = run_command(f'''curl -s "http://localhost:4000/api/users/search?email=ICO@ASTUTETECH.CO.ZA" \
          -H "Authorization: Bearer {token}"''')
        print(f"Result: {stdout}")
        
    else:
        print(f"❌ Login failed: {stdout}")
except Exception as e:
    print(f"Error: {e}")
    print(f"Raw: {stdout}")
