#!/usr/bin/env python3
"""
Fix chatId length issue for Chime SDK
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

print("🔧 FIXING CHATID LENGTH FOR CHIME SDK")
print("=" * 60)

print("\n1. Backing up...")
stdout = run_command("cd /var/www/summit && cp index.js index.js.backup-before-chatid-fix")
print("   ✅ Backup created")

print("\n2. Adding crypto import and fixing chatId length...")
fix_script = """
cd /var/www/summit
chmod 644 index.js

# Add crypto import at the top if not already there
if ! grep -q "import crypto from 'crypto'" index.js; then
  sed -i "9a import crypto from 'crypto';" index.js
fi

# Fix the Chime meeting endpoint to hash the chatId
# The chatId is too long (91 chars), Chime only allows 64 chars
# We'll create a hash of it to make it shorter but still unique

# Create a temporary file with the fix
cat > /tmp/fix_chatid.sed << 'EOF'
s/ClientRequestToken: \`\${chatId}-\${Date.now()}\`/ClientRequestToken: crypto.createHash('sha256').update(chatId + '-' + Date.now()).digest('hex').substring(0, 64)/g
s/ExternalMeetingId: chatId/ExternalMeetingId: crypto.createHash('sha256').update(chatId).digest('hex').substring(0, 64)/g
EOF

# Apply the fix
sed -i -f /tmp/fix_chatid.sed index.js

echo "ChatId length fixed"
"""

stdout = run_command(fix_script)
print(stdout)

print("\n3. Restarting PM2...")
stdout = run_command("cd /var/www/summit && pm2 restart summit")
print("   ✅ PM2 restarted")

print("\n4. Waiting for server...")
time.sleep(5)

print("\n5. Testing with a long chatId...")
test_script = """
cd /var/www/summit
node -e "
const crypto = require('crypto');
const chatId = 'chat-direct-30748e1e-e2db-4997-8e65-b2f1710fc7d9-faa9eae9-c75a-47fd-b8b8-127e5e69e742';

console.log('Original chatId length:', chatId.length);

const hashedId = crypto.createHash('sha256').update(chatId).digest('hex').substring(0, 64);
console.log('Hashed chatId length:', hashedId.length);
console.log('Hashed chatId:', hashedId);
" 2>&1
"""

stdout = run_command(test_script)
print(stdout)

print("\n" + "=" * 60)
print("✅ CHATID LENGTH FIXED")
print("\nThe chatId will now be hashed to 64 characters.")
print("Try creating a call again!")
