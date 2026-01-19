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

print("Restoring the ORIGINAL working backend from today...")

stdout = run_command("""
# The file that was working at the start - index.js from today before we touched it
# Let's check what was the current index.js size
ls -lh /var/www/summit/index.js

# Use the backup from typing (Jan 17 18:29) - this was stable
sudo cp /var/www/summit/index.js.backup-typing /var/www/summit/index.js

pm2 restart summit-backend
sleep 3

# Test
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "=== CHATS ==="
curl -s http://localhost:4000/api/chats \
  -H "Authorization: Bearer $TOKEN"

echo ""
echo ""
echo "=== CONTACTS ==="
curl -s http://localhost:4000/api/chat-requests/contacts \
  -H "Authorization: Bearer $TOKEN"
""")

print(stdout)
