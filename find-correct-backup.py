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
    time.sleep(2)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=instance_id
    )
    
    return output['StandardOutputContent']

print("Looking for the correct backup file...")

stdout = run_command("""
# List all backups with timestamps
ls -lah /var/www/summit/*.backup* | grep "Jan 18"

echo ""
echo "=== Trying index.js.backup-before-endpoint-fix (Jan 18 17:40) ==="

# Try this backup
sudo cp /var/www/summit/index.js.backup-before-endpoint-fix /var/www/summit/index.js
pm2 restart summit-backend
sleep 3

# Test
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Testing chats:"
curl -s http://localhost:4000/api/chats \
  -H "Authorization: Bearer $TOKEN" | head -200
""")

print(stdout)
