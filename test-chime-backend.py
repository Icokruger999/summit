#!/usr/bin/env python3
"""
Test Chime backend directly
"""
import boto3
import time
import json

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    command_id = response['Command']['CommandId']
    time.sleep(3)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip(), output.get('StandardErrorContent', '').strip()

print("🧪 TESTING CHIME BACKEND")
print("=" * 60)

print("\n1. Restarting backend to pick up IAM permissions...")
stdout, stderr = run_command("cd /var/www/summit && pm2 restart summit")
print("   ✅ Backend restarted")

print("\n2. Waiting for backend to start...")
time.sleep(5)

print("\n3. Testing Chime SDK directly on server...")
test_script = """
cd /var/www/summit
node -e "
const { ChimeSDKMeetingsClient, CreateMeetingCommand } = require('@aws-sdk/client-chime-sdk-meetings');

async function test() {
  try {
    const client = new ChimeSDKMeetingsClient({ region: 'us-east-1' });
    const command = new CreateMeetingCommand({
      ClientRequestToken: 'test-' + Date.now(),
      MediaRegion: 'us-east-1',
      ExternalMeetingId: 'test-meeting'
    });
    
    const response = await client.send(command);
    console.log('✅ SUCCESS: Meeting created');
    console.log('Meeting ID:', response.Meeting.MeetingId);
    
    // Clean up
    const { DeleteMeetingCommand } = require('@aws-sdk/client-chime-sdk-meetings');
    await client.send(new DeleteMeetingCommand({ MeetingId: response.Meeting.MeetingId }));
    console.log('✅ Meeting deleted');
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('Error code:', error.Code || error.code);
    console.log('Error name:', error.name);
  }
}

test();
" 2>&1
"""

stdout, stderr = run_command(test_script)
print(stdout)
if stderr:
    print("Stderr:", stderr)

print("\n4. Checking PM2 logs for recent errors...")
stdout, stderr = run_command("pm2 logs summit --err --lines 10 --nostream")
if "error" in stdout.lower() or "failed" in stdout.lower():
    print("   ⚠️ Errors found:")
    print(stdout)
else:
    print("   ✅ No recent errors")

print("\n" + "=" * 60)
print("\nNext: Try creating a call in the app again")
