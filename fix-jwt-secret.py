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
        return output.get('StandardOutputContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}"

print("🔧 Fixing JWT_SECRET mismatch...")

# 1. Use the same JWT_SECRET everywhere - use the server one
print("\n1. Syncing JWT_SECRET...")
stdout = run_command("""
# Get the JWT_SECRET from server .env
JWT=$(grep JWT_SECRET /var/www/summit/server/.env | cut -d= -f2)
echo "Using JWT_SECRET: $JWT"

# Update root .env to match
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT/" /var/www/summit/.env

# Verify both match now
echo "Server .env:"
grep JWT_SECRET /var/www/summit/server/.env
echo "Root .env:"
grep JWT_SECRET /var/www/summit/.env
""")
print(stdout)

# 2. Restart PM2 to pick up the changes
print("\n2. Restarting PM2...")
stdout = run_command("""
PM2_HOME=/etc/.pm2 pm2 restart summit-backend
sleep 3
PM2_HOME=/etc/.pm2 pm2 list
""")
print(stdout)

# 3. Test login and chats
print("\n3. Testing login and chats...")
stdout = run_command('''
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | jq -r '.token')
echo "Got token: ${TOKEN:0:50}..."

echo ""
echo "Testing /api/chats:"
curl -s "http://localhost:4000/api/chats" -H "Authorization: Bearer $TOKEN"

echo ""
echo ""
echo "Testing /api/chat-requests/contacts:"
curl -s "http://localhost:4000/api/chat-requests/contacts" -H "Authorization: Bearer $TOKEN"
''')
print(stdout)
