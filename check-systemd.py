import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Check for systemd services ==="
systemctl list-units --type=service | grep -i summit || echo "No summit service"
systemctl list-units --type=service | grep -i node || echo "No node service"

echo ""
echo "=== Check PM2 startup ==="
pm2 startup 2>&1 | head -5

echo ""
echo "=== Check what's managing the node process ==="
NODE_PID=$(lsof -t -i :4000 -s TCP:LISTEN)
echo "Node PID: $NODE_PID"
if [ -n "$NODE_PID" ]; then
    echo "Process tree:"
    pstree -p $NODE_PID 2>/dev/null || ps -p $NODE_PID -o ppid,cmd
    echo ""
    echo "Parent process:"
    PPID=$(ps -o ppid= -p $NODE_PID | tr -d ' ')
    ps -p $PPID -o pid,cmd 2>/dev/null || echo "No parent"
fi

echo ""
echo "=== Test API via nginx ==="
curl -s https://summit.api.codingeverest.com/api/health
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
