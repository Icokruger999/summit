import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Test /api/subscriptions/status (no auth) ==="
curl -s http://localhost:4000/api/subscriptions/status
echo ""

echo ""
echo "=== Check subscriptions.js for status endpoint ==="
grep -A5 "status" /var/www/summit/routes/subscriptions.js | head -20

echo ""
echo "=== Check PM2 logs for errors ==="
export HOME=/root
pm2 logs summit --err --lines 10 --nostream
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
