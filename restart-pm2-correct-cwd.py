import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
export HOME=/root

echo "=== Stop current PM2 process ==="
pm2 delete summit 2>/dev/null || true

echo ""
echo "=== Start PM2 with correct cwd ==="
cd /var/www/summit
pm2 start index.js --name summit --cwd /var/www/summit

echo ""
echo "=== Save PM2 config ==="
pm2 save

sleep 5

echo ""
echo "=== Check PM2 status ==="
pm2 status

echo ""
echo "=== Check listening ports ==="
ss -tlnp | grep -E "3000|4000"

echo ""
echo "=== Test API on port 4000 ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/auth/me
echo " - port 4000"

echo ""
echo "=== Recent logs ==="
pm2 logs summit --lines 5 --nostream
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
    print(output.get('StandardErrorContent', ''))
