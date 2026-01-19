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

print("Checking backup files...")

stdout = run_command("""
ls -lah /var/www/summit/*.backup* | tail -20
""")

print(stdout)

print("\n\nLet me try the backup-before-chime-handlers version:")

stdout = run_command("""
# Stop PM2
pm2 stop summit-backend

# Copy backup
sudo cp /var/www/summit/index.js.backup-before-chime-handlers /var/www/summit/index.js

# Start PM2
pm2 start summit-backend

sleep 3

# Test
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Testing chats endpoint:"
curl -s http://localhost:4000/api/chats \
  -H "Authorization: Bearer $TOKEN" | head -100
""")

print(stdout)
