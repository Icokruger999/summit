import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZhYTllYWU5LWM3NWEtNDdmZC1iOGI4LTEyN2U1ZTY5ZTc0MiIsImVtYWlsIjoiaWNvQGFzdHV0ZXRlY2guY28uemEiLCJpYXQiOjE3Njg5MjU5NTIsImV4cCI6MTc2OTUzMDc1Mn0.prZlTOb5_eukwajBV08e8_8hH_TNHV1FvUt_qL85q-A"

commands = f'''
echo "=== Check JWT_SECRET value (first 10 chars) ==="
grep JWT_SECRET /var/www/summit/.env | cut -c1-20

echo ""
echo "=== Try to decode token with node ==="
cd /var/www/summit
node -e "
const jwt = require('jsonwebtoken');
const token = '{token}';
const secret = process.env.JWT_SECRET || require('dotenv').config().parsed?.JWT_SECRET;
console.log('JWT_SECRET length:', secret?.length);
console.log('JWT_SECRET first 10 chars:', secret?.substring(0, 10));
try {{
  const decoded = jwt.verify(token, secret);
  console.log('Token valid! User:', decoded.id);
}} catch (e) {{
  console.log('Token error:', e.message);
}}
"
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
if output.get('StandardErrorContent'):
    print('Errors:')
    print(output.get('StandardErrorContent', ''))
