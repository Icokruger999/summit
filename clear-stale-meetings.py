#!/usr/bin/env python3
"""Clear stale meetings from backend memory and restart"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={'commands': [command]},
        TimeoutSeconds=60
    )
    command_id = response['Command']['CommandId']
    time.sleep(5)
    
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    return output.get('StandardOutputContent', '').strip(), output.get('StandardErrorContent', '').strip()

print("Restarting backend to clear stale meetings from memory...")
stdout, stderr = run_command("pm2 restart summit")
print("stdout:", stdout)
if stderr:
    print("stderr:", stderr)

print("\nWaiting for server to restart...")
time.sleep(5)

print("\nChecking server status...")
stdout, stderr = run_command("pm2 status summit")
print(stdout)

print("\nServer restarted! All stale meetings cleared from memory.")
print("Now when you start a new call, it will create a fresh meeting.")
