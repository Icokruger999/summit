#!/usr/bin/env python3
"""
Check the Data Engineering group chat with correct database name
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

command = """
export HOME=/home/ubuntu
sudo -u postgres psql -d summit << 'EOF'
-- Check all chats
\\echo '=== ALL CHATS ==='
SELECT id, name, type, created_by, created_at FROM chats ORDER BY created_at DESC LIMIT 10;

\\echo ''
\\echo '=== GROUP CHATS ==='
SELECT id, name, created_by FROM chats WHERE type = 'group';

\\echo ''
\\echo '=== MESSAGES IN GROUP CHATS WITH SENDER INFO ==='
SELECT 
  m.id as msg_id,
  c.name as chat_name,
  m.sender_id,
  u.name as sender_name,
  u.email as sender_email,
  LEFT(m.content, 50) as message_preview,
  m.created_at
FROM messages m
JOIN chats c ON m.chat_id = c.id
LEFT JOIN users u ON m.sender_id = u.id
WHERE c.type = 'group'
ORDER BY m.created_at DESC
LIMIT 10;

\\echo ''
\\echo '=== ALL USERS ==='
SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT 5;
EOF
"""

print("🔍 Checking group chats and messages...")
print("=" * 60)

response = ssm.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [command]},
    TimeoutSeconds=30
)

command_id = response['Command']['CommandId']
time.sleep(4)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=INSTANCE_ID
)

print(output['StandardOutputContent'])

if output['StandardErrorContent']:
    print("\n⚠️ Errors:")
    print(output['StandardErrorContent'])

print("\n✅ Check complete!")
