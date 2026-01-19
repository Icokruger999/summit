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

print("Checking if database has ANY data...")

stdout = run_command("""
PGPASSWORD='Astute2024!' psql -h localhost -U summit_user -d summit_db -p 6432 << 'EOF'
-- Check users
SELECT 'USERS:', COUNT(*) FROM users;
SELECT email, name FROM users LIMIT 3;

-- Check chats
SELECT 'CHATS:', COUNT(*) FROM chats;
SELECT id, type FROM chats LIMIT 3;

-- Check messages
SELECT 'MESSAGES:', COUNT(*) FROM messages;

-- Check chat_participants
SELECT 'CHAT_PARTICIPANTS:', COUNT(*) FROM chat_participants;
SELECT * FROM chat_participants LIMIT 5;
EOF
""")

print(stdout)
