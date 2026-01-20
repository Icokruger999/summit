#!/usr/bin/env python3
"""
Fix ClientRequestToken length
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

print("🔧 FIXING CLIENTREQUESTTOKEN LENGTH")
print("=" * 60)

print("\n1. Checking current ClientRequestToken...")
stdout = run_command("grep -o 'ClientRequestToken:.*ExternalMeetingId' /var/www/summit/index.js | head -1")
print(f"   Current: {stdout[:100]}...")

print("\n2. Fixing ClientRequestToken to use hash...")
fix_script = """
cd /var/www/summit
chmod 644 index.js

# The ClientRequestToken is being created as: chatId + '-' + Date.now()
# This makes it too long. We need to hash it.

# Find and replace the ClientRequestToken creation
# Look for the pattern and replace with hashed version
node -e "
const fs = require('fs');
const content = fs.readFileSync('index.js', 'utf8');

// Replace ClientRequestToken with hashed version
const fixed = content.replace(
  /ClientRequestToken: crypto\\.createHash\\('sha256'\\)\\.update\\(chatId \\+ '-' \\+ Date\\.now\\(\\)\\)\\.digest\\('hex'\\)\\.substring\\(0, 64\\)/g,
  'ClientRequestToken: crypto.createHash(\\'sha256\\').update(chatId + \\'-\\' + Date.now()).digest(\\'hex\\').substring(0, 64)'
).replace(
  /ClientRequestToken: \\\`\\\${chatId}-\\\${Date\\.now\\(\\)}\\\`/g,
  'ClientRequestToken: crypto.createHash(\\'sha256\\').update(chatId + \\'-\\' + Date.now()).digest(\\'hex\\').substring(0, 64)'
);

fs.writeFileSync('index.js', fixed);
console.log('Fixed');
"
"""

stdout = run_command(fix_script)
print(stdout)

print("\n3. Restarting PM2...")
stdout = run_command("cd /var/www/summit && pm2 restart summit")
print("   ✅ Restarted")

print("\n4. Testing...")
time.sleep(3)

print("\n" + "=" * 60)
print("✅ Try creating a call now!")
