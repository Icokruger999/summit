import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
instance_id = 'i-0fba58db502cc8d39'

def run_command(command, timeout=120):
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
    
    return output['StandardOutputContent'], output['StandardErrorContent']

print("=" * 60)
print("RESTORING BACKEND TO COMMIT 4321fda")
print("=" * 60)

# Pull latest code
print("\n1. Pulling code from GitHub...")
stdout, stderr = run_command("""
cd /home/ubuntu/summit
git fetch origin
git reset --hard 4321fda
git clean -fd
""")
print(stdout)

# Build backend
print("\n2. Building backend...")
stdout, stderr = run_command("""
cd /home/ubuntu/summit/server
npm run build
""", timeout=180)
print(stdout[:500])

# Copy to /var/www/summit
print("\n3. Copying to /var/www/summit...")
stdout, stderr = run_command("""
sudo cp -r /home/ubuntu/summit/server/dist/* /var/www/summit/dist/
sudo chown -R root:root /var/www/summit/dist/
""")
print(stdout)

# Restart PM2
print("\n4. Restarting PM2...")
stdout, stderr = run_command("pm2 restart summit-backend")
print(stdout)

# Test endpoints
print("\n5. Testing endpoints after 3 seconds...")
time.sleep(3)
stdout, stderr = run_command("""
curl -s -o /dev/null -w 'users/search: %{http_code}\\n' http://localhost:4000/api/users/search?email=test@test.com
curl -s -o /dev/null -w 'chat-requests/contacts: %{http_code}\\n' http://localhost:4000/api/chat-requests/contacts
curl -s -o /dev/null -w 'presence: %{http_code}\\n' http://localhost:4000/api/presence/test-id
curl -s -o /dev/null -w 'chats: %{http_code}\\n' http://localhost:4000/api/chats
""")
print(stdout)

print("\n" + "=" * 60)
print("BACKEND RESTORED TO 4321fda")
print("=" * 60)
