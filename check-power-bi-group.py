#!/usr/bin/env python3
"""
Check the Power BI group members
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

command = """
export HOME=/home/ubuntu
sudo -u postgres psql -d summit << 'EOF'
-- Find the Power BI group
SELECT id, name, created_by, created_at FROM chats WHERE name = 'Power BI';

-- Get all members of the Power BI group
SELECT 
  cp.chat_id,
  cp.user_id,
  u.name as user_name,
  u.email as user_email
FROM chat_participants cp
JOIN users u ON cp.user_id = u.id
WHERE cp.chat_id = (SELECT id FROM chats WHERE name = 'Power BI' LIMIT 1);
EOF
"""

print("🔍 Checking Power BI group members...")
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

print("\n✅ Check complete!")
