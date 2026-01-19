#!/usr/bin/env python3
"""
Debug SSM command issue
"""
import boto3

ssm = boto3.client('ssm', region_name='us-east-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

# First, verify the instance exists and is online
ec2 = boto3.client('ec2', region_name='us-east-1')

print("🔍 Checking EC2 instance status...")
try:
    response = ec2.describe_instances(InstanceIds=[INSTANCE_ID])
    instance = response['Reservations'][0]['Instances'][0]
    print(f"Instance State: {instance['State']['Name']}")
    print(f"Instance Type: {instance['InstanceType']}")
    print(f"Private IP: {instance.get('PrivateIpAddress', 'N/A')}")
except Exception as e:
    print(f"❌ Error checking instance: {e}")
    exit(1)

# Check SSM agent status
print("\n🔍 Checking SSM agent status...")
try:
    response = ssm.describe_instance_information(
        Filters=[{'key': 'InstanceIds', 'value': [INSTANCE_ID]}]
    )
    if response['InstanceInformationList']:
        info = response['InstanceInformationList'][0]
        print(f"SSM Agent Status: {info['PingStatus']}")
        print(f"Agent Version: {info.get('AgentVersion', 'N/A')}")
    else:
        print("❌ Instance not found in SSM")
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)

# Try a simple command
print("\n📤 Sending simple test command...")
try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'command': ['echo "test"']},
        TimeoutSeconds=30
    )
    print(f"✅ Command sent: {response['Command']['CommandId']}")
except Exception as e:
    print(f"❌ Error: {e}")
