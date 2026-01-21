#!/usr/bin/env python3
"""
Add S3 environment variables to EC2 .env file
"""

import boto3
import sys

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"

def add_env_vars(access_key_id, secret_access_key):
    """Add S3 env vars to .env file"""
    
    ssm = boto3.client("ssm", region_name=REGION)
    
    # Create the env vars to add
    env_vars = f"""
# S3 Configuration for Image Uploads
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID={access_key_id}
AWS_SECRET_ACCESS_KEY={secret_access_key}
S3_BUCKET_NAME=summit-chat-uploads
"""
    
    commands = [
        "cd /var/www/summit",
        # Check if S3 vars already exist
        'if grep -q "S3_BUCKET_NAME" .env; then echo "S3 vars already in .env"; else echo "Adding S3 vars..."; fi',
        # Remove old S3 vars if they exist
        'sed -i "/^AWS_REGION=/d" .env 2>/dev/null || true',
        'sed -i "/^AWS_ACCESS_KEY_ID=/d" .env 2>/dev/null || true',
        'sed -i "/^AWS_SECRET_ACCESS_KEY=/d" .env 2>/dev/null || true',
        'sed -i "/^S3_BUCKET_NAME=/d" .env 2>/dev/null || true',
        'sed -i "/# S3 Configuration/d" .env 2>/dev/null || true',
        # Add new S3 vars
        f'echo "{env_vars}" >> .env',
        # Restart PM2
        "export HOME=/home/ubuntu",
        "pm2 restart summit-backend",
        # Show confirmation
        'echo "✅ S3 environment variables added"',
        'echo "Verifying..."',
        'grep "S3_BUCKET_NAME" .env'
    ]
    
    print("🔧 Adding S3 environment variables to EC2...")
    print(f"📍 Instance: {INSTANCE_ID}")
    print(f"🪣 Bucket: summit-chat-uploads")
    
    response = ssm.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": commands},
        Comment="Add S3 environment variables"
    )
    
    command_id = response["Command"]["CommandId"]
    print(f"⏳ Command ID: {command_id}")
    print("⏳ Waiting for completion...")
    
    import time
    time.sleep(5)
    
    try:
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        if output["StandardOutputContent"]:
            print(f"\n✅ Output:\n{output['StandardOutputContent']}")
        if output["StandardErrorContent"]:
            print(f"\n⚠️  Errors:\n{output['StandardErrorContent']}")
        
        if output["Status"] == "Success":
            print("\n" + "="*60)
            print("✅ S3 Environment Variables Added Successfully!")
            print("="*60)
            print("\n📋 Backend is now ready for image uploads!")
            print("🔄 PM2 has been restarted with new environment variables")
            return True
        else:
            print(f"\n❌ Command failed with status: {output['Status']}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("🚀 S3 Environment Variables Setup")
    print("="*60)
    
    if len(sys.argv) != 3:
        print("\n❌ Usage: python add-s3-env-vars.py <ACCESS_KEY_ID> <SECRET_ACCESS_KEY>")
        print("\nExample:")
        print("  python add-s3-env-vars.py AKIA... wJalrXUtnFEMI...")
        print("\n💡 Get these from AWS IAM Console:")
        print("   https://console.aws.amazon.com/iam/home#/users/summit-s3-uploader")
        sys.exit(1)
    
    access_key_id = sys.argv[1]
    secret_access_key = sys.argv[2]
    
    if not access_key_id.startswith("AKIA"):
        print("⚠️  Warning: Access Key ID should start with 'AKIA'")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(1)
    
    if add_env_vars(access_key_id, secret_access_key):
        print("\n✅ Setup complete! Backend is ready for image uploads.")
        print("\n📋 Next step: Deploy frontend changes")
    else:
        print("\n❌ Setup failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
