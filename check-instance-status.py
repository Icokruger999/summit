#!/usr/bin/env python3
import boto3

ec2 = boto3.client('ec2', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

try:
    response = ec2.describe_instances(InstanceIds=[INSTANCE_ID])
    instance = response['Reservations'][0]['Instances'][0]
    
    print(f"Instance State: {instance['State']['Name']}")
    print(f"Instance Type: {instance['InstanceType']}")
    print(f"Public IP: {instance.get('PublicIpAddress', 'None')}")
    print(f"Private IP: {instance.get('PrivateIpAddress', 'None')}")
    
    if instance['State']['Name'] != 'running':
        print("\nInstance is not running! Starting instance...")
        ec2.start_instances(InstanceIds=[INSTANCE_ID])
        print("Start command sent. Instance will take a few minutes to boot.")
    else:
        print("\nInstance is running.")
        
except Exception as e:
    print(f"Error: {str(e)}")