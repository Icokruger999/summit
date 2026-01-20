import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Fix node_modules in production ==="
cd /var/www/summit

echo "=== Installing dependencies ==="
npm install --production

echo "=== Restart PM2 ==="
pm2 delete summit 2>/dev/null || true
pm2 start index.js --name summit --cwd /var/www/summit
pm2 save

echo "=== Check PM2 status ==="
pm2 status

echo "=== Test health endpoint ==="
sleep 3
curl -s http://localhost:4000/api/health || echo "Health check failed"
'''

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [commands]},
    TimeoutSeconds=180
)

command_id = response['Command']['CommandId']
print(f'Command ID: {command_id}')

time.sleep(60)

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
