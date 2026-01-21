#!/usr/bin/env python3
"""
Add logging to group notification code to see if it's looping through all members
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

# Add console.log before the notifyUser call to see if loop is running
command = """
export HOME=/home/ubuntu

# Backup current file
cp /var/www/summit/dist/routes/chats.js /var/www/summit/dist/routes/chats.js.backup-$(date +%s)

# Add logging before notifyUser call
sed -i '/for (const memberId of memberIds) {/,/messageNotifier.notifyUser(memberId, {/ {
    /if (memberId !== userId) {/a\\
                console.log(`🔔 Attempting to notify user ${memberId} of GROUP_ADDED`);
}' /var/www/summit/dist/routes/chats.js

# Verify the change
echo "=== Checking if logging was added ==="
grep -A 15 "for (const memberId of memberIds)" /var/www/summit/dist/routes/chats.js | head -20

# Restart PM2
pm2 restart summit-backend

echo ""
echo "✅ Logging added and PM2 restarted"
"""

print("🔧 Adding notification logging to backend...")
print("=" * 60)

response = ssm.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [command]},
    TimeoutSeconds=30
)

command_id = response['Command']['CommandId']
time.sleep(5)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=INSTANCE_ID
)

print(output['StandardOutputContent'])

if output['StandardErrorContent']:
    print("\n⚠️ Errors:")
    print(output['StandardErrorContent'])

print("\n✅ Deployment complete!")
