import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Check what ports are listening ==="
netstat -tlnp | grep -E "3000|4000"

echo ""
echo "=== Check .env PORT setting ==="
grep PORT /var/www/summit/.env 2>/dev/null || echo "No PORT in .env"

echo ""
echo "=== Test port 4000 ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/auth/me
echo " - port 4000"

echo ""
echo "=== Test port 3000 ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me
echo " - port 3000"
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
