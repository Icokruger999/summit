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
            TimeoutSeconds=120
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

print("🚨 FIXING BACKEND NOW...")

# 1. Check nginx config to see what port it proxies to
print("\n1. Checking nginx proxy config...")
stdout, stderr = run_command("grep -r 'proxy_pass' /etc/nginx/sites-enabled/ 2>/dev/null | head -5")
print(f"Nginx proxy: {stdout}")

# 2. Kill the stale process on port 4000
print("\n2. Killing stale process on port 4000...")
stdout, stderr = run_command("kill -9 75690 2>/dev/null; echo 'Done'")
print(stdout)

# 3. Check what's running now
print("\n3. Current node processes...")
stdout, stderr = run_command("ps aux | grep node | grep -v grep")
print(stdout)

# 4. Test the API endpoints
print("\n4. Testing login endpoint on port 3000...")
stdout, stderr = run_command('''curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"thechihuahua01@gmail.com","password":"Summit@2024"}' ''')
print(f"Login: {stdout[:150] if stdout else 'No response'}...")

# 5. Check nginx status
print("\n5. Nginx status...")
stdout, stderr = run_command("systemctl status nginx | head -10")
print(stdout)

# 6. Test via nginx (the actual API URL)
print("\n6. Testing via nginx (api.summit.astutetech.co.za)...")
stdout, stderr = run_command("curl -s -k https://localhost/api/auth/login -X POST -H 'Content-Type: application/json' -d '{\"email\":\"test@test.com\",\"password\":\"test\"}' 2>/dev/null || echo 'HTTPS test failed'")
print(f"Via nginx: {stdout[:150] if stdout else 'No response'}...")
