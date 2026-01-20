#!/usr/bin/env python3
"""
Clear logs and watch for Chime errors
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

print("🔍 CLEARING LOGS AND WATCHING FOR CHIME ERRORS")
print("=" * 60)

print("\n1. Clearing PM2 logs...")
stdout = run_command("pm2 flush summit")
print("   ✅ Logs cleared")

print("\n2. Now try creating a call in the app...")
print("   Waiting 10 seconds...")
time.sleep(10)

print("\n3. Checking logs for errors...")
stdout = run_command("pm2 logs summit --lines 30 --nostream")
print(stdout)

print("\n" + "=" * 60)
print("\nIf you see 'Creating Chime meeting' but no success/error,")
print("the error might be swallowed. Let me check the full error...")
