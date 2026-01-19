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

print("Deploying 45d3827...")

stdout, stderr = run_command("""
cd /home/ubuntu/summit
git fetch origin
git reset --hard 45d3827
cd server
npm run build
sudo cp -r dist/* /var/www/summit/dist/
pm2 restart summit-backend
sleep 3
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"ico@astutetech.co.za","password":"Stacey@1122"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -s http://localhost:4000/api/chats -H "Authorization: Bearer $TOKEN" | head -200
""", timeout=180)
print(stdout[:1000])

print("\nStarting Amplify build...")
response = amplify.start_job(appId='d1mhd5fnnjyucj', branchName='main', jobType='RELEASE')
print(f"Build {response['jobSummary']['jobId']} started")
