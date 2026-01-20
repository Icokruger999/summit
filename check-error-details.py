import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
export HOME=/root
echo "=== Full error log ==="
pm2 logs summit --err --lines 30 --nostream

echo ""
echo "=== Check if chime module exists ==="
ls -la /var/www/summit/routes/chime.js 2>/dev/null || echo "chime.js not found"

echo ""
echo "=== Check node_modules for chime ==="
ls -la /home/ubuntu/summit/server/node_modules/@aws-sdk/ | grep chime
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
