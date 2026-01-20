import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Check CORS config in index.js ==="
grep -A10 "CORS" /var/www/summit/index.js | head -20

echo ""
echo "=== Check .env CORS_ORIGINS ==="
grep CORS /var/www/summit/.env

echo ""
echo "=== Test CORS preflight ==="
curl -s -X OPTIONS -H "Origin: https://summit.codingeverest.com" -H "Access-Control-Request-Method: GET" -I https://summit.api.codingeverest.com/api/subscriptions/status 2>&1 | head -20
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
