#!/usr/bin/env python3
"""
Restore backend via SSM with inline bash script
"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

print("📤 Sending restore command via SSM...\n")

# Create inline bash script
bash_script = """
pm2 stop summit || true
sleep 2
cd /var/www/summit
git fetch origin
git checkout 3c62d34
npm install --legacy-peer-deps
npm run build
pm2 start summit
sleep 3
pm2 status
"""

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={
            'command': [bash_script]
        },
        TimeoutSeconds=600
    )
    
    command_id = response['Command']['CommandId']
    print(f"✅ Command sent: {command_id}")
    print("⏳ Waiting for execution (5-10 minutes)...\n")
    
    # Wait for completion
    time.sleep(20)
    
    # Get output
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    print("📋 Output:")
    stdout = output.get('StandardOutputContent', '')
    print(stdout if stdout else 'No output yet')
    
    if output.get('StandardErrorContent'):
        print("\n⚠️  Errors:")
        print(output['StandardErrorContent'])
    
    print(f"\n✅ Status: {output.get('Status', 'Unknown')}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
