import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Stop the /etc/.pm2 PM2 instance ==="
export HOME=/etc
pm2 kill 2>/dev/null || true

echo ""
echo "=== Check the /root/.pm2 PM2 instance ==="
export HOME=/root
pm2 status

echo ""
echo "=== Test API ==="
curl -s https://summit.api.codingeverest.com/api/health

echo ""
echo "=== Recent logs from working PM2 ==="
export HOME=/root
pm2 logs summit --lines 30 --nostream 2>&1 | tail -30
'''

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [commands]},
    TimeoutSeconds=60
)

command_id = response['Command']['CommandId']
print(f'Command ID: {command_id}')

time.sleep(20)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)

print(f"Status: {output['Status']}")
print('Output:')
print(output.get('StandardOutputContent', ''))
