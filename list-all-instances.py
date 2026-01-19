#!/usr/bin/env python3
import boto3

ec2 = boto3.client('ec2', region_name='us-east-1')

try:
    response = ec2.describe_instances()
    
    print("All EC2 instances in us-east-1:")
    print("-" * 50)
    
    for reservation in response['Reservations']:
        for instance in reservation['Instances']:
            name = 'No Name'
            for tag in instance.get('Tags', []):
                if tag['Key'] == 'Name':
                    name = tag['Value']
                    break
            
            print(f"ID: {instance['InstanceId']}")
            print(f"Name: {name}")
            print(f"State: {instance['State']['Name']}")
            print(f"Type: {instance['InstanceType']}")
            print(f"Public IP: {instance.get('PublicIpAddress', 'None')}")
            print("-" * 30)
            
except Exception as e:
    print(f"Error: {str(e)}")