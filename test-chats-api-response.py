#!/usr/bin/env python3
"""Test the chats API response to see what data is returned"""

import subprocess
import json

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

def run_ssm(command):
    """Run command via SSM"""
    result = subprocess.run([
        "aws", "ssm", "send-command",
        "--instance-ids", INSTANCE_ID,
        "--document-name", "AWS-RunShellScript",
        "--parameters", f"commands={command}",
        "--region", REGION,
        "--output", "json"
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return None
    
    data = json.loads(result.stdout)
    command_id = data["Command"]["CommandId"]
    
    # Wait for result
    import time
    time.sleep(3)
    
    result = subprocess.run([
        "aws", "ssm", "get-command-invocation",
        "--command-id", command_id,
        "--instance-id", INSTANCE_ID,
        "--region", REGION,
        "--output", "json"
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error getting result: {result.stderr}")
        return None
    
    data = json.loads(result.stdout)
    return data.get("StandardOutputContent", "")

# First, let's login and get a token
print("=== Testing Chats API Response ===\n")

# Get a test token by logging in
login_cmd = '''
curl -s -X POST https://summit.api.codingeverest.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"ico@astutetech.co.za","password":"Summit2024!"}' | head -c 2000
'''

print("1. Getting auth token...")
result = run_ssm(login_cmd)
if result:
    print(f"Login response: {result[:500]}...")
    try:
        login_data = json.loads(result)
        token = login_data.get("token")
        if token:
            print(f"\n2. Got token: {token[:50]}...")
            
            # Now test the chats endpoint
            chats_cmd = f'''
curl -s https://summit.api.codingeverest.com/api/chats \\
  -H "Authorization: Bearer {token}" | head -c 5000
'''
            print("\n3. Fetching chats...")
            chats_result = run_ssm(chats_cmd)
            if chats_result:
                print(f"\nChats API Response:\n{chats_result}")
                try:
                    chats = json.loads(chats_result)
                    print(f"\n=== Parsed {len(chats)} chats ===")
                    for chat in chats[:3]:  # Show first 3
                        print(f"\nChat ID: {chat.get('id')}")
                        print(f"  Name: {chat.get('name')}")
                        print(f"  Type: {chat.get('type')}")
                        print(f"  other_user: {chat.get('other_user')}")
                        print(f"  other_user_id: {chat.get('other_user_id')}")
                        print(f"  other_user_name: {chat.get('other_user_name')}")
                except json.JSONDecodeError as e:
                    print(f"Could not parse chats JSON: {e}")
        else:
            print("No token in response")
    except json.JSONDecodeError as e:
        print(f"Could not parse login JSON: {e}")
