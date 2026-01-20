import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
export HOME=/root

echo "=== Fix git ownership ==="
git config --global --add safe.directory /home/ubuntu/summit

echo ""
echo "=== Pull latest code ==="
cd /home/ubuntu/summit
git fetch origin
git reset --hard origin/main

echo ""
echo "=== Clean and rebuild ==="
cd /home/ubuntu/summit/server
rm -rf dist
npm run build

echo ""
echo "=== Copy ALL files to production ==="
rm -rf /var/www/summit/middleware /var/www/summit/routes /var/www/summit/lib
cp -r dist/* /var/www/summit/

echo ""
echo "=== Verify auth.js has new code ==="
head -15 /var/www/summit/middleware/auth.js

echo ""
echo "=== Restart PM2 ==="
cd /var/www/summit
pm2 delete summit 2>/dev/null || true
pm2 start index.js --name summit --cwd /var/www/summit
pm2 save

sleep 5

echo ""
echo "=== Test API ==="
curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZhYTllYWU5LWM3NWEtNDdmZC1iOGI4LTEyN2U1ZTY5ZTc0MiIsImVtYWlsIjoiaWNvQGFzdHV0ZXRlY2guY28uemEiLCJpYXQiOjE3Njg5MjU5NTIsImV4cCI6MTc2OTUzMDc1Mn0.prZlTOb5_eukwajBV08e8_8hH_TNHV1FvUt_qL85q-A" http://localhost:4000/api/presence/faa9eae9-c75a-47fd-b8b8-127e5e69e742
echo ""
'''

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [commands]},
    TimeoutSeconds=180
)

command_id = response['Command']['CommandId']
print(f'Command ID: {command_id}')

time.sleep(60)

output = ssm.get_command_invocation(
    CommandId=command_id,
    InstanceId=instance_id
)

print(f"Status: {output['Status']}")
print('Output:')
print(output.get('StandardOutputContent', ''))
if output.get('StandardErrorContent'):
    print('Errors:')
    print(output.get('StandardErrorContent', ''))
