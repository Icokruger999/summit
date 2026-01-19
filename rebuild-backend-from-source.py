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
    
    return output['StandardOutputContent'], output['StandardErrorContent']

print("=" * 60)
print("REBUILDING BACKEND FROM SOURCE")
print("=" * 60)

# Navigate to server directory and build
print("\n1. Building backend from source...")
stdout, stderr = run_command("""
cd /home/ubuntu/summit/server
npm run build
""", timeout=120)
print(stdout)
if stderr:
    print("STDERR:", stderr)

# Copy dist to /var/www/summit
print("\n2. Copying dist to /var/www/summit...")
stdout, stderr = run_command("""
sudo cp -r /home/ubuntu/summit/server/dist/* /var/www/summit/dist/
sudo chown -R root:root /var/www/summit/dist/
ls -la /var/www/summit/dist/ | head -10
""")
print(stdout)

# Restart PM2
print("\n3. Restarting PM2...")
stdout, stderr = run_command("pm2 restart summit-backend")
print(stdout)

# Wait and test
print("\n4. Testing endpoints...")
time.sleep(3)
stdout, stderr = run_command("""
curl -s -o /dev/null -w 'users/search: %{http_code}\\n' http://localhost:4000/api/users/search?email=test@test.com
curl -s -o /dev/null -w 'chat-requests/contacts: %{http_code}\\n' http://localhost:4000/api/chat-requests/contacts
curl -s -o /dev/null -w 'presence: %{http_code}\\n' http://localhost:4000/api/presence/test-id
""")
print(stdout)

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
