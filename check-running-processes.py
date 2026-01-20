import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== All node processes ==="
ps aux | grep node | grep -v grep

echo ""
echo "=== What's on port 4000 ==="
lsof -i :4000

echo ""
echo "=== PM2 list ==="
pm2 list

echo ""
echo "=== Test the API directly ==="
curl -s http://localhost:4000/api/health || echo "Direct health check failed"
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
