#!/usr/bin/env python3
"""
List all EC2 instances to find the correct one
"""
import boto3

ec2 = boto3.client('ec2', region_name='us-east-1')

print("🔍 Listing all EC2 instances in us-east-1...\n")

try:
    response = ec2.describe_instances()
    
    if not response['Reservations']:
        print("❌ No instances found")
        exit(1)
    
    for reservation in response['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            state = instance['State']['Name']
            instance_type = instance['InstanceType']
            tags = {tag['Key']: tag['Value'] for tag in instance.get('Tags', [])}
            name = tags.get('Name', 'N/A')
            
            print(f"Instance: {instance_id}")
            print(f"  Name: {name}")
            print(f"  State: {state}")
            print(f"  Type: {instance_type}")
            print(f"  Private IP: {instance.get('PrivateIpAddress', 'N/A')}")
            print()
            
except Exception as e:
    print(f"❌ Error: {e}")
