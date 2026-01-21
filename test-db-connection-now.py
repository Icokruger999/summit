#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Testing Database Connection")

command = """
export HOME=/home/ubuntu

echo "=== Test PgBouncer connection ==="
PGPASSWORD='KUQoTLZJcHN0YYXS6qiGJS9B7' psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c "SELECT 1 as test;"

echo ""
echo "=== Test PostgreSQL direct connection ==="
PGPASSWORD='KUQoTLZJcHN0YYXS6qiGJS9B7' psql -h 127.0.0.1 -p 5432 -U summit_user -d summit -c "SELECT 1 as test;"

echo ""
echo "=== Check PgBouncer logs ==="
tail -20 /var/log/postgresql/pgbouncer.log

echo ""
echo "=== Check PostgreSQL logs ==="
tail -20 /var/log/postgresql/postgresql-14-main.log
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
        print("\n=== ERRORS ===")
        print(output['StandardErrorContent'])
    
except Exception as e:
    print(f"Error: {e}")
