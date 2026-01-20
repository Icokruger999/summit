#!/usr/bin/env python3
"""
Fix MediaRegion syntax error in Chime endpoint
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

print("🔧 FIXING CHIME MEDIAREGION SYNTAX")
print("=" * 60)

print("\n1. Creating backup...")
stdout = run_command("cd /var/www/summit && cp index.js index.js.backup-before-mediaregion-fix")
print("   ✅ Backup created")

print("\n2. Fixing MediaRegion syntax...")
stdout = run_command("cd /var/www/summit && chmod 644 index.js && sed -i 's/MediaRegion: us-east-1/MediaRegion: \"us-east-1\"/g' index.js")
print("   ✅ Fixed MediaRegion quotes")

print("\n3. Verifying fix...")
stdout = run_command("grep -n 'MediaRegion:' /var/www/summit/index.js")
if '"us-east-1"' in stdout or "'us-east-1'" in stdout:
    print("   ✅ MediaRegion now has quotes")
    print(f"   {stdout[:100]}...")
else:
    print("   ❌ Fix may not have worked")
    print(f"   {stdout}")

print("\n4. Restarting PM2...")
stdout = run_command("cd /var/www/summit && pm2 restart summit")
print("   ✅ PM2 restarted")

print("\n5. Waiting for server to start...")
time.sleep(5)

print("\n6. Checking for errors...")
stdout = run_command("pm2 logs summit --err --lines 5 --nostream")
if "error" in stdout.lower() or "syntaxerror" in stdout.lower():
    print("   ⚠️ Errors detected:")
    print(stdout)
else:
    print("   ✅ No errors in logs")

print("\n7. Testing health endpoint...")
stdout = run_command("curl -s http://localhost:4000/health")
if '"status":"ok"' in stdout:
    print("   ✅ Server responding correctly")
else:
    print("   ❌ Server not responding")
    print(stdout)

print("\n" + "=" * 60)
print("✅ MEDIAREGION FIX COMPLETE")
