#!/usr/bin/env python3
"""
Add detailed logging to Chime endpoint
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

print("🔧 ADDING DETAILED CHIME LOGGING")
print("=" * 60)

print("\n1. Backing up current index.js...")
stdout = run_command("cd /var/www/summit && cp index.js index.js.backup-before-logging")
print("   ✅ Backup created")

print("\n2. Adding detailed error logging...")
# Add more detailed logging to the catch block
fix_script = """
cd /var/www/summit
chmod 644 index.js

# Add detailed error logging
sed -i "s/console.error('Error creating Chime meeting:', error);/console.error('Error creating Chime meeting:'); console.error('Error name:', error.name); console.error('Error message:', error.message); console.error('Error code:', error.Code || error.code); console.error('Full error:', JSON.stringify(error, null, 2));/g" index.js

echo "Logging updated"
"""

stdout = run_command(fix_script)
print(stdout)

print("\n3. Restarting PM2...")
stdout = run_command("cd /var/www/summit && pm2 restart summit")
print("   ✅ PM2 restarted")

print("\n4. Waiting for server to start...")
time.sleep(5)

print("\n" + "=" * 60)
print("✅ DETAILED LOGGING ADDED")
print("\nNow try creating a call again.")
print("Then run: python summit/check-live-chime-error.py")
print("You should see detailed error information.")
