import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== PM2 Status ==="
export HOME=/root
pm2 status

echo "=== Testing API endpoints ==="
echo "Auth endpoint:"
curl -s http://localhost:3000/api/auth/me 2>&1 | head -3

echo ""
echo "Chats endpoint (needs auth):"
curl -s http://localhost:3000/api/chats 2>&1 | head -3

echo ""
echo "Chime endpoint (needs auth):"
curl -s http://localhost:3000/api/chime/meeting/test 2>&1 | head -3

echo ""
echo "=== Recent PM2 logs ==="
pm2 logs --lines 5 --nostream
'''

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [commands]},
    TimeoutSeconds=60
)

command_id = response['Command']['CommandId']
print(f'Command ID: {command_id}')

time.sleep(15)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)

print(f"Status: {output['Status']}")
print('Output:')
print(output.get('StandardOutputContent', ''))
if output.get('StandardErrorContent'):
    print('Errors:')
    print(output['StandardErrorContent'])
