#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🧪 Test Login Directly on Server")

command = """
export HOME=/home/ubuntu

echo "=== Current PM2 Status ==="
pm2 status 2>&1 || echo "PM2 not running"

echo ""
echo "=== Test login endpoint on server ==="
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' \
  -v 2>&1 | head -50

echo ""
echo "=== Check PM2 logs for auth errors ==="
pm2 logs summit-backend --lines 20 --nostream 2>&1 | grep -A 5 -B 5 "auth\|login\|password\|error" || echo "No auth errors in logs"
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
