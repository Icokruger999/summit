#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Check Auth Route Code")

command = """
export HOME=/home/ubuntu

echo "=== Check auth route in production ==="
cd /var/www/summit/dist/routes
ls -la auth.js

echo ""
echo "=== Check login function (first 100 lines) ==="
head -100 auth.js | grep -A 30 "login"

echo ""
echo "=== Check if bcrypt is being used ==="
grep -n "bcrypt" auth.js | head -10

echo ""
echo "=== Check actual PM2 error logs ==="
pm2 logs summit-backend --err --lines 30 --nostream | tail -40
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    
    time.sleep(6)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
except Exception as e:
    print(f"Error: {e}")
