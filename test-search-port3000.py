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
        
        stdout = output.get('StandardOutputContent', '').strip()
        stderr = output.get('StandardErrorContent', '').strip()
        return stdout, stderr
    except Exception as e:
        return f"Error: {str(e)}", ""

print("1. Testing health endpoint on port 3000...")
stdout, stderr = run_command("curl -s http://localhost:3000/api/health")
print(f"Health: {stdout}")

print("\n2. Logging in as Stacey to search for Ico...")
login_cmd = '''curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"thechihuahua01@gmail.com","password":"Summit@2024"}' '''
stdout, stderr = run_command(login_cmd)
print(f"Login response: {stdout[:200] if stdout else 'empty'}...")

try:
    login_data = json.loads(stdout)
    token = login_data.get('token', '')
    
    if token:
        print(f"\n3. Searching for ico@astutetech.co.za...")
        search_cmd = f'''curl -s "http://localhost:3000/api/users/search?email=ico@astutetech.co.za" \
          -H "Authorization: Bearer {token}"'''
        stdout, stderr = run_command(search_cmd)
        print(f"Search result: {stdout}")
        
        print(f"\n4. Searching with uppercase ICO@ASTUTETECH.CO.ZA...")
        search_cmd2 = f'''curl -s "http://localhost:3000/api/users/search?email=ICO@ASTUTETECH.CO.ZA" \
          -H "Authorization: Bearer {token}"'''
        stdout, stderr = run_command(search_cmd2)
        print(f"Search result: {stdout}")
        
        # Also test searching for yourself (should return 404 since you can't search yourself)
        print(f"\n5. Logging in as Ico and searching for Stacey...")
        login_cmd2 = '''curl -s -X POST http://localhost:3000/api/auth/login \
          -H "Content-Type: application/json" \
          -d '{"email":"ico@astutetech.co.za","password":"Summit@2024"}' '''
        stdout2, stderr2 = run_command(login_cmd2)
        login_data2 = json.loads(stdout2)
        token2 = login_data2.get('token', '')
        
        if token2:
            search_cmd3 = f'''curl -s "http://localhost:3000/api/users/search?email=thechihuahua01@gmail.com" \
              -H "Authorization: Bearer {token2}"'''
            stdout, stderr = run_command(search_cmd3)
            print(f"Ico searching for Stacey: {stdout}")
    else:
        print("No token received")
        print(f"Full response: {stdout}")
except Exception as e:
    print(f"Error: {e}")
    print(f"Raw response: {stdout}")
