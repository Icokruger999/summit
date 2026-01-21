#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Checking Presence Data in Database")

command = """
export HOME=/home/ubuntu

echo "=== Check users table ==="
PGPASSWORD='KUQoTLZJcHN0YYXS6qiGJS9B7' psql -h 127.0.0.1 -p 5432 -U summit_user -d summit -c "SELECT id, name, email FROM users LIMIT 5;"

echo ""
echo "=== Check presence table ==="
PGPASSWORD='KUQoTLZJcHN0YYXS6qiGJS9B7' psql -h 127.0.0.1 -p 5432 -U summit_user -d summit -c "SELECT user_id, status, last_seen FROM presence ORDER BY last_seen DESC LIMIT 10;"

echo ""
echo "=== Check presence table structure ==="
PGPASSWORD='KUQoTLZJcHN0YYXS6qiGJS9B7' psql -h 127.0.0.1 -p 5432 -U summit_user -d summit -c "\\d presence"
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    
    time.sleep(8)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    if output['StandardErrorContent']:
        print("\n=== STDERR ===")
        print(output['StandardErrorContent'])
    
except Exception as e:
    print(f"Error: {e}")
