#!/usr/bin/env python3
"""
Deploy group call feature to EC2
Adds GET /api/chats/:chatId endpoint for fetching group members
"""

import boto3
import time

# EC2 instance details
INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

# Initialize SSM client
ssm = boto3.client('ssm', region_name=REGION)

def run_command(command, description):
    """Run a command via SSM and wait for completion"""
    print(f"\n{'='*60}")
    print(f"📝 {description}")
    print(f"{'='*60}")
    print(f"Command: {command}\n")
    
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [command]},
        TimeoutSeconds=300
    )
    
    command_id = response['Command']['CommandId']
    print(f"⏳ Command ID: {command_id}")
    print("Waiting for command to complete...")
    
    # Wait for command to complete
    max_attempts = 30
    for attempt in range(max_attempts):
        time.sleep(2)
        try:
            result = ssm.get_command_invocation(
                CommandId=command_id,
                InstanceId=INSTANCE_ID
            )
            status = result['Status']
            
            if status == 'Success':
                print(f"✅ Command completed successfully")
                if result.get('StandardOutputContent'):
                    print(f"\nOutput:\n{result['StandardOutputContent']}")
                return True
            elif status in ['Failed', 'Cancelled', 'TimedOut']:
                print(f"❌ Command {status}")
                if result.get('StandardErrorContent'):
                    print(f"\nError:\n{result['StandardErrorContent']}")
                if result.get('StandardOutputContent'):
                    print(f"\nOutput:\n{result['StandardOutputContent']}")
                return False
            else:
                print(f"⏳ Status: {status} (attempt {attempt + 1}/{max_attempts})")
        except Exception as e:
            print(f"⚠️ Error checking status: {e}")
    
    print(f"❌ Command timed out after {max_attempts} attempts")
    return False

def main():
    print("🚀 Deploying Group Call Feature to EC2")
    print(f"Instance: {INSTANCE_ID}")
    print(f"Region: {REGION}")
    
    # Step 1: Add the new GET /:chatId endpoint to chats.ts
    # This adds the endpoint after the GET / endpoint
    add_endpoint_command = """
cd /var/www/summit/dist/routes && \\
sed -i '/\\/\\/ Get or create a direct chat between current user and another user/i\\
\\/\\/ Get a specific chat with participants (for group calls)\\
router.get("\\/:chatId", authenticate, async (req, res) => {\\
  try {\\
    const userId = req.user.id;\\
    const { chatId } = req.params;\\
    console.log(`📥 GET \\/api\\/chats\\/${chatId} - User: ${userId}`);\\
\\
    \\/\\/ Verify user is a participant\\
    const participantCheck = await query(`\\
      SELECT 1 FROM chat_participants\\
      WHERE chat_id = \\$1 AND user_id = \\$2\\
    `, [chatId, userId]);\\
\\
    if (participantCheck.rows.length === 0) {\\
      return res.status(403).json({ error: "Not a participant in this chat" });\\
    }\\
\\
    \\/\\/ Get chat details\\
    const chatResult = await query(`\\
      SELECT \\
        c.id,\\
        c.name,\\
        c.type,\\
        c.created_by,\\
        c.created_at,\\
        c.updated_at,\\
        c.last_message,\\
        c.last_message_at\\
      FROM chats c\\
      WHERE c.id = \\$1\\
    `, [chatId]);\\
\\
    if (chatResult.rows.length === 0) {\\
      return res.status(404).json({ error: "Chat not found" });\\
    }\\
\\
    const chat = chatResult.rows[0];\\
\\
    \\/\\/ Get all participants\\
    const participantsResult = await query(`\\
      SELECT \\
        cp.user_id,\\
        u.name,\\
        u.email,\\
        u.avatar_url\\
      FROM chat_participants cp\\
      JOIN users u ON cp.user_id = u.id\\
      WHERE cp.chat_id = \\$1\\
    `, [chatId]);\\
\\
    const response = {\\
      id: chat.id,\\
      name: chat.name,\\
      type: chat.type,\\
      created_by: chat.created_by,\\
      created_at: chat.created_at,\\
      updated_at: chat.updated_at,\\
      last_message: chat.last_message,\\
      last_message_at: chat.last_message_at,\\
      participants: participantsResult.rows.map(p => ({\\
        user_id: p.user_id,\\
        name: p.name,\\
        email: p.email,\\
        avatar_url: p.avatar_url,\\
      })),\\
    };\\
\\
    console.log(`✅ Sending chat ${chatId} with ${response.participants.length} participants`);\\
    res.json(response);\\
  } catch (error) {\\
    console.error("❌ Error fetching chat:", error);\\
    res.status(500).json({ error: error.message });\\
  }\\
});\\
\\
' chats.js
"""
    
    if not run_command(add_endpoint_command, "Adding GET /:chatId endpoint to chats.ts"):
        print("\n❌ Failed to add endpoint")
        return False
    
    # Step 2: Restart PM2
    restart_command = "export HOME=/home/ubuntu && pm2 restart summit-backend"
    if not run_command(restart_command, "Restarting PM2"):
        print("\n❌ Failed to restart PM2")
        return False
    
    # Step 3: Test the endpoint
    test_command = "curl -s http://localhost:4000/health"
    if not run_command(test_command, "Testing backend health"):
        print("\n❌ Backend health check failed")
        return False
    
    print("\n" + "="*60)
    print("✅ Group Call Feature Deployed Successfully!")
    print("="*60)
    print("\nChanges:")
    print("  • Added GET /api/chats/:chatId endpoint")
    print("  • Returns chat details with all participants")
    print("  • Frontend can now fetch group members for calls")
    print("\nNext steps:")
    print("  • Deploy frontend changes to Amplify")
    print("  • Test group calls with multiple users")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Deployment cancelled by user")
        exit(1)
    except Exception as e:
        print(f"\n\n❌ Deployment failed with error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
