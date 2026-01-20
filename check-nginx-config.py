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

print("Checking available endpoints...")
stdout, stderr = run_command("grep -n 'app.get.*health' /var/www/summit/index.js")
print(stdout if stdout else "No health endpoint found")

print("\nChecking what endpoints exist...")
stdout, stderr = run_command("grep -n \"app.get\\|app.post\" /var/www/summit/index.js | head -20")
print(stdout)
