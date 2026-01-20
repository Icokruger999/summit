import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Check if chime routes are loaded ==="
grep -E "chime|Chime" /var/www/summit/index.js | head -5

echo ""
echo "=== Check chime.js exists and has endpoints ==="
grep -E "router\\.(get|post|delete)" /var/www/summit/routes/chime.js

echo ""
echo "=== Test chime endpoint (no auth - should return 401) ==="
curl -s http://localhost:4000/api/chime/meeting/test123
echo ""

echo ""
echo "=== Check AWS credentials are set ==="
grep -E "AWS_ACCESS|AWS_SECRET|AWS_REGION" /var/www/summit/.env | sed 's/=.*/=***/'

echo ""
echo "=== PM2 status ==="
export HOME=/root
pm2 status
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
