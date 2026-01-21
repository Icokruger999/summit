#!/usr/bin/env python3
"""
Deploy meeting invitation notifications to production using sed
"""
import boto3
import sys

def deploy_meeting_notifications():
    """Deploy meeting notifications using sed to edit the file directly"""
    
    instance_id = "i-0fba58db502cc8d39"
    region = "eu-west-1"
    
    print("📅 Deploying meeting invitation notifications...")
    print(f"Instance: {instance_id}")
    print(f"Region: {region}")
    
    ssm = boto3.client('ssm', region_name=region)
    
    commands = """
# Backup current file
sudo cp /var/www/summit/dist/routes/meetings.js /var/www/summit/dist/routes/meetings.js.backup-$(date +%s)

# Add messageNotifier import at the top (after other imports)
sudo sed -i '/import { checkAndCreateChatRequest }/a import { messageNotifier } from "../lib/messageNotifier.js";' /var/www/summit/dist/routes/meetings.js

# Add notification code after chat requests (before the closing brace of the if block)
# Find the line with "Promise.all(chatRequestPromises)" and add notification code after it
sudo sed -i '/Promise.all(chatRequestPromises).catch/a \\
      // Get inviter info for notification\\
      const inviterInfo = await query(\\
        `SELECT name, email FROM users WHERE id = $1`,\\
        [userId]\\
      );\\
      const inviterName = inviterInfo.rows[0]?.name || inviterInfo.rows[0]?.email || "Someone";\\
\\
      // Send WebSocket notifications to all participants about the meeting invitation\\
      participant_ids.forEach((participantId) => {\\
        messageNotifier.notifyUser(participantId, {\\
          meetingId: meeting.id,\\
          meetingTitle: title,\\
          meetingStartTime: start_time,\\
          meetingEndTime: end_time,\\
          inviterName,\\
          inviterId: userId,\\
        }, "MEETING_INVITATION");\\
      });\\
      \\
      console.log(`📅 Sent meeting invitation notifications to ${participant_ids.length} participants`);' /var/www/summit/dist/routes/meetings.js

# Restart PM2
sudo pm2 restart summit-backend

echo "✅ Meeting notifications deployed successfully"
echo "📋 Checking PM2 status..."
sudo pm2 list
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
            print("  - Added messageNotifier import to meetings.js")
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
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = deploy_meeting_notifications()
    sys.exit(0 if success else 1)
