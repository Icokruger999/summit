import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Check what routes exist in index.js ==="
grep -E "import.*Routes|app.use.*api" /var/www/summit/index.js

echo ""
echo "=== Check if subscription route file exists ==="
ls -la /var/www/summit/routes/ | grep -i subscription

echo ""
echo "=== Check routes directory ==="
ls -la /var/www/summit/routes/

echo ""
echo "=== Test subscription endpoint ==="
curl -s http://localhost:4000/api/subscription/status
echo ""

echo ""
echo "=== Test presence endpoint ==="
curl -s http://localhost:4000/api/presence/status
echo ""
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
