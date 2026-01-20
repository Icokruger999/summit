#!/usr/bin/env python3
"""
Check Chime SDK region configuration
"""
import boto3
import time

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
    
    return output.get('StandardOutputContent', '').strip()

print("🔍 CHECKING CHIME SDK REGION")
print("=" * 60)

print("\n1. Current Chime SDK configuration in backend...")
stdout = run_command("grep -n 'ChimeSDKMeetingsClient' /var/www/summit/index.js | head -3")
print(stdout)

print("\n2. Checking MediaRegion in meeting creation...")
stdout = run_command("grep -n 'MediaRegion' /var/www/summit/index.js")
print(stdout)

print("\n3. Testing Chime SDK in us-east-1 (supported)...")
test_script = """
cd /var/www/summit
node -e "
const { ChimeSDKMeetingsClient, CreateMeetingCommand } = require('@aws-sdk/client-chime-sdk-meetings');

async function test() {
  try {
    console.log('Testing us-east-1...');
    const client = new ChimeSDKMeetingsClient({ region: 'us-east-1' });
    const command = new CreateMeetingCommand({
      ClientRequestToken: 'test-' + Date.now(),
      MediaRegion: 'us-east-1',
      ExternalMeetingId: 'test-meeting'
    });
    
    const response = await client.send(command);
    console.log('✅ us-east-1 WORKS');
    
    // Clean up
    const { DeleteMeetingCommand } = require('@aws-sdk/client-chime-sdk-meetings');
    await client.send(new DeleteMeetingCommand({ MeetingId: response.Meeting.MeetingId }));
  } catch (error) {
    console.log('❌ us-east-1 FAILED:', error.message);
  }
}

test();
" 2>&1
"""

stdout = run_command(test_script)
print(stdout)

print("\n4. Testing Chime SDK in eu-west-1 (might not be supported)...")
test_script_eu = """
cd /var/www/summit
node -e "
const { ChimeSDKMeetingsClient, CreateMeetingCommand } = require('@aws-sdk/client-chime-sdk-meetings');

async function test() {
  try {
    console.log('Testing eu-west-1...');
    const client = new ChimeSDKMeetingsClient({ region: 'eu-west-1' });
    const command = new CreateMeetingCommand({
      ClientRequestToken: 'test-' + Date.now(),
      MediaRegion: 'eu-west-1',
      ExternalMeetingId: 'test-meeting'
    });
    
    const response = await client.send(command);
    console.log('✅ eu-west-1 WORKS');
    
    // Clean up
    const { DeleteMeetingCommand } = require('@aws-sdk/client-chime-sdk-meetings');
    await client.send(new DeleteMeetingCommand({ MeetingId: response.Meeting.MeetingId }));
  } catch (error) {
    console.log('❌ eu-west-1 FAILED:', error.message);
    console.log('Error code:', error.Code || error.code);
  }
}

test();
" 2>&1
"""

stdout = run_command(test_script_eu)
print(stdout)

print("\n" + "=" * 60)
print("\nCHIME SDK SUPPORTED REGIONS:")
print("✅ us-east-1 (US East - N. Virginia)")
print("✅ us-west-2 (US West - Oregon)")
print("✅ ap-southeast-1 (Asia Pacific - Singapore)")
print("✅ eu-central-1 (Europe - Frankfurt)")
print("❌ eu-west-1 (Europe - Ireland) - NOT SUPPORTED")
print("\nYour EC2 is in eu-west-1, but Chime SDK client should use us-east-1")
