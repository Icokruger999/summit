#!/usr/bin/env python3
import boto3
import time
import json

ssm = boto3.client('ssm', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

def run_command(command):
    try:
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
        
        return output.get('StandardOutputContent', '').strip()
    except Exception as e:
        return f"Error: {str(e)}"

print("Getting auth token...")
result = run_command('curl -s "https://summit.api.codingeverest.com/api/auth/login" -H "Content-Type: application/json" -d \'{"email":"test@test.com","password":"test123"}\'')

try:
    login_data = json.loads(result)
    token = login_data.get('token')
    if token:
        print("Got token, testing Chime...")
        chime_result = run_command(f'curl -s "https://summit.api.codingeverest.com/api/chime/meeting" -H "Content-Type: application/json" -H "Authorization: Bearer {token}" -d \'{{"chatId":"test-chat"}}\'')
        print("Chime result:", chime_result)
    else:
        print("No token received")
except Exception as e:
    print("Error parsing login:", e)
    print("Raw result:", result)