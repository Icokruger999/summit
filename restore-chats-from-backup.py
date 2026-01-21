#!/usr/bin/env python3
"""
Restore chats.js from backup
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

command = """
export HOME=/home/ubuntu

echo "=== Finding latest backup ==="
ls -lt /var/www/summit/dist/routes/chats.js.backup-* | head -5

# Get the most recent backup before the delete update
BACKUP=$(ls -t /var/www/summit/dist/routes/chats.js.backup-* | grep -v "delete" | head -1)

if [ -z "$BACKUP" ]; then
    echo "❌ No backup found, trying delete backup"
    BACKUP=$(ls -t /var/www/summit/dist/routes/chats.js.backup-delete-* | head -1)
fi

echo ""
echo "=== Restoring from: $BACKUP ==="
cp "$BACKUP" /var/www/summit/dist/routes/chats.js

echo ""
echo "=== Verifying file is valid JavaScript ==="
node --check /var/www/summit/dist/routes/chats.js && echo "✅ File is valid" || echo "❌ File has syntax errors"

echo ""
echo "=== Restarting PM2 ==="
pm2 restart summit-backend

sleep 3

echo ""
echo "=== Testing health endpoint ==="
curl -s http://localhost:4000/health || echo "Health check failed"

echo ""
echo "=== PM2 Status ==="
pm2 status
"""

print("🔧 Restoring chats.js from backup...")
print("=" * 60)

response = ssm.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [command]},
    TimeoutSeconds=30
)

time.sleep(6)

output = ssm.get_command_invocation(
    CommandId=response['Command']['CommandId'],
    InstanceId=INSTANCE_ID
)

print(output['StandardOutputContent'])

if output['StandardErrorContent']:
    print("\n⚠️ Errors:")
    print(output['StandardErrorContent'])

print("\n✅ Restore complete!")
