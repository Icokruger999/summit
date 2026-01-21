#!/usr/bin/env python3
"""
Increase Express body size limit to allow image uploads
"""
import boto3
import time

# EC2 instance details
INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

# Create SSM client
ssm = boto3.client('ssm', region_name=REGION)

print("🔧 Increasing Express body size limit for image uploads...")
print(f"Instance: {INSTANCE_ID}")
print(f"Region: {REGION}")
print()

# Command to update the body limit in production
command = """
cd /var/www/summit/dist

# Backup current index.js
cp index.js index.js.backup-$(date +%s)

# Update express.json() to accept 50MB payloads (enough for images)
sed -i "s/app\\.use(express\\.json());/app.use(express.json({ limit: '50mb' }));/" index.js

# Verify the change
echo "✅ Checking if change was applied:"
grep -n "express.json" index.js | head -5

# Restart PM2
pm2 restart summit-backend
pm2 save

echo "✅ Body limit increased to 50MB"
echo "✅ PM2 restarted"
"""

try:
    print("📤 Sending command to EC2 instance...")
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=120
    )
    
    command_id = response['Command']['CommandId']
    print(f"✅ Command sent! Command ID: {command_id}")
    print()
    
    # Wait for command to complete
    print("⏳ Waiting for command to complete...")
    time.sleep(5)
    
    # Get command output
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    print("📋 Command Output:")
    print("=" * 60)
    print(output['StandardOutputContent'])
    print("=" * 60)
    
    if output['StandardErrorContent']:
        print("\n⚠️ Errors:")
        print(output['StandardErrorContent'])
    
    print("\n✅ Body limit increased successfully!")
    print("✅ Server can now accept images up to 50MB")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
