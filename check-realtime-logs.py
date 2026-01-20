#!/usr/bin/env python3
"""
Check real-time logs
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

print("🔍 CHECKING REAL-TIME LOGS")
print("=" * 60)

print("\n1. Flushing old logs...")
stdout = run_command("pm2 flush summit")
print("   ✅ Logs cleared")

print("\n2. Waiting 5 seconds for you to try creating a call...")
time.sleep(5)

print("\n3. Checking stdout logs...")
stdout = run_command("pm2 logs summit --out --lines 50 --nostream")
print(stdout)

print("\n4. Checking stderr logs...")
stdout = run_command("pm2 logs summit --err --lines 50 --nostream")
print(stdout)

print("\n" + "=" * 60)
