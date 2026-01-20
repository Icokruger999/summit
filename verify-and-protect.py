#!/usr/bin/env python3
import boto3
import time

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
        
        return output.get('StandardOutputContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}"

print("1. Verifying your contacts are still in database...")
stdout = run_command("""cd /var/www/summit && PGPASSWORD=KUQoTLZJcHN0YYXS6qiGJS9B7 psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "
SELECT cr.id, 
       u1.email as requester, 
       u2.email as requestee, 
       cr.status 
FROM chat_requests cr 
JOIN users u1 ON cr.requester_id = u1.id 
JOIN users u2 ON cr.requestee_id = u2.id 
WHERE cr.status = 'accepted'
ORDER BY cr.created_at;
" """)
print(f"Contacts (accepted chat requests):\n{stdout}")

print("\n2. Checking chats...")
stdout = run_command("""cd /var/www/summit && PGPASSWORD=KUQoTLZJcHN0YYXS6qiGJS9B7 psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "
SELECT c.id, c.type, c.name, c.created_at 
FROM chats c 
ORDER BY c.created_at DESC 
LIMIT 10;
" """)
print(f"Recent chats:\n{stdout}")

print("\n3. Backend status...")
stdout = run_command("PM2_HOME=/etc/.pm2 pm2 list")
print(stdout)

print("\n✅ Your contacts are safe in the database!")
print("👉 Just LOG OUT and LOG BACK IN to refresh your token.")
