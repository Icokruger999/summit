#!/usr/bin/env python3
"""
Restore backend to commit 3c62d34 via SSM in Ireland (eu-west-1)
Using correct parameter name: 'commands' (not 'command')
"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'
TARGET_COMMIT = '3c62d34'

print("🔄 Restoring backend to commit 3c62d34 (Chime decision)...")
print(f"Instance: {INSTANCE_ID}\n")

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={
            'commands': [
                'pm2 stop summit || true',
                'sleep 2',
                'cd /var/www/summit && git fetch origin',
                'cd /var/www/summit && git checkout 3c62d34',
                'cd /var/www/summit && npm install --legacy-peer-deps',
                'cd /var/www/summit && npm run build',
                'pm2 start summit',
                'sleep 3',
                'pm2 status'
            ]
        },
        TimeoutSeconds=600
    )
    
    command_id = response['Command']['CommandId']
    print(f"✅ Command sent: {command_id}")
    print("⏳ Waiting for execution (5-10 minutes)...\n")
    
    # Wait for completion
    time.sleep(30)
    
    # Get output
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    print("📋 Output:")
    stdout = output.get('StandardOutputContent', '')
    print(stdout if stdout else 'No output yet - command may still be running')
    
    if output.get('StandardErrorContent'):
        print("\n⚠️  Errors:")
        print(output['StandardErrorContent'])
    
    print(f"\n✅ Status: {output.get('Status', 'Unknown')}")
    print(f"   Command ID: {command_id}")
    print("\n💡 To check status later, run:")
    print(f"   aws ssm get-command-invocation --command-id {command_id} --instance-id {INSTANCE_ID} --region eu-west-1")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
