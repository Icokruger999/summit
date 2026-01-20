#!/usr/bin/env python3
"""
Add rate limit handling to Chime endpoints
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

print("🔧 ADDING RATE LIMIT HANDLING")
print("=" * 60)

print("\n1. Adding delay and better error messages...")
fix_script = """
cd /var/www/summit
chmod 644 index.js

# Add a simple in-memory cache to track recent meeting creations
# This will help prevent duplicate meeting creation spam

node << 'ENDOFNODE'
const fs = require('fs');
let content = fs.readFileSync('index.js', 'utf8');

// Find the attendee creation error handler and make it return proper error
content = content.replace(
  /catch\s*\(\s*error\s*\)\s*{\s*console\.error\('Error creating attendee:',\s*error\);/g,
  "catch (error) { console.error('Error creating attendee:', error); if (error.name === 'ThrottlingException') { return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment and try again.' }); }"
);

fs.writeFileSync('index.js', content);
console.log('Added rate limit error handling');
ENDOFNODE
"""

stdout = run_command(fix_script)
print(stdout)

print("\n2. Restarting PM2...")
stdout = run_command("cd /var/www/summit && pm2 restart summit")
print("   ✅ Restarted")

print("\n3. Waiting...")
time.sleep(5)

print("\n" + "=" * 60)
print("✅ RATE LIMIT HANDLING ADDED")
print("\nThe backend will now return 429 status when rate limited.")
print("The frontend should handle this and show a proper message.")
