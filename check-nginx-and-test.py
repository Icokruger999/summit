import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Nginx proxy_pass config ==="
grep -r "proxy_pass" /etc/nginx/sites-enabled/ 2>/dev/null

echo ""
echo "=== Test API on port 3000 ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me
echo " - /api/auth/me"

echo ""
echo "=== Test via nginx (external) ==="
curl -s -o /dev/null -w "%{http_code}" https://summit.api.codingeverest.com/api/auth/me
echo " - via nginx"

echo ""
echo "=== Check .env PORT ==="
grep PORT /var/www/summit/.env
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
