#!/usr/bin/env python3
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=30
    )
    command_id = response['Command']['CommandId']
    time.sleep(3)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip(), output.get('StandardErrorContent', '').strip()

print("Fixing region quotes in index.js...")
stdout, stderr = run_command("cd /var/www/summit && sed -i \"s/region: us-east-1/region: 'us-east-1'/g\" index.js")
print("Fixed!")

print("\nRestarting PM2...")
stdout, stderr = run_command("cd /var/www/summit && pm2 restart summit")
print(stdout)

print("\nWaiting 5 seconds for server to start...")
time.sleep(5)

print("\nChecking if server is listening on port 4000...")
stdout, stderr = run_command("netstat -tlnp | grep :4000")
print(stdout if stdout else "Not listening yet")
