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

print("Fixing database name in .env...")

stdout = run_command("""
# Fix the database name
sudo sed -i 's/DB_NAME=summit_db/DB_NAME=summit/g' /var/www/summit/.env

# Show the fix
echo "=== Updated .env ==="
grep DB_ /var/www/summit/.env

# Restart PM2
pm2 restart summit-backend
sleep 3

# Test
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "=== CHATS ==="
curl -s http://localhost:4000/api/chats \
  -H "Authorization: Bearer $TOKEN"
""")

print(stdout)
