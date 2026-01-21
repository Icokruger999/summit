#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Finding Actual Database Setup")

command = """
export HOME=/home/ubuntu

echo "=== Check for PostgreSQL on EC2 ==="
systemctl status postgresql 2>&1 | head -10

echo ""
echo "=== Check PostgreSQL databases ==="
sudo -u postgres psql -l 2>&1 | grep -E "(summit|Name|---)"

echo ""
echo "=== Check if summit database exists ==="
sudo -u postgres psql -c "\\l summit" 2>&1

echo ""
echo "=== Check PostgreSQL users ==="
sudo -u postgres psql -c "\\du" 2>&1 | grep -E "(summit|Role name|---)"

echo ""
echo "=== Check existing .env or config files ==="
if [ -f /var/www/summit/.env ]; then
    echo "Found .env file:"
    grep -E "(DATABASE|DB_)" /var/www/summit/.env | head -5
fi

echo ""
echo "=== Check PM2 ecosystem file ==="
if [ -f /var/www/summit/ecosystem.config.js ]; then
    echo "Found ecosystem.config.js:"
    cat /var/www/summit/ecosystem.config.js | grep -A 5 "env:"
fi

echo ""
echo "=== Check what was working before ==="
cd /var/www/summit-backup-with-chime-1768948233/dist
echo "Backup created at:"
stat . | grep Modify
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=60
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
