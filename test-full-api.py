import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Test via nginx (external) ==="
curl -s -o /dev/null -w "%{http_code}" https://summit.api.codingeverest.com/api/auth/me
echo " - /api/auth/me (should be 401)"

curl -s -o /dev/null -w "%{http_code}" https://summit.api.codingeverest.com/api/subscription/status
echo " - /api/subscription/status (should be 401)"

echo ""
echo "=== Test health endpoint ==="
curl -s https://summit.api.codingeverest.com/api/health

echo ""
echo "=== Server is working! ==="
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
