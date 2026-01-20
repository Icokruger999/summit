import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Checking for backups ==="
ls -la /var/www/ | grep summit

echo ""
echo "=== Restoring from backup ==="
if [ -d "/var/www/summit-backup-1768663852" ]; then
    echo "Found backup, restoring..."
    rm -rf /var/www/summit/*
    cp -r /var/www/summit-backup-1768663852/* /var/www/summit/
    echo "Restored from backup"
fi

echo ""
echo "=== Restarting PM2 ==="
export HOME=/root
pm2 restart summit
sleep 5
pm2 status

echo ""
echo "=== PM2 logs ==="
pm2 logs --lines 10 --nostream
'''

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [commands]},
    TimeoutSeconds=120
)

command_id = response['Command']['CommandId']
print(f'Command ID: {command_id}')

for i in range(12):
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
