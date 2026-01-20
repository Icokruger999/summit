#!/usr/bin/env python3
"""Disable subscription check on the server - it's blocking all routes"""

import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

# Fix the index.js to remove subscription checks
fix_cmd = '''
cd /var/www/summit/server/dist

# Backup current index.js
cp index.js index.js.backup

# Remove the subscription middleware import and usage
sed -i 's/import { checkSubscriptionAccess } from ".\/middleware\/subscription.js";/\/\/ DISABLED: import { checkSubscriptionAccess } from ".\/middleware\/subscription.js";/' index.js

# Remove checkSubscriptionAccess from all routes
sed -i 's/, checkSubscriptionAccess,/,/g' index.js
sed -i 's/checkSubscriptionAccess, //g' index.js

echo "=== Verifying changes ==="
grep -n "checkSubscriptionAccess" index.js || echo "✅ All subscription checks removed"

# Kill current process and restart
pkill -f 'node.*summit' || true
sleep 2

# Start with PM2
cd /var/www/summit/server
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.cjs
sleep 3

# Verify
echo "=== PM2 Status ==="
pm2 list

echo "=== Health Check ==="
curl -s http://localhost:4000/health

echo "=== Test chats endpoint ==="
# We need a valid token to test, but at least check the server responds
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/chats
'''

print("Disabling subscription checks...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [fix_cmd]},
    TimeoutSeconds=120
)
command_id = response['Command']['CommandId']
time.sleep(15)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)
print(output.get('StandardOutputContent', ''))
if output.get('StandardErrorContent'):
    print(f"STDERR: {output['StandardErrorContent']}")
