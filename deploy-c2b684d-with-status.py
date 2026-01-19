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
print("DEPLOYING c2b684d - WITH STATUS DROPDOWN")
print("=" * 60)

# Pull and reset
print("\n1. Pulling commit c2b684d...")
stdout, stderr = run_command("""
cd /home/ubuntu/summit
git fetch origin
git reset --hard c2b684d
git log -1 --oneline
""")
print(stdout)

# Build backend
print("\n2. Building backend...")
stdout, stderr = run_command("""
cd /home/ubuntu/summit/server
npm run build 2>&1 | tail -20
""", timeout=180)
print(stdout[:500])

# Deploy
print("\n3. Deploying...")
stdout, stderr = run_command("""
sudo cp -r /home/ubuntu/summit/server/dist/* /var/www/summit/dist/
sudo chown -R root:root /var/www/summit/dist/
pm2 restart summit-backend
sleep 3
pm2 status
""")
print(stdout)

# Test
print("\n4. Testing...")
stdout, stderr = run_command("""
curl -s -o /dev/null -w 'Status: %{http_code}\\n' http://localhost:4000/api/chats
""")
print(stdout)

print("\n" + "=" * 60)
print("DONE - Frontend build will start automatically")
print("=" * 60)
