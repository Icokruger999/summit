import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Find node process on port 4000 ==="
NODE_PID=$(lsof -t -i :4000 -s TCP:LISTEN)
echo "Node PID: $NODE_PID"

echo "=== Kill it directly ==="
if [ -n "$NODE_PID" ]; then
    kill -9 $NODE_PID
    echo "Killed process $NODE_PID"
fi

sleep 2

echo "=== Verify port is free ==="
lsof -i :4000 || echo "Port 4000 is now free"

echo "=== Stop PM2 from auto-restarting ==="
pm2 delete all 2>/dev/null || true

echo "=== Start fresh ==="
cd /var/www/summit
pm2 start index.js --name summit --cwd /var/www/summit
pm2 save

sleep 5

echo "=== Test ==="
curl -s http://localhost:4000/api/health && echo " - SUCCESS"

echo ""
echo "=== PM2 status ==="
pm2 status
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
