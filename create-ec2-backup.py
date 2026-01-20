import boto3
from datetime import datetime

ec2 = boto3.client('ec2', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

# Create AMI name with timestamp
timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
ami_name = f'summit-backup-{timestamp}'

print(f'Creating AMI backup: {ami_name}')
print(f'Instance: {instance_id}')
print('This may take several minutes...')

response = ec2.create_image(
    InstanceId=instance_id,
    Name=ami_name,
    Description=f'Summit server backup - {timestamp} - Working state with backend on port 4000',
    NoReboot=True  # Don't reboot the instance during backup
)

ami_id = response['ImageId']
print(f'\n✅ AMI creation started!')
print(f'AMI ID: {ami_id}')
print(f'AMI Name: {ami_name}')
print(f'\nThe AMI is being created in the background.')
print('You can check its status in the AWS Console under EC2 > AMIs')
print(f'\nTo restore from this backup, launch a new instance using AMI: {ami_id}')
