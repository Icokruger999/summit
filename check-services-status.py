#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Checking Services Status")

command = """
export HOME=/home/ubuntu

echo "=== PostgreSQL Status ==="
sudo systemctl status postgresql | head -15

echo ""
echo "=== PgBouncer Status ==="
sudo systemctl status pgbouncer | head -10

echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Test backend directly ==="
curl -s http://localhost:4000/health || echo "Backend not responding"

echo ""
echo "=== Check password encryption ==="
sudo -u postgres psql -t -c "SHOW password_encryption;"

echo ""
echo "=== Check summit_user password type ==="
sudo -u postgres psql -t -c "SELECT rolname, LEFT(rolpassword, 10) FROM pg_authid WHERE rolname = 'summit_user';"
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
    
except Exception as e:
    print(f"Error: {e}")
