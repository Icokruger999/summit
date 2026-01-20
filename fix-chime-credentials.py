#!/usr/bin/env python3
"""
Check and fix AWS credentials for Chime SDK
"""
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

print("🔍 CHECKING AWS CREDENTIALS FOR CHIME")
print("=" * 60)

print("\n1. Checking current AWS configuration...")
stdout, stderr = run_command("cat /var/www/summit/.env | grep -i AWS")
print(stdout if stdout else "No AWS credentials found")

print("\n2. Checking if EC2 instance has IAM role...")
stdout, stderr = run_command("curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/")
print(f"IAM Role: {stdout if stdout else 'No IAM role attached'}")

print("\n3. Testing AWS credentials...")
stdout, stderr = run_command("aws sts get-caller-identity 2>&1")
print(stdout)
if "Unable to locate credentials" in stdout or stderr:
    print("❌ No AWS credentials configured")
else:
    print("✅ AWS credentials found")

print("\n4. Checking Chime SDK permissions...")
stdout, stderr = run_command("aws chime-sdk-meetings list-meetings --region us-east-1 2>&1 | head -10")
print(stdout)
if "AccessDenied" in stdout or "credentials" in stdout.lower():
    print("❌ No Chime SDK permissions")
elif "error" in stdout.lower():
    print("⚠️ Chime SDK error:", stdout)
else:
    print("✅ Chime SDK access working")

print("\n" + "=" * 60)
print("\nDIAGNOSIS:")
print("The backend needs AWS credentials to create Chime meetings.")
print("\nOPTIONS:")
print("1. Attach IAM role to EC2 instance (recommended)")
print("2. Add AWS credentials to .env file")
print("3. Use AWS credentials file (~/.aws/credentials)")
