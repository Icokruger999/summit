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

print("Debugging JWT issue...")

# 1. Check JWT_SECRET in .env
print("\n1. Checking JWT_SECRET in server .env...")
stdout = run_command("grep JWT_SECRET /var/www/summit/server/.env")
print(f"Server .env: {stdout}")

# 2. Check if there's a different .env being used
print("\n2. Checking root .env...")
stdout = run_command("grep JWT_SECRET /var/www/summit/.env 2>/dev/null || echo 'No JWT in root .env'")
print(f"Root .env: {stdout}")

# 3. Check PM2 environment
print("\n3. Checking PM2 environment...")
stdout = run_command("PM2_HOME=/etc/.pm2 pm2 env 0 2>/dev/null | grep -i jwt || echo 'No JWT in PM2 env'")
print(f"PM2 env: {stdout}")

# 4. Check recent auth errors in logs
print("\n4. Recent auth errors in logs...")
stdout = run_command("PM2_HOME=/etc/.pm2 pm2 logs summit-backend --lines 30 --nostream 2>&1 | grep -i 'auth\\|jwt\\|token\\|unauthorized' | tail -10")
print(stdout if stdout else "No auth errors found")

# 5. Test with verbose curl
print("\n5. Testing with verbose output...")
stdout = run_command('''
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | jq -r '.token')
echo "Token: ${TOKEN:0:50}..."
curl -v "http://localhost:4000/api/chats" -H "Authorization: Bearer $TOKEN" 2>&1 | tail -20
''')
print(stdout)
