import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

def run_command(command, timeout=60):
    response = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=timeout
    )
    
    command_id = response['Command']['CommandId']
    time.sleep(2)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id
    )
    
    return output['StandardOutputContent']

print("=" * 60)
print("CHECKING ALL DATABASE DATA")
print("=" * 60)

stdout = run_command("""
# Try direct PostgreSQL connection (not PgBouncer)
PGPASSWORD='Astute2024!' psql -h localhost -U summit_user -d summit_db -p 5432 << 'EOF'

-- Check all tables
SELECT 'USERS:', COUNT(*) FROM users;
SELECT 'CHATS:', COUNT(*) FROM chats;
SELECT 'MESSAGES:', COUNT(*) FROM messages;
SELECT 'CHAT_PARTICIPANTS:', COUNT(*) FROM chat_participants;
SELECT 'CHAT_REQUESTS:', COUNT(*) FROM chat_requests;

-- Show your user
SELECT 'YOUR USER:' as info;
SELECT id, email, name, created_at FROM users WHERE email='ico@astutetech.co.za';

-- Show all users
SELECT 'ALL USERS:' as info;
SELECT id, email, name FROM users LIMIT 10;

-- Show all chats
SELECT 'ALL CHATS:' as info;
SELECT id, type, created_at FROM chats LIMIT 10;

-- Show chat participants
SELECT 'CHAT PARTICIPANTS:' as info;
SELECT cp.chat_id, cp.user_id, u.name 
FROM chat_participants cp 
JOIN users u ON cp.user_id = u.id 
LIMIT 10;

-- Show messages
SELECT 'MESSAGES:' as info;
SELECT id, chat_id, sender_id, content, created_at 
FROM messages 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for Stacey
SELECT 'STACEY USER:' as info;
SELECT id, email, name FROM users WHERE name ILIKE '%stacey%';

EOF
""")

print(stdout)
print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
