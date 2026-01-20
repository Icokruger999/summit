import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Kill all node processes and clean PM2 ==="
pm2 kill
pkill -f node || true
sleep 2

echo "=== Check port 4000 is free ==="
lsof -i :4000 || echo "Port 4000 is free"

echo "=== Start fresh PM2 ==="
cd /var/www/summit
pm2 start index.js --name summit --cwd /var/www/summit
pm2 save

echo "=== Wait and check status ==="
sleep 5
pm2 status

echo "=== Test API ==="
curl -s http://localhost:4000/api/health || echo "Health check failed"

echo ""
echo "=== Recent logs ==="
pm2 logs summit --lines 20 --nostream 2>&1 | tail -20
'''

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [commands]},
    TimeoutSeconds=120
)

command_id = response['Command']['CommandId']
print(f'Command ID: {command_id}')

time.sleep(30)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)

print(f"Status: {output['Status']}")
print('Output:')
print(output.get('StandardOutputContent', ''))
if output.get('StandardErrorContent'):
    print('Errors:')
    print(output.get('StandardErrorContent'))
