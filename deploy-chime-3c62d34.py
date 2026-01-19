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
    
    return output['StandardOutputContent'], output['StandardErrorContent']

print("=" * 60)
print("DEPLOYING 3c62d34 - CHIME SDK BACKEND")
print("=" * 60)

print("\n1. Pulling...")
stdout, stderr = run_command("""
cd /home/ubuntu/summit
git fetch origin
git reset --hard 3c62d34
git log -1 --oneline
""")
print(stdout)

print("\n2. Building backend...")
stdout, stderr = run_command("""
cd /home/ubuntu/summit/server
npm run build 2>&1 | tail -20
""", timeout=180)
print(stdout[:500])

print("\n3. Deploying...")
stdout, stderr = run_command("""
sudo cp -r /home/ubuntu/summit/server/dist/* /var/www/summit/dist/
pm2 restart summit-backend
sleep 3
curl -s -o /dev/null -w 'Status: %{http_code}' http://localhost:4000/api/chats
""")
print(stdout)

print("\n4. Starting Amplify build...")
response = amplify.start_job(
    appId='d1mhd5fnnjyucj',
    branchName='main',
    jobType='RELEASE'
)
print(f"Build job {response['jobSummary']['jobId']} started")

print("\n" + "=" * 60)
print("DONE - Wait for Amplify build")
print("=" * 60)
