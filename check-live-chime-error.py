#!/usr/bin/env python3
"""
Check live Chime error from backend logs
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
    
    return output.get('StandardOutputContent', '').strip(), output.get('StandardErrorContent', '').strip()

print("🔍 CHECKING LIVE CHIME ERROR")
print("=" * 60)

print("\n1. Checking recent backend logs (last 50 lines)...")
stdout, stderr = run_command("pm2 logs summit --lines 50 --nostream")
print(stdout)

print("\n2. Checking for Chime-specific errors...")
stdout, stderr = run_command("pm2 logs summit --err --lines 20 --nostream | grep -A 5 -B 5 -i 'chime\\|meeting'")
if stdout:
    print(stdout)
else:
    print("   No Chime errors in error log")

print("\n3. Checking if backend is responding...")
stdout, stderr = run_command("curl -s http://localhost:4000/health")
print(f"   Health: {stdout}")

print("\n" + "=" * 60)
print("\nTry creating a call now, then run this script again to see the error")
