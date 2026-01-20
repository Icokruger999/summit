import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Force kill everything on port 4000 ==="
fuser -k 4000/tcp || true
sleep 2

echo "=== Kill all node processes ==="
killall -9 node || true
sleep 2

echo "=== Verify port is free ==="
lsof -i :4000 || echo "Port 4000 is now free"

echo "=== Start PM2 fresh ==="
cd /var/www/summit
pm2 delete all 2>/dev/null || true
pm2 start index.js --name summit --cwd /var/www/summit
pm2 save

echo "=== Wait for startup ==="
sleep 5

echo "=== Check status ==="
pm2 status

echo "=== Test via nginx ==="
curl -s https://summit.api.codingeverest.com/api/health || echo "External health check failed"

echo ""
echo "=== Recent logs ==="
pm2 logs summit --lines 30 --nostream 2>&1 | tail -30
'''

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [commands]},
    TimeoutSeconds=120
)

command_id = response['Command']['CommandId']
print(f'Command ID: {command_id}')

time.sleep(40)

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
