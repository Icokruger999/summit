import boto3
from datetime import datetime, timezone, timedelta

ec2 = boto3.client('ec2', region_name='eu-west-1')

# Delete AMIs older than 4 hours
MAX_AGE_HOURS = 4

print(f'Looking for summit backups older than {MAX_AGE_HOURS} hours...')

# Find all summit backup AMIs
response = ec2.describe_images(
    Owners=['self'],
    Filters=[{'Name': 'name', 'Values': ['summit-backup-*']}]
)

now = datetime.now(timezone.utc)
deleted = 0

for ami in response['Images']:
    ami_id = ami['ImageId']
    ami_name = ami['Name']
    creation_date = datetime.fromisoformat(ami['CreationDate'].replace('Z', '+00:00'))
    age = now - creation_date
    age_hours = age.total_seconds() / 3600
    
    if age_hours > MAX_AGE_HOURS:
        print(f'Deleting {ami_name} ({ami_id}) - {age_hours:.1f} hours old')
        
        # First deregister the AMI
        ec2.deregister_image(ImageId=ami_id)
        
        # Then delete associated snapshots
        for block in ami.get('BlockDeviceMappings', []):
            if 'Ebs' in block and 'SnapshotId' in block['Ebs']:
                snap_id = block['Ebs']['SnapshotId']
                print(f'  Deleting snapshot {snap_id}')
                try:
                    ec2.delete_snapshot(SnapshotId=snap_id)
                except Exception as e:
                    print(f'  Warning: Could not delete snapshot: {e}')
        
        deleted += 1
    else:
        print(f'Keeping {ami_name} ({ami_id}) - {age_hours:.1f} hours old')

print(f'\n✅ Cleanup complete. Deleted {deleted} old backup(s).')
