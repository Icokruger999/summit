import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Check users table - names ==="
sudo -u postgres psql -d summit -c "SELECT id, name, email FROM users;"

echo ""
echo "=== Check recent messages with sender info ==="
sudo -u postgres psql -d summit -c "SELECT m.id, m.sender_id, u.name as sender_name, u.email as sender_email, LEFT(m.content, 30) as content FROM messages m JOIN users u ON m.sender_id = u.id ORDER BY m.created_at DESC LIMIT 10;"
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
if output.get('StandardErrorContent'):
    print('Errors:')
    print(output.get('StandardErrorContent'))
