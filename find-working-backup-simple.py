import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

def run_command(command, timeout=60):
    response = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=timeout
    )
    
    command_id = response['Command']['CommandId']
    time.sleep(3)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id
    )
    
    return output['StandardOutputContent']

print("Testing backup: index.js.backup-before-endpoint-fix (24K, Jan 18 17:40)")

stdout = run_command("""
sudo cp /var/www/summit/index.js.backup-before-endpoint-fix /var/www/summit/index.js
pm2 restart summit-backend
sleep 4

TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: ${TOKEN:0:50}..."

curl -s http://localhost:4000/api/chats \
  -H "Authorization: Bearer $TOKEN"
""")

print(stdout)
