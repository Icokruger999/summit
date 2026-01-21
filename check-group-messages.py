#!/usr/bin/env python3
"""
Check group chat messages to see if sender_id is being stored correctly
"""
import boto3
import json

# EC2 instance details
INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

def run_ssm_command(command):
    """Run a command via SSM and return the output"""
    ssm = boto3.client('ssm', region_name=REGION)
    
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    
    command_id = response['Command']['CommandId']
    
    import time
    time.sleep(2)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output['StandardOutputContent']

# Check messages table for group chats
print("🔍 Checking messages in group chats...")
print("=" * 60)

query = """
sudo -u postgres psql -d summit_db -c "
SELECT 
  m.id,
  m.chat_id,
  c.name as chat_name,
  c.type as chat_type,
  m.sender_id,
  u.name as sender_name,
  u.email as sender_email,
  m.content,
  m.created_at
FROM messages m
JOIN chats c ON m.chat_id = c.id
LEFT JOIN users u ON m.sender_id = u.id
WHERE c.type = 'group'
ORDER BY m.created_at DESC
LIMIT 10;
"
"""

result = run_ssm_command(query)
print(result)

print("\n" + "=" * 60)
print("🔍 Checking if there are any messages with NULL sender_id...")
print("=" * 60)

query2 = """
sudo -u postgres psql -d summit_db -c "
SELECT 
  m.id,
  m.chat_id,
  c.name as chat_name,
  m.sender_id,
  m.content,
  m.created_at
FROM messages m
JOIN chats c ON m.chat_id = c.id
WHERE m.sender_id IS NULL
ORDER BY m.created_at DESC
LIMIT 10;
"
"""

result2 = run_ssm_command(query2)
print(result2)

print("\n" + "=" * 60)
print("🔍 Checking all users in the database...")
print("=" * 60)

query3 = """
sudo -u postgres psql -d summit_db -c "
SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT 10;
"
"""

result3 = run_ssm_command(query3)
print(result3)

print("\n✅ Check complete!")
