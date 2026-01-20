#!/usr/bin/env python3
import boto3
import time

instance_id = "i-0fba58db502cc8d39"
region = "eu-west-1"

ssm = boto3.client('ssm', region_name=region)

print("CREATING BACKUP WITH CHIME ROUTES")
print("=" * 60)

commands = [
    # Create new backup with chime
    'BACKUP_DIR="/var/www/summit-backup-with-chime-$(date +%s)" && mkdir -p $BACKUP_DIR && cp -r /var/www/summit/dist $BACKUP_DIR/ && echo "Backup created at: $BACKUP_DIR"',
    
    # List all backups
    'ls -lah /var/www/ | grep summit-backup',
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
print("BACKUP WITH CHIME COMPLETE")
print("="*60)
