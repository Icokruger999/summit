#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Finding PM2 Configuration")

command = """
export HOME=/home/ubuntu

echo "=== Check PM2 dump file ==="
cat /home/ubuntu/.pm2/dump.pm2

echo ""
echo "=== Check for ecosystem file ==="
find /var/www/summit -name "ecosystem*.js" -o -name "pm2*.json" -o -name "pm2*.config.js"

echo ""
echo "=== Check PM2 startup script ==="
pm2 startup | grep "sudo"
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
