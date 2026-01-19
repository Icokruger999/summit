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
print("DEPLOYING 0e781a0 - STATUS DROPDOWN IN CHAT")
print("=" * 60)

print("\n1. Pulling commit 0e781a0...")
stdout, stderr = run_command("""
cd /home/ubuntu/summit
git fetch origin
git reset --hard 0e781a0
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
pm2 status
""")
print(stdout[:500])

print("\n4. Starting Amplify build...")
response = amplify.start_job(
    appId='d1mhd5fnnjyucj',
    branchName='main',
    jobType='RELEASE'
)
print(f"Build job {response['jobSummary']['jobId']} started")

print("\n" + "=" * 60)
print("DEPLOYMENT COMPLETE")
print("Wait 3-5 minutes for Amplify, then hard refresh browser")
print("=" * 60)
