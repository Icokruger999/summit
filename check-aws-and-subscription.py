import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Full .env (masked) ==="
cat /var/www/summit/.env | sed 's/=.*/=***/'

echo ""
echo "=== Check subscription middleware ==="
cat /var/www/summit/middleware/subscription.js

echo ""
echo "=== Check if EC2 has IAM role for Chime ==="
curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/ 2>/dev/null || echo "No IAM role attached"
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
