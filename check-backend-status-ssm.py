#!/usr/bin/env python3
"""
Check backend status on EC2 via SSM and verify it's running the correct version
"""
import boto3
import json
import time

ssm = boto3.client('ssm', region_name='us-east-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    """Run command on EC2 via SSM"""
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName='AWS-RunShellScript',
            Parameters={'command': [command]},
            TimeoutSeconds=30
        )
        command_id = response['Command']['CommandId']
        
        # Wait for command to complete
        time.sleep(2)
        
        # Get command output
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        return {
            'status': output['Status'],
            'stdout': output.get('StandardOutputContent', ''),
            'stderr': output.get('StandardErrorContent', '')
        }
    except Exception as e:
        return {'error': str(e)}

print("🔍 Checking backend status on EC2...")
print(f"Instance: {INSTANCE_ID}\n")

# Check if backend is running
print("1️⃣  Checking if backend process is running...")
result = run_command("pm2 status")
print(result['stdout'])
if result.get('stderr'):
    print("STDERR:", result['stderr'])

# Check backend version/commit
print("\n2️⃣  Checking backend version...")
result = run_command("cd /var/www/summit && git log --oneline -1")
print(result['stdout'])

# Check if routes are available
print("\n3️⃣  Testing /api/chat-requests/received endpoint...")
result = run_command("curl -s https://summit.api.codingeverest.com/api/chat-requests/received -H 'Authorization: Bearer test' | head -20")
print(result['stdout'])

# Check backend logs
print("\n4️⃣  Checking recent backend logs...")
result = run_command("pm2 logs summit --lines 20 --nostream")
print(result['stdout'])
