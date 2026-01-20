import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
export HOME=/root

echo "=== Copying correct package.json ==="
cp /home/ubuntu/summit/server/package.json /var/www/summit/package.json

echo ""
echo "=== Installing dependencies ==="
cd /var/www/summit
npm install

echo ""
echo "=== Restarting PM2 ==="
pm2 restart summit

sleep 5

echo ""
echo "=== Check if server is listening ==="
netstat -tlnp | grep -E "3000|4000"

echo ""
echo "=== Test API ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/auth/me
echo " - /api/auth/me on port 4000"
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
    print(output.get('StandardErrorContent', ''))
