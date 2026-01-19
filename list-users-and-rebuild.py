import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
amplify = boto3.client('amplify', region_name='eu-west-1')
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
print("LISTING USERS AND REBUILDING BACKEND")
print("=" * 60)

# List all users
print("\n1. All users in database:")
stdout = run_command("""
sudo -u postgres psql -d summit -c "SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 10;"
""")
print(stdout)

# Rebuild backend from source at commit 51c78d5 (Jan 18 16:12 - TURN servers)
print("\n2. Rebuilding backend from commit 51c78d5...")
stdout = run_command("""
cd /home/ubuntu/summit
git fetch origin
git reset --hard 51c78d5
cd server
npm run build
sudo cp -r dist/* /var/www/summit/dist/
pm2 restart summit-backend
sleep 3
echo "Backend rebuilt and restarted"
""", timeout=180)
print(stdout[:500])

# Test backend
print("\n3. Testing backend...")
stdout = run_command("""
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: ${TOKEN:0:50}..."
echo ""
echo "Chats:"
curl -s http://localhost:4000/api/chats \
  -H "Authorization: Bearer $TOKEN"
""")
print(stdout)

# Deploy frontend
print("\n4. Deploying frontend commit 51c78d5...")
response = amplify.start_job(
    appId='d1mhd5fnnjyucj',
    branchName='main',
    jobType='RELEASE'
)
print(f"Amplify build {response['jobSummary']['jobId']} started")

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
