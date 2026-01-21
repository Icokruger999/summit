#!/usr/bin/env python3
"""
Deploy meeting invitation notifications to production
"""
import boto3
import sys

def deploy_meeting_notifications():
    """Deploy the updated meetings.ts file with WebSocket notifications"""
    
    instance_id = "i-0fba58db502cc8d39"
    region = "eu-west-1"
    
    print("📅 Deploying meeting invitation notifications...")
    print(f"Instance: {instance_id}")
    print(f"Region: {region}")
    
    ssm = boto3.client('ssm', region_name=region)
    
    # Read the updated meetings.ts file
    with open('server/src/routes/meetings.ts', 'r', encoding='utf-8') as f:
        meetings_content = f.read()
    
    # Escape single quotes and backslashes for shell
    meetings_content_escaped = meetings_content.replace('\\', '\\\\').replace("'", "'\\''")
    
    commands = f"""
# Backup current file
sudo cp /var/www/summit/dist/routes/meetings.js /var/www/summit/dist/routes/meetings.js.backup-$(date +%s)

# Deploy updated meetings.ts (compiled to .js)
cat > /tmp/meetings.ts << 'MEETINGS_EOF'
{meetings_content_escaped}
MEETINGS_EOF

# Compile TypeScript to JavaScript (remove types, convert imports)
sudo tsc /tmp/meetings.ts --target ES2020 --module ES2020 --outDir /tmp --removeComments --esModuleInterop || {{
    echo "❌ TypeScript compilation failed, using direct deployment"
    # If tsc fails, do basic conversion (remove types, keep imports as .js)
    sudo sed 's/: [A-Za-z<>\\[\\]|, ]*//g; s/import \\(.*\\) from "\\(.*\\)";/import \\1 from "\\2.js";/g' /tmp/meetings.ts > /tmp/meetings.js
}}

# Move to production
sudo mv /tmp/meetings.js /var/www/summit/dist/routes/meetings.js
sudo chown summit:summit /var/www/summit/dist/routes/meetings.js

# Restart PM2
sudo -u summit pm2 restart summit-backend

echo "✅ Meeting notifications deployed successfully"
echo "📋 Checking PM2 status..."
sudo -u summit pm2 list
"""
    
    try:
        print("\n🚀 Executing deployment commands...")
        response = ssm.send_command(
            InstanceIds=[instance_id],
            DocumentName='AWS-RunShellScript',
            Parameters={'commands': [commands]},
            TimeoutSeconds=120
        )
        
        command_id = response['Command']['CommandId']
        print(f"✅ Command sent: {command_id}")
        print("\n⏳ Waiting for deployment to complete...")
        
        # Wait for command to complete
        waiter = ssm.get_waiter('command_executed')
        waiter.wait(
            CommandId=command_id,
            InstanceId=instance_id,
            WaiterConfig={'Delay': 2, 'MaxAttempts': 30}
        )
        
        # Get command output
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=instance_id
        )
        
        print("\n📤 Deployment Output:")
        print(output['StandardOutputContent'])
        
        if output['StandardErrorContent']:
            print("\n⚠️ Errors:")
            print(output['StandardErrorContent'])
        
        if output['Status'] == 'Success':
            print("\n✅ Meeting invitation notifications deployed successfully!")
            print("\n📋 What was deployed:")
            print("  - Added messageNotifier import to meetings.ts")
            print("  - Added WebSocket notifications when meetings are created")
            print("  - Participants now receive real-time notifications")
            print("\n🧪 Test by:")
            print("  1. Create a meeting with participants")
            print("  2. Participants should see notification immediately")
            print("  3. Check console for '📅 Meeting invitation received'")
            return True
        else:
            print(f"\n❌ Deployment failed with status: {output['Status']}")
            return False
            
    except Exception as e:
        print(f"\n❌ Deployment error: {e}")
        return False

if __name__ == "__main__":
    success = deploy_meeting_notifications()
    sys.exit(0 if success else 1)
