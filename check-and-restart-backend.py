#!/usr/bin/env python3
"""
Check backend status and restart properly
"""
import boto3
import time

# EC2 instance details
INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

# Create SSM client
ssm = boto3.client('ssm', region_name=REGION)

print("🔍 Checking backend status and restarting...")

command = """
cd /var/www/summit/dist

echo "📋 Current PM2 processes:"
pm2 list

echo ""
echo "📋 Checking if backend is running on port 4000:"
lsof -i :4000 || echo "Nothing on port 4000"

echo ""
echo "🔄 Killing any process on port 4000:"
fuser -k 4000/tcp || echo "No process to kill"

echo ""
echo "🚀 Starting backend with PM2:"
cd /var/www/summit/dist
NODE_ENV=production pm2 start index.js --name summit-backend --time

echo ""
echo "📋 PM2 status after start:"
pm2 list

echo ""
echo "💾 Saving PM2 config:"
pm2 save --force

echo ""
echo "✅ Backend restarted with 50MB body limit"
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=120
    )
    
    command_id = response['Command']['CommandId']
    print(f"✅ Command sent! Command ID: {command_id}")
    
    time.sleep(8)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    print("\n📋 Output:")
    print("=" * 60)
    print(output['StandardOutputContent'])
    print("=" * 60)
    
    if output['StandardErrorContent']:
        print("\n⚠️ Errors:")
        print(output['StandardErrorContent'])
    
except Exception as e:
    print(f"❌ Error: {e}")
