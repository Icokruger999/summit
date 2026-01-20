import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Check how PORT is set in index.js ==="
grep -A2 -B2 "PORT" /var/www/summit/index.js | head -20

echo ""
echo "=== Check PM2 ecosystem config ==="
cat /var/www/summit/ecosystem.config.cjs 2>/dev/null || echo "No ecosystem.config.cjs"

echo ""
echo "=== Check PM2 process env ==="
export HOME=/root
pm2 env 0 | grep -E "PORT|cwd|NODE_ENV"
'''

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [commands]},
    TimeoutSeconds=60
)

command_id = response['Command']['CommandId']
print(f'Command ID: {command_id}')

time.sleep(10)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)

print(f"Status: {output['Status']}")
print('Output:')
print(output.get('StandardOutputContent', ''))
