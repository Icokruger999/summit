#!/usr/bin/env python3
"""
Restore backend to commit 3c62d34 via SSM using a single shell script
"""
import boto3
import time

ssm = boto3.client('ssm', region_name='us-east-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'
TARGET_COMMIT = '3c62d34'

commands = [
    "pm2 stop summit || true",
    "sleep 2",
    "cd /var/www/summit && git log --oneline -1",
    "cd /var/www/summit && git fetch origin",
    f"cd /var/www/summit && git checkout {TARGET_COMMIT}",
    "cd /var/www/summit && git log --oneline -1",
    "cd /var/www/summit && npm install --legacy-peer-deps",
    "cd /var/www/summit && npm run build",
    "pm2 start summit",
    "sleep 3",
    "pm2 status",
    "curl -s https://summit.api.codingeverest.com/health"
]

print("📤 Sending restoration commands to EC2 via SSM...")

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'command': commands},
        TimeoutSeconds=600
    )
    
    command_id = response['Command']['CommandId']
    print(f"✅ Command sent: {command_id}")
    print("⏳ Waiting for execution...")
    
    # Wait for completion
    time.sleep(5)
    
    # Get output
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    print("\n📋 Output:")
    print(output.get('StandardOutputContent', 'No output'))
    
    if output.get('StandardErrorContent'):
        print("\n⚠️  Errors:")
        print(output['StandardErrorContent'])
    
    print(f"\n✅ Status: {output.get('Status', 'Unknown')}")
    
except Exception as e:
    print(f"❌ Error: {e}")
