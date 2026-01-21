#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Checking Backend Environment Variables")

command = """
export HOME=/home/ubuntu

echo "=== PM2 Environment Variables ==="
pm2 env 0 | grep -E "(DATABASE_URL|JWT_SECRET|PORT|NODE_ENV)"

echo ""
echo "=== Test if backend can connect to DB ==="
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' \
  -w "\\nHTTP Status: %{http_code}\\n"

echo ""
echo "=== Check PM2 logs for actual error ==="
pm2 logs summit-backend --lines 30 --nostream | grep -i "error\|fail\|password" | tail -20
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
