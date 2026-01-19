#!/usr/bin/env python3
"""
Upload and run restore script via SSM
"""
import boto3
import time

ssm = boto3.client('ssm', region_name='eu-west-1')
s3 = boto3.client('s3', region_name='eu-west-1')
INSTANCE_ID = 'i-0fba58db502cc8d39'

print("📤 Uploading restore script to S3...")

# Read the script
with open('restore.sh', 'r') as f:
    script_content = f.read()

# Upload to S3
try:
    s3.put_object(
        Bucket='summit-deployment',
        Key='restore.sh',
        Body=script_content,
        ContentType='text/plain'
    )
    print("✅ Script uploaded to S3")
except Exception as e:
    print(f"❌ Error uploading to S3: {e}")
    # Try to continue anyway
    pass

# Run the script via SSM
print("📤 Running restore script via SSM...")

try:
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName='AWS-RunShellScript',
        Parameters={
            'command': [
                'bash /var/www/summit/restore.sh'
            ]
        },
        TimeoutSeconds=600
    )
    
    command_id = response['Command']['CommandId']
    print(f"✅ Command sent: {command_id}")
    print("⏳ Waiting for execution...\n")
    
    # Wait for completion
    time.sleep(15)
    
    # Get output
    output = ssm.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    
    print("📋 Output:")
    print(output.get('StandardOutputContent', 'No output'))
    
    if output.get('StandardErrorContent'):
        print("\n⚠️  Errors:")
        print(output['StandardErrorContent'])
    
    print(f"\n✅ Status: {output.get('Status', 'Unknown')}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
