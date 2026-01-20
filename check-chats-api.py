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

print("Checking chats for ico@astutetech.co.za...")

# 1. Login as Ico
print("\n1. Logging in as ico@astutetech.co.za...")
stdout = run_command('''curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"ico@astutetech.co.za","password":"Summit@2024"}' ''')
print(f"Login: {stdout[:100]}...")

try:
    data = json.loads(stdout)
    token = data.get('token', '')
    
    if token:
        print("✅ Login successful")
        
        # 2. Get chats
        print("\n2. Getting chats from API...")
        stdout = run_command(f'''curl -s "http://localhost:4000/api/chats" -H "Authorization: Bearer {token}"''')
        print(f"Chats API response: {stdout}")
        
        # 3. Get contacts
        print("\n3. Getting contacts from API...")
        stdout = run_command(f'''curl -s "http://localhost:4000/api/chat-requests/contacts" -H "Authorization: Bearer {token}"''')
        print(f"Contacts API response: {stdout}")
    else:
        print(f"❌ Login failed: {stdout}")
except Exception as e:
    print(f"Error: {e}")
    print(f"Raw: {stdout}")

# 4. Check database directly
print("\n4. Checking database for Ico's chats...")
stdout = run_command("""cd /var/www/summit && PGPASSWORD=KUQoTLZJcHN0YYXS6qiGJS9B7 psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "
SELECT c.id, c.type, c.name, cp.user_id 
FROM chats c 
JOIN chat_participants cp ON c.id = cp.chat_id 
WHERE cp.user_id = 'faa9eae9-c75a-47fd-b8b8-127e5e69e742';
" """)
print(f"Database chats: {stdout}")
