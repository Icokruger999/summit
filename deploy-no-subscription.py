import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
export HOME=/root

echo "=== Pull latest code ==="
cd /home/ubuntu/summit
git pull

echo ""
echo "=== Build backend ==="
cd /home/ubuntu/summit/server
npm run build

echo ""
echo "=== Copy to production ==="
cp -r dist/* /var/www/summit/
cp package.json /var/www/summit/

echo ""
echo "=== Install dependencies ==="
cd /var/www/summit
npm install --production

echo ""
echo "=== Restart PM2 ==="
pm2 restart summit

sleep 5

echo ""
echo "=== Verify server is running ==="
pm2 status
ss -tlnp | grep 4000

echo ""
echo "=== Test API ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/auth/me
echo " - /api/auth/me"
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
