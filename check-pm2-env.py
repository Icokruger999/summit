import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
export HOME=/root

echo "=== Check PM2 process environment ==="
pm2 env 0 | grep -E "JWT_SECRET|NODE_ENV|PORT"

echo ""
echo "=== Restart PM2 with --update-env ==="
cd /var/www/summit
pm2 restart summit --update-env

sleep 5

echo ""
echo "=== Check PM2 env again ==="
pm2 env 0 | grep -E "JWT_SECRET|NODE_ENV|PORT"
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
