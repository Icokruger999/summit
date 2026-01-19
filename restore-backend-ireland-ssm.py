#!/usr/bin/env python3
"""
Restore backend to commit 3c62d34 via SSM in Ireland (eu-west-1)
"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
ec2 = boto3.client('ec2', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'
TARGET_COMMIT = '3c62d34'

print("🔍 Checking EC2 instance in Ireland (eu-west-1)...")
try:
    response = ec2.describe_instances(InstanceIds=[INSTANCE_ID])
    instance = response['Reservations'][0]['Instances'][0]
    print(f"✅ Instance State: {instance['State']['Name']}")
    print(f"   Instance Type: {instance['InstanceType']}")
    print(f"   Private IP: {instance.get('PrivateIpAddress', 'N/A')}\n")
except Exception as e:
    print(f"❌ Error checking instance: {e}")
    exit(1)

# Check SSM agent status
print("🔍 Checking SSM agent status...")
try:
    response = ssm.describe_instance_information(
        Filters=[{'Key': 'InstanceIds', 'Values': [INSTANCE_ID]}]
    )
    if response['InstanceInformationList']:
        info = response['InstanceInformationList'][0]
        print(f"✅ SSM Agent Status: {info['PingStatus']}")
        print(f"   Agent Version: {info.get('AgentVersion', 'N/A')}\n")
    else:
        print("❌ Instance not found in SSM")
        exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)

# Send restoration commands as a list
commands = [
    "pm2 stop summit || true",
    "sleep 2",
    "cd /var/www/summit && git fetch origin",
    "cd /var/www/summit && git checkout 3c62d34",
    "cd /var/www/summit && npm install --legacy-peer-deps",
    "cd /var/www/summit && npm run build",
    "pm2 start summit",
    "sleep 3",
    "pm2 status"
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
    print("⏳ Waiting for execution (this may take 5-10 minutes)...\n")
    
    # Wait for completion
    time.sleep(10)
    
    # Get output
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    print("📋 Output:")
    print(output.get('StandardOutputContent', 'No output'))
    
    if output.get('StandardErrorContent'):
        print("\n⚠️  Errors:")
        print(output['StandardErrorContent'])
    
    print(f"\n✅ Status: {output.get('Status', 'Unknown')}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
