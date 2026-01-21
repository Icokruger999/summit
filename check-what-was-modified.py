#!/usr/bin/env python3
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Checking What Was Modified")

command = """
export HOME=/home/ubuntu

echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Check if production files were modified ==="
cd /var/www/summit/dist

echo "--- index.js (checking for sed modifications) ---"
grep -n "limit.*50mb" index.js || echo "No 50mb limit found"

echo ""
echo "--- messages.js (checking for edit endpoint) ---"
grep -n "PUT.*messageId" routes/messages.js || echo "No PUT endpoint found"

echo ""
echo "=== Compare with backup ==="
echo "Backup location:"
ls -la /var/www/summit-backup-with-chime-*/dist/ | head -3

echo ""
echo "Current dist size:"
du -sh /var/www/summit/dist

echo ""
echo "Backup dist size:"
du -sh /var/www/summit-backup-with-chime-1768948233/dist
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=60
    )
    
    time.sleep(6)
    
    output = ssm.get_command_invocation(
        CommandId=response['Command']['CommandId'],
        InstanceId=INSTANCE_ID
    )
    
    print(output['StandardOutputContent'])
    
except Exception as e:
    print(f"Error: {e}")
