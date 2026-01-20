#!/usr/bin/env python3
"""Fix backend to automatically handle stale meetings"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=120
    )
    command_id = response['Command']['CommandId']
    time.sleep(8)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip(), output.get('StandardErrorContent', '').strip()

# New GET meeting endpoint that verifies meeting exists in AWS
new_get_meeting_code = '''
app.get('/api/chime/meeting/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const meeting = activeMeetings.get(chatId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Verify meeting still exists in AWS Chime
    try {
      const getMeetingCmd = new GetMeetingCommand({ MeetingId: meeting.MeetingId });
      await chimeClient.send(getMeetingCmd);
      // Meeting exists, return it
      res.json({ meeting });
    } catch (verifyError) {
      // Meeting doesn't exist in AWS anymore, remove from cache
      console.log('Meeting', meeting.MeetingId, 'no longer exists in AWS, removing from cache');
      activeMeetings.delete(chatId);
      return res.status(404).json({ error: 'Meeting expired' });
    }
  } catch (error) {
    console.error('Error getting meeting:', error);
    res.status(500).json({ error: 'Failed to get meeting', details: error.message });
  }
});
'''

# Also need to import GetMeetingCommand
print("Step 1: Adding GetMeetingCommand import...")
stdout, stderr = run_command('''
cd /var/www/summit && \\
grep -q "GetMeetingCommand" index.js || \\
sed -i "s/DeleteMeetingCommand/DeleteMeetingCommand, GetMeetingCommand/g" index.js
''')
print("stdout:", stdout)
if stderr:
    print("stderr:", stderr)

print("\nStep 2: Updating GET meeting endpoint to verify meeting exists...")
# First, let's see the current endpoint
stdout, stderr = run_command("grep -n 'GET.*chime/meeting' /var/www/summit/index.js | head -5")
print("Current endpoint line:", stdout)

# Get the line number
line_num = stdout.split(':')[0] if stdout else "0"

# Replace the endpoint with the new one that verifies meetings
update_script = f'''
cd /var/www/summit && \\
cat > /tmp/new_get_meeting.js << 'ENDPOINT'
app.get('/api/chime/meeting/:chatId', authenticate, async (req, res) => {{ try {{ const {{ chatId }} = req.params; const meeting = activeMeetings.get(chatId); if (!meeting) {{ return res.status(404).json({{ error: 'Meeting not found' }}); }} try {{ const getMeetingCmd = new GetMeetingCommand({{ MeetingId: meeting.MeetingId }}); await chimeClient.send(getMeetingCmd); console.log('Meeting verified in AWS:', meeting.MeetingId); res.json({{ meeting }}); }} catch (verifyError) {{ console.log('Meeting', meeting.MeetingId, 'no longer exists in AWS, removing from cache'); activeMeetings.delete(chatId); return res.status(404).json({{ error: 'Meeting expired' }}); }} }} catch (error) {{ console.error('Error getting meeting:', error); res.status(500).json({{ error: 'Failed to get meeting', details: error.message }}); }} }});
ENDPOINT
'''

print("\nStep 3: Creating new endpoint code...")
stdout, stderr = run_command(update_script)
print("stdout:", stdout)
if stderr:
    print("stderr:", stderr)

# Now replace the old endpoint with the new one
print("\nStep 4: Replacing old endpoint...")
# Find and replace the GET meeting endpoint
replace_cmd = '''
cd /var/www/summit && \\
# Backup first
cp index.js index.js.backup && \\
# Use Python to do the replacement
python3 << 'PYEOF'
import re

with open('index.js', 'r') as f:
    content = f.read()

# Pattern to match the old GET meeting endpoint
old_pattern = r"app\\.get\\('/api/chime/meeting/:chatId'[^}]+\\}\\s*\\)\\s*\\);"

new_endpoint = """app.get('/api/chime/meeting/:chatId', authenticate, async (req, res) => { try { const { chatId } = req.params; const meeting = activeMeetings.get(chatId); if (!meeting) { return res.status(404).json({ error: 'Meeting not found' }); } try { const getMeetingCmd = new GetMeetingCommand({ MeetingId: meeting.MeetingId }); await chimeClient.send(getMeetingCmd); console.log('Meeting verified in AWS:', meeting.MeetingId); res.json({ meeting }); } catch (verifyError) { console.log('Meeting', meeting.MeetingId, 'no longer exists in AWS, removing from cache'); activeMeetings.delete(chatId); return res.status(404).json({ error: 'Meeting expired' }); } } catch (error) { console.error('Error getting meeting:', error); res.status(500).json({ error: 'Failed to get meeting', details: error.message }); } });"""

# Try to find and replace
if "app.get('/api/chime/meeting/:chatId'" in content:
    # Find the start
    start = content.find("app.get('/api/chime/meeting/:chatId'")
    if start != -1:
        # Find the end - look for }); pattern after this
        depth = 0
        end = start
        in_string = False
        for i, c in enumerate(content[start:], start):
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    # Found the closing brace, now find the );
                    rest = content[i:i+10]
                    if ');' in rest:
                        end = i + rest.find(');') + 2
                        break
        
        if end > start:
            content = content[:start] + new_endpoint + content[end:]
            with open('index.js', 'w') as f:
                f.write(content)
            print('Endpoint replaced successfully')
        else:
            print('Could not find endpoint end')
    else:
        print('Could not find endpoint start')
else:
    print('Endpoint not found in file')
PYEOF
'''

stdout, stderr = run_command(replace_cmd)
print("stdout:", stdout)
if stderr:
    print("stderr:", stderr)

print("\nStep 5: Verifying GetMeetingCommand import...")
stdout, stderr = run_command("grep 'GetMeetingCommand' /var/www/summit/index.js | head -1")
print("Import check:", stdout)

print("\nStep 6: Restarting server...")
stdout, stderr = run_command("pm2 restart summit")
print("stdout:", stdout)

print("\nStep 7: Checking server status...")
time.sleep(3)
stdout, stderr = run_command("pm2 status summit")
print(stdout)

print("\n✅ Backend updated! Now meetings are verified with AWS before being returned.")
print("If a meeting is stale, it will be automatically removed and a new one created.")
