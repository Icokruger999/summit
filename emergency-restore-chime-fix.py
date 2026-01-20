#!/usr/bin/env python3
import boto3
import time

instance_id = "i-0fba58db502cc8d39"
region = "eu-west-1"

ssm = boto3.client('ssm', region_name=region)

print("EMERGENCY RESTORE - Fixing broken chime import")
print("=" * 60)

# Restore from backup and remove the broken chime route
commands = [
    # Stop PM2
    'export HOME=/home/ubuntu && pm2 stop summit-backend',
    
    # Restore from backup
    'cp -r /var/www/summit-backup-1768663852/server/dist/* /var/www/summit/dist/',
    
    # Remove subscription middleware
    'sed -i \'s/import { checkSubscriptionAccess } from ".\/middleware\/subscription.js";//g\' /var/www/summit/dist/index.js',
    'sed -i \'s/checkSubscriptionAccess, //g\' /var/www/summit/dist/index.js',
    
    # Verify chime is NOT in index.js
    'grep -n "chime" /var/www/summit/dist/index.js || echo "Chime not found - good"',
    
    # Start PM2
    'export HOME=/home/ubuntu && pm2 start summit-backend',
    
    # Wait and check status
    'sleep 3',
    'export HOME=/home/ubuntu && pm2 status',
    
    # Test the API
    'curl -s http://localhost:4000/health',
]

for cmd in commands:
    print(f"\nRunning: {cmd}")
    print("-" * 60)
    
    response = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName="AWS-RunShellScript",
        Parameters={'commands': [cmd]},
        TimeoutSeconds=30
    )
    
    command_id = response['Command']['CommandId']
    time.sleep(3)
    
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
print("RESTORE COMPLETE - Server should be working now")
print("="*60)
