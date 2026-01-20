#!/usr/bin/env python3
import boto3
import time
import json

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command, wait=10):
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
        return output.get('StandardOutputContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}"

print("🔧 Force restarting with proper environment...")

# 1. Delete and restart PM2 completely
print("\n1. Deleting and restarting PM2...")
stdout = run_command("""
PM2_HOME=/etc/.pm2 pm2 delete all 2>/dev/null
PM2_HOME=/etc/.pm2 pm2 kill 2>/dev/null
sleep 2

# Start fresh from the server directory
cd /var/www/summit/server
PM2_HOME=/etc/.pm2 pm2 start ecosystem.config.cjs
PM2_HOME=/etc/.pm2 pm2 save

sleep 3
PM2_HOME=/etc/.pm2 pm2 list
""")
print(stdout)

# 2. Check logs
print("\n2. Checking startup logs...")
stdout = run_command("PM2_HOME=/etc/.pm2 pm2 logs summit-backend --lines 10 --nostream 2>&1 | tail -15")
print(stdout)

# 3. Test login and chats
print("\n3. Testing login and chats...")
stdout = run_command('''curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' ''')
print(f"Login: {stdout[:150]}...")

try:
    data = json.loads(stdout)
    token = data.get('token', '')
    if token:
        print("\n4. Getting chats...")
        stdout = run_command(f'''curl -s "http://localhost:4000/api/chats" -H "Authorization: Bearer {token}"''')
        print(f"Chats: {stdout}")
except:
    pass
