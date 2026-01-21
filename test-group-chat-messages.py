#!/usr/bin/env python3
"""
Test group chat messages to verify sender names are working
"""
import boto3
import json
import time

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
    
    time.sleep(3)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output['StandardOutputContent']

print("🔍 Checking group chats...")
print("=" * 60)

# First check if there are any group chats
query1 = """
sudo -u postgres psql -d summit_db -t -c "SELECT COUNT(*) FROM chats WHERE type = 'group';"
"""

result1 = run_ssm_command(query1)
print(f"Number of group chats: {result1.strip()}")

# Check all chats
query2 = """
sudo -u postgres psql -d summit_db -c "SELECT id, name, type, created_by FROM chats ORDER BY created_at DESC LIMIT 5;"
"""

result2 = run_ssm_command(query2)
print("\nRecent chats:")
print(result2)

# Check messages with sender info
query3 = """
sudo -u postgres psql -d summit_db -c "SELECT m.id, m.chat_id, m.sender_id, m.content, u.name as sender_name FROM messages m LEFT JOIN users u ON m.sender_id = u.id ORDER BY m.created_at DESC LIMIT 5;"
"""

result3 = run_ssm_command(query3)
print("\nRecent messages:")
print(result3)

print("\n✅ Check complete!")
