import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Stop PM2 from restarting ==="
pm2 stop all 2>/dev/null || true

echo "=== Find the working node process ==="
WORKING_PID=$(lsof -t -i :4000 | head -1)
echo "Working process PID: $WORKING_PID"

echo "=== Delete PM2 process list ==="
pm2 delete all 2>/dev/null || true

echo "=== Check if server still works ==="
curl -s http://localhost:4000/api/health && echo " - Server is working"

echo ""
echo "=== Now let's check recent actual logs from the working process ==="
# The working process should have logs in journalctl or we can check via API
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
