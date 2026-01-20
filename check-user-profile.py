import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Check your user profile ==="
sudo -u postgres psql -d summit -c "SELECT id, email, name FROM users WHERE id = 'faa9eae9-c75a-47fd-b8b8-127e5e69e742';"

echo ""
echo "=== Check all users ==="
sudo -u postgres psql -d summit -c "SELECT id, email, name FROM users LIMIT 10;"

echo ""
echo "=== Check recent messages with sender info ==="
sudo -u postgres psql -d summit -c "SELECT m.id, m.sender_id, m.sender_name, m.content, u.name as user_name FROM messages m LEFT JOIN users u ON m.sender_id = u.id ORDER BY m.created_at DESC LIMIT 5;"
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
