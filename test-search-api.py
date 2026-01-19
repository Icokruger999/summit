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

print("Testing user search API...")

# Test login to get a valid token
print("1. Testing login...")
result = run_command('curl -s "https://summit.api.codingeverest.com/api/auth/login" -H "Content-Type: application/json" -d \'{"email":"ico@astutetech.co.za","password":"test123"}\'')
print("Login result:", result[:200])

# If login works, extract token and test search
if "token" in result:
    # Extract token (simple approach)
    import json
    try:
        login_data = json.loads(result)
        token = login_data.get('token')
        if token:
            print(f"\n2. Testing search with valid token...")
            search_result = run_command(f'curl -s "https://summit.api.codingeverest.com/api/users/search?email=thechihuahua01@gmail.com" -H "Authorization: Bearer {token}"')
            print("Search result:", search_result)
        else:
            print("No token in response")
    except:
        print("Could not parse login response")
else:
    print("Login failed - no token received")