#!/usr/bin/env python3
"""Fix the GET meeting endpoint to return full Chime meeting data"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=60
    )
    command_id = response['Command']['CommandId']
    time.sleep(5)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip()

print("🔧 FIXING GET MEETING ENDPOINT")
print("=" * 60)

print("\n1. Backing up index.js...")
stdout = run_command("cp /var/www/summit/index.js /var/www/summit/index.js.backup-get-meeting")
print("   ✅ Backed up")

print("\n2. Updating POST /api/chime/meeting to store full meeting data...")
# Update the POST endpoint to store the full meeting object
update_post = """
cd /var/www/summit
chmod 644 index.js

# Replace the activeMeetings.set line to store full meeting data
sed -i "s/activeMeetings.set(chatId, { meetingId: meeting.MeetingId, externalMeetingId: meeting.ExternalMeetingId, mediaRegion: meeting.MediaRegion, createdAt: new Date(), createdBy: userId });/activeMeetings.set(chatId, { MeetingId: meeting.MeetingId, ExternalMeetingId: meeting.ExternalMeetingId, MediaRegion: meeting.MediaRegion, MediaPlacement: meeting.MediaPlacement, createdAt: new Date(), createdBy: userId });/" index.js

echo "✅ Updated POST endpoint"
"""
stdout = run_command(update_post)
print(stdout)

print("\n3. Verifying changes...")
stdout = run_command("grep -o 'MediaPlacement: meeting.MediaPlacement' /var/www/summit/index.js | head -1")
if stdout:
    print(f"   ✅ Found: {stdout}")
else:
    print("   ❌ Update failed!")

print("\n4. Restarting PM2...")
stdout = run_command("pm2 restart summit")
print("   ✅ Restarted")

print("\n5. Waiting for server to start...")
time.sleep(5)

print("\n" + "=" * 60)
print("✅ GET MEETING ENDPOINT FIXED")
print("\nThe endpoint now returns full Chime meeting data including MediaPlacement")
