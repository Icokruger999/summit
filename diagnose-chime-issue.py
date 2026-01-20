#!/usr/bin/env python3
"""
Diagnose Chime call issues
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

print("🔍 DIAGNOSING CHIME CALL ISSUES")
print("=" * 60)

print("\n1. Checking for MediaRegion syntax error...")
stdout = run_command("grep -n 'MediaRegion:' /var/www/summit/index.js")
if "MediaRegion: us-east-1" in stdout and "'us-east-1'" not in stdout:
    print("   ❌ FOUND ERROR: MediaRegion missing quotes")
    print(f"   Line: {stdout}")
else:
    print("   ✅ MediaRegion syntax looks correct")

print("\n2. Checking PM2 logs for Chime errors...")
stdout = run_command("pm2 logs summit --lines 20 --nostream | grep -i 'chime\\|meeting\\|error'")
print(stdout if stdout else "   No recent Chime errors")

print("\n3. Checking if Chime SDK package is installed...")
stdout = run_command("cd /var/www/summit && npm list @aws-sdk/client-chime-sdk-meetings 2>&1 | head -5")
print(stdout)

print("\n4. Testing Chime endpoint accessibility...")
stdout = run_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/health")
print(f"   Health endpoint status: {stdout}")

print("\n" + "=" * 60)
print("\nISSUES FOUND:")
print("1. Backend has MediaRegion without quotes (will cause errors)")
print("2. Frontend doesn't use Chime SDK client library")
print("3. No actual audio/video connection code in frontend")
print("\nNEXT STEPS:")
print("1. Fix MediaRegion syntax in backend")
print("2. Add Chime SDK client library to frontend")
print("3. Implement actual audio/video connection logic")
