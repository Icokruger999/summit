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
    
    return output['StandardOutputContent'], output['StandardErrorContent']

print("=" * 60)
print("DEPLOYING COMMIT bd17040 - FULL RESTORE")
print("=" * 60)

# Pull and reset to bd17040
print("\n1. Pulling commit bd17040...")
stdout, stderr = run_command("""
cd /home/ubuntu/summit
git fetch origin
git reset --hard bd17040
git clean -fd
git log -1 --oneline
""")
print(stdout)

# Build backend
print("\n2. Building backend...")
stdout, stderr = run_command("""
cd /home/ubuntu/summit/server
npm run build 2>&1 | tail -20
""", timeout=180)
print(stdout)
if stderr:
    print("STDERR:", stderr[:500])

# Copy to production
print("\n3. Deploying to /var/www/summit...")
stdout, stderr = run_command("""
sudo cp -r /home/ubuntu/summit/server/dist/* /var/www/summit/dist/
sudo chown -R root:root /var/www/summit/dist/
ls -la /var/www/summit/dist/ | head -10
""")
print(stdout)

# Restart PM2
print("\n4. Restarting PM2...")
stdout, stderr = run_command("pm2 restart summit-backend && sleep 3 && pm2 status")
print(stdout)

# Test endpoints
print("\n5. Testing endpoints...")
stdout, stderr = run_command("""
curl -s -o /dev/null -w 'users/search: %{http_code}\\n' http://localhost:4000/api/users/search?email=test@test.com
curl -s -o /dev/null -w 'chat-requests/contacts: %{http_code}\\n' http://localhost:4000/api/chat-requests/contacts
curl -s -o /dev/null -w 'presence: %{http_code}\\n' http://localhost:4000/api/presence/test-id
curl -s -o /dev/null -w 'chats: %{http_code}\\n' http://localhost:4000/api/chats
""")
print(stdout)

# Check for errors
print("\n6. Recent errors:")
stdout, stderr = run_command("pm2 logs summit-backend --err --lines 10 --nostream")
print(stdout)

print("\n" + "=" * 60)
print("DEPLOYMENT COMPLETE - bd17040")
print("=" * 60)
