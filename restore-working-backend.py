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

print("=" * 60)
print("RESTORING WORKING BACKEND FROM BACKUP")
print("=" * 60)

stdout = run_command("""
# Use the backup from before chime handlers
sudo cp /var/www/summit/index.js.backup-before-chime-handlers /var/www/summit/index.js

# Restart PM2
pm2 restart summit-backend

sleep 3

# Test login and chats
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "=== TESTING CHATS ==="
curl -s http://localhost:4000/api/chats \
  -H "Authorization: Bearer $TOKEN"

echo ""
echo ""
echo "=== TESTING CONTACTS ==="
curl -s http://localhost:4000/api/chat-requests/contacts \
  -H "Authorization: Bearer $TOKEN"
""")

print(stdout)
print("\n" + "=" * 60)
print("DONE - If this works, Amplify build 256 should complete soon")
print("=" * 60)
