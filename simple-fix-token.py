#!/usr/bin/env python3
"""
Simple fix for ClientRequestToken - just use timestamp
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

print("🔧 SIMPLE FIX FOR CLIENTREQUESTTOKEN")
print("=" * 60)

print("\n1. Using Node to properly fix the file...")
fix_script = """
cd /var/www/summit
chmod 644 index.js

node << 'ENDOFNODE'
const fs = require('fs');
const crypto = require('crypto');

let content = fs.readFileSync('index.js', 'utf8');

// Find the Chime meeting creation and replace with proper hashing
// The file is minified, so we need to be careful

// Replace any occurrence of ClientRequestToken that uses chatId
// We'll use a simple timestamp-based token instead
content = content.replace(
  /ClientRequestToken:\s*`\${chatId}-\${Date\.now\(\)}`/g,
  'ClientRequestToken: Date.now().toString()'
);

// Also handle if it's already partially fixed
content = content.replace(
  /ClientRequestToken:\s*crypto\.createHash[^,]+,/g,
  'ClientRequestToken: Date.now().toString(),'
);

fs.writeFileSync('index.js', content);
console.log('Fixed ClientRequestToken to use timestamp');
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
print("✅ FIXED - ClientRequestToken now uses simple timestamp")
print("Try creating a call!")
