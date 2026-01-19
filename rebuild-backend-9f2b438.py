import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

def run_command(command, timeout=180):
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

print("=" * 60)
print("REBUILDING BACKEND FOR COMMIT 9f2b438")
print("=" * 60)

stdout = run_command("""
cd /home/ubuntu/summit
git fetch origin
git reset --hard 9f2b438
git log -1 --oneline

echo ""
echo "Building backend..."
cd server
npm run build

echo ""
echo "Deploying to /var/www/summit..."
sudo cp -r dist/* /var/www/summit/dist/

echo ""
echo "Restarting PM2..."
pm2 restart summit-backend
sleep 3

echo ""
echo "Testing backend..."
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: ${TOKEN:0:50}..."
echo ""
echo "Chats:"
curl -s http://localhost:4000/api/chats \
  -H "Authorization: Bearer $TOKEN" | head -500

echo ""
echo ""
echo "Contacts:"
curl -s http://localhost:4000/api/chat-requests/contacts \
  -H "Authorization: Bearer $TOKEN" | head -500
""", timeout=180)

print(stdout)
print("\n" + "=" * 60)
print("DONE - Backend rebuilt and tested")
print("=" * 60)
