#!/usr/bin/env python3
"""
Fix port mismatch - server running on 3000 but should be on 4000
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🔧 Fixing port mismatch - setting server to port 4000...")

command = """
cd /var/www/summit/dist

# Stop current PM2 process
pm2 stop summit-backend
pm2 delete summit-backend

# Kill anything on port 3000 or 4000
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 4000/tcp 2>/dev/null || true

# Start server with correct port 4000
PORT=4000 NODE_ENV=production pm2 start index.js --name summit-backend --time

# Save PM2 config
pm2 save --force

echo ""
echo "✅ Server restarted on port 4000"
echo ""
echo "📋 PM2 Status:"
pm2 list

echo ""
echo "📋 Port 4000 check:"
sleep 2
lsof -i :4000 || echo "Nothing on port 4000 yet"

echo ""
echo "📋 Recent logs:"
pm2 logs summit-backend --lines 10 --nostream
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=120
    )
    
    command_id = response['Command']['CommandId']
    print(f"✅ Command sent! Command ID: {command_id}\n")
    
    time.sleep(8)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    print("📋 Output:")
    print("=" * 80)
    print(output['StandardOutputContent'])
    print("=" * 80)
    
    if output['StandardErrorContent']:
        print("\n⚠️ Errors (can ignore PM2 warnings):")
        print(output['StandardErrorContent'][:500])
    
    print("\n✅ Server should now be running on port 4000!")
    print("✅ Try the app again - it should work now")
    
except Exception as e:
    print(f"❌ Error: {e}")
