import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
export HOME=/root

echo "=== Check PM2 logs for call-related activity ==="
pm2 logs summit --lines 50 --nostream | grep -E "call|notify|Chime|meeting|📞|INCOMING" || echo "No call logs found"

echo ""
echo "=== Check chime.js notify endpoint ==="
grep -A20 "notify" /var/www/summit/routes/chime.js | head -25

echo ""
echo "=== Check messageNotifier ==="
head -50 /var/www/summit/lib/messageNotifier.js
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
