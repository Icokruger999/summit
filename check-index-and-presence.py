#!/usr/bin/env python3
import boto3
import json
import time

# EC2 instance details
instance_id = "i-0fba58db502cc8d39"
region = "eu-west-1"

ssm = boto3.client('ssm', region_name=region)

# Check what's in index.js around the chime import
print("=" * 60)
print("CHECKING INDEX.JS IMPORTS AND ROUTES")
print("=" * 60)

commands = [
    # Check if chime is imported
    'grep -n "chime" /var/www/summit/dist/index.js | head -20',
    
    # Check if presence route is still there
    'grep -n "presence" /var/www/summit/dist/index.js | head -20',
    
    # Check all route registrations
    'grep -n "app.use.*api" /var/www/summit/dist/index.js',
    
    # Check PM2 status
    'export HOME=/home/ubuntu && pm2 status',
    
    # Test presence endpoint
    'curl -s http://localhost:4000/api/presence/test || echo "Presence endpoint failed"',
    
    # Test chime endpoint
    'curl -s http://localhost:4000/api/chime/test || echo "Chime endpoint test"',
    
    # Check recent PM2 logs for errors
    'export HOME=/home/ubuntu && pm2 logs summit-backend --lines 30 --nostream'
]

for cmd in commands:
    print(f"\n{'='*60}")
    print(f"Running: {cmd}")
    print('='*60)
    
    response = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [cmd]},
        TimeoutSeconds=30
    )
    
    command_id = response['Command']['CommandId']
    time.sleep(2)
    
    try:
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=instance_id,
        )
        
        print(output['StandardOutputContent'])
        if output['StandardErrorContent']:
            print("STDERR:", output['StandardErrorContent'])
    except Exception as e:
        print(f"Error: {e}")
    
    time.sleep(1)

print("\n" + "="*60)
print("CHECK COMPLETE")
print("="*60)
