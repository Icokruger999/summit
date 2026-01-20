import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Contents of /var/www/summit ==="
ls -la /var/www/summit/

echo ""
echo "=== Check if node_modules exists ==="
ls -la /var/www/summit/node_modules 2>/dev/null | head -5 || echo "node_modules not found"

echo ""
echo "=== Check index.js exists ==="
head -10 /var/www/summit/index.js 2>/dev/null || echo "index.js not found"
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
