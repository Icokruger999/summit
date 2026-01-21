#!/usr/bin/env python3
"""
Deploy message edit endpoint to production server
"""
import boto3
import time

# EC2 instance details
INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

# Create SSM client
ssm = boto3.client('ssm', region_name=REGION)

print("🚀 Deploying message edit endpoint to production...")
print("=" * 60)

# The edit endpoint already exists in the messages.ts file
# We just need to verify it's there and restart PM2

commands = """
# Check if edit endpoint exists
echo "📋 Checking for edit endpoint..."
grep -n "router.put.*:messageId" /var/www/summit/dist/routes/messages.js || echo "❌ Edit endpoint not found"

# Check if the endpoint is properly exported
echo ""
echo "📋 Checking messages route export..."
tail -20 /var/www/summit/dist/routes/messages.js

# Restart PM2 to ensure latest code is loaded
echo ""
echo "🔄 Restarting PM2..."
export HOME=/home/ubuntu
pm2 restart summit-backend

# Wait for restart
sleep 3

# Test the endpoint
echo ""
echo "🧪 Testing edit endpoint..."
curl -X OPTIONS https://summit.api.codingeverest.com/api/messages/test-id -v 2>&1 | grep -i "allow"

echo ""
echo "✅ Deployment complete!"
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [commands]},
        TimeoutSeconds=120
    )
    
    command_id = response['Command']['CommandId']
    print(f"✅ Command sent: {command_id}")
    print("⏳ Waiting for execution...")
    
    # Wait for command to complete
    time.sleep(5)
    
    # Get command output
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    print("\n📤 Output:")
    print(output['StandardOutputContent'])
    
    if output['StandardErrorContent']:
        print("\n⚠️ Errors:")
        print(output['StandardErrorContent'])
    
    print("\n✅ Check complete!")
    print("\nThe edit endpoint should now be available at:")
    print("PUT https://summit.api.codingeverest.com/api/messages/:messageId")
    
except Exception as e:
    print(f"❌ Error: {e}")
