import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZhYTllYWU5LWM3NWEtNDdmZC1iOGI4LTEyN2U1ZTY5ZTc0MiIsImVtYWlsIjoiaWNvQGFzdHV0ZXRlY2guY28uemEiLCJpYXQiOjE3Njg5MjU5NTIsImV4cCI6MTc2OTUzMDc1Mn0.prZlTOb5_eukwajBV08e8_8hH_TNHV1FvUt_qL85q-A"

commands = f'''
echo "=== Check auth middleware ==="
head -20 /var/www/summit/middleware/auth.js

echo ""
echo "=== Test with curl and check logs ==="
curl -s -H "Authorization: Bearer {token}" http://localhost:4000/api/presence/faa9eae9-c75a-47fd-b8b8-127e5e69e742
echo ""

echo ""
echo "=== Check PM2 logs ==="
export HOME=/root
pm2 logs summit --lines 15 --nostream
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
