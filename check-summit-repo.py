import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Checking summit-repo ==="
ls -la /var/www/summit-repo/

echo ""
echo "=== Checking if it has routes/chime.js ==="
cat /var/www/summit-repo/routes/chime.js 2>/dev/null | head -20 || echo "No chime.js in summit-repo"

echo ""
echo "=== Checking summit-repo git log ==="
cd /var/www/summit-repo && git log --oneline -5 2>/dev/null || echo "Not a git repo"
'''

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [commands]},
    TimeoutSeconds=60
)

command_id = response['Command']['CommandId']
print(f'Command ID: {command_id}')

time.sleep(15)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)

print(f"Status: {output['Status']}")
print('Output:')
print(output.get('StandardOutputContent', ''))
