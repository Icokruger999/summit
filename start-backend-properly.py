#!/usr/bin/env python3
"""
Start backend properly on port 4000
"""
import boto3
import time

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

ssm = boto3.client('ssm', region_name=REGION)

print("🚀 Starting backend on port 4000...")

command = """
# Go to the correct directory
cd /var/www/summit/dist

# Stop any existing PM2 processes
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Kill anything on port 4000
fuser -k 4000/tcp 2>/dev/null || true

# Wait a moment
sleep 2

# Start with correct environment
export PORT=4000
export NODE_ENV=production

# Start with PM2
pm2 start index.js --name summit-backend --time

# Save PM2 config
pm2 save --force

echo ""
echo "✅ Backend started"
echo ""

# Wait for it to start
sleep 3

echo "📋 PM2 Status:"
pm2 list

echo ""
echo "📋 Port 4000:"
lsof -i :4000

echo ""
echo "📋 Recent logs:"
pm2 logs summit-backend --lines 15 --nostream
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
    
    time.sleep(10)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    print("📋 Output:")
    print("=" * 80)
    print(output['StandardOutputContent'])
    print("=" * 80)
    
    if output['StandardErrorContent']:
        print("\n⚠️ Errors:")
        print(output['StandardErrorContent'][:1000])
    
except Exception as e:
    print(f"❌ Error: {e}")
