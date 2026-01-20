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
            TimeoutSeconds=60
        )
        command_id = response['Command']['CommandId']
        time.sleep(5)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        stdout = output.get('StandardOutputContent', '').strip()
        stderr = output.get('StandardErrorContent', '').strip()
        return stdout, stderr
    except Exception as e:
        return f"Error: {str(e)}", ""

# Test the search endpoint directly on the server
print("Testing search API on server...")

# First, login to get a token
cmd = '''
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"thechihuahua01@gmail.com","password":"Summit@2024"}'
'''
stdout, stderr = run_command(cmd)
print("Login response:", stdout)

# Extract token (simple parsing)
import json
try:
    login_data = json.loads(stdout)
    token = login_data.get('token', '')
    if token:
        print(f"\nGot token: {token[:50]}...")
        
        # Now search for ico@astutetech.co.za
        search_cmd = f'''
curl -s "http://localhost:3001/api/users/search?email=ico@astutetech.co.za" \
  -H "Authorization: Bearer {token}"
'''
        stdout, stderr = run_command(search_cmd)
        print(f"\nSearch for ico@astutetech.co.za:")
        print(f"Response: {stdout}")
        if stderr:
            print(f"Stderr: {stderr}")
    else:
        print("No token in response")
except Exception as e:
    print(f"Error parsing login response: {e}")
