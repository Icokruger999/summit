#!/usr/bin/env python3
"""
Check the Data Engineering group chat
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

# Simple query to check group chats
command = """
export HOME=/home/ubuntu
sudo -u postgres psql -d summit_db << 'EOF'
-- Check all chats
SELECT id, name, type, created_by FROM chats ORDER BY created_at DESC LIMIT 10;

-- Check Data Engineering group specifically
SELECT * FROM chats WHERE name LIKE '%Data%' OR name LIKE '%Engineering%';

-- Check messages in group chats with sender info
SELECT 
  m.id,
  c.name as chat_name,
  m.sender_id,
  u.name as sender_name,
  u.email as sender_email,
  LEFT(m.content, 50) as message_preview
FROM messages m
JOIN chats c ON m.chat_id = c.id
LEFT JOIN users u ON m.sender_id = u.id
WHERE c.type = 'group'
ORDER BY m.created_at DESC
LIMIT 10;
EOF
"""

print("🔍 Checking Data Engineering group chat...")
print("=" * 60)

response = ssm.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [command]},
    TimeoutSeconds=30
)

command_id = response['Command']['CommandId']
print(f"Command ID: {command_id}")

time.sleep(4)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=INSTANCE_ID
)

print("\n📊 Results:")
print(output['StandardOutputContent'])

if output['StandardErrorContent']:
    print("\n⚠️ Errors:")
    print(output['StandardErrorContent'])

print("\n✅ Check complete!")
