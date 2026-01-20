#!/usr/bin/env python3
"""
Verify the Chime fix was applied correctly
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

print("🔍 VERIFYING CHIME FIX")
print("=" * 60)

print("\n1. Checking if ClientRequestToken is fixed...")
stdout = run_command("cd /var/www/summit && grep -o 'ClientRequestToken:[^,}]*' index.js | head -5")
print(stdout)

print("\n2. Checking if ExternalMeetingId is fixed...")
stdout = run_command("cd /var/www/summit && grep -o 'ExternalMeetingId:[^,}]*' index.js | head -5")
print(stdout)

print("\n3. Checking PM2 status...")
stdout = run_command("pm2 status summit")
print(stdout)

print("\n4. Testing health endpoint...")
stdout = run_command("curl -s http://localhost:4000/health")
print(f"   {stdout}")

print("\n" + "=" * 60)
print("✅ VERIFICATION COMPLETE")
print("\nNow try creating a call in the app!")
