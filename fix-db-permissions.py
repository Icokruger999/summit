import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

commands = '''
echo "=== Check database connection info ==="
grep -E "DB_USER|DB_NAME|DB_HOST" /var/www/summit/.env | sed 's/=.*/=***/'

echo ""
echo "=== Grant permissions on all tables ==="
sudo -u postgres psql -d summit -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO summit_user;"
sudo -u postgres psql -d summit -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO summit_user;"
sudo -u postgres psql -d summit -c "GRANT USAGE ON SCHEMA public TO summit_user;"

echo ""
echo "=== Test API again ==="
curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZhYTllYWU5LWM3NWEtNDdmZC1iOGI4LTEyN2U1ZTY5ZTc0MiIsImVtYWlsIjoiaWNvQGFzdHV0ZXRlY2guY28uemEiLCJpYXQiOjE3Njg5MjU5NTIsImV4cCI6MTc2OTUzMDc1Mn0.prZlTOb5_eukwajBV08e8_8hH_TNHV1FvUt_qL85q-A" http://localhost:4000/api/presence/faa9eae9-c75a-47fd-b8b8-127e5e69e742
echo ""
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
    print(output.get('StandardErrorContent', ''))
