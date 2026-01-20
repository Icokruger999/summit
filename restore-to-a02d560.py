import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Restoring backend to a02d560 ==="
cd /home/ubuntu/summit
sudo -u ubuntu git fetch origin
sudo -u ubuntu git reset --hard a02d560

echo "=== Building server ==="
cd /home/ubuntu/summit/server
sudo -u ubuntu npm install
sudo -u ubuntu npm run build

echo "=== Copying dist to /var/www/summit ==="
cp -r /home/ubuntu/summit/server/dist/* /var/www/summit/

echo "=== Restarting PM2 ==="
export HOME=/root
pm2 restart summit
sleep 5
pm2 status
'''

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [commands]},
    TimeoutSeconds=300
)

command_id = response['Command']['CommandId']
print(f'Command ID: {command_id}')

for i in range(20):
    time.sleep(10)
    try:
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=instance_id
        )
        if output['Status'] in ['Success', 'Failed', 'Cancelled', 'TimedOut']:
            break
        print(f"Still running... ({(i+1)*10}s)")
    except:
        pass

print(f"Status: {output['Status']}")
print('Output:')
print(output.get('StandardOutputContent', ''))
if output.get('StandardErrorContent'):
    print('Errors:')
    print(output['StandardErrorContent'])
