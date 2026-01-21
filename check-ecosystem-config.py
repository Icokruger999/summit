#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Checking Ecosystem Config")

command = """
export HOME=/home/ubuntu

echo "=== Check for ecosystem.config.js ==="
if [ -f /var/www/summit/ecosystem.config.js ]; then
    echo "Found ecosystem.config.js:"
    cat /var/www/summit/ecosystem.config.js
else
    echo "No ecosystem.config.js found"
fi

echo ""
echo "=== Check for PM2 startup script ==="
if [ -f /var/www/summit/start-pm2.sh ]; then
    echo "Found start-pm2.sh:"
    cat /var/www/summit/start-pm2.sh
else
    echo "No start-pm2.sh found"
fi

echo ""
echo "=== List all files in /var/www/summit ==="
ls -la /var/www/summit/ | grep -E "(config|start|pm2|env)"
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
