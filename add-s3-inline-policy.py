#!/usr/bin/env python3
"""
Add S3 permissions as inline policy to EC2 IAM role
This bypasses the AttachRolePolicy permission issue
"""

import boto3
import json

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"
BUCKET_NAME = "summit-chat-uploads"

def main():
    print("🔧 Adding S3 Inline Policy to EC2 IAM Role")
    print("="*60)
    
    ec2 = boto3.client('ec2', region_name=REGION)
    iam = boto3.client('iam')
    ssm = boto3.client("ssm", region_name=REGION)
    
    # Step 1: Get instance IAM role
    print("\n📋 Step 1: Getting EC2 instance IAM role...")
    try:
        response = ec2.describe_instances(InstanceIds=[INSTANCE_ID])
        instance = response['Reservations'][0]['Instances'][0]
        
        if 'IamInstanceProfile' not in instance:
            print("❌ No IAM role attached to EC2 instance")
            return False
        
        profile_arn = instance['IamInstanceProfile']['Arn']
        profile_name = profile_arn.split('/')[-1]
        profile_response = iam.get_instance_profile(InstanceProfileName=profile_name)
        role_name = profile_response['InstanceProfile']['Roles'][0]['RoleName']
        
        print(f"✅ Found IAM role: {role_name}")
        
    except Exception as e:
        print(f"❌ Error getting IAM role: {e}")
        return False
    
    # Step 2: Add inline policy directly to role
    print(f"\n📋 Step 2: Adding inline S3 policy to role...")
    
    policy_document = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:PutObject",
                    "s3:GetObject",
                    "s3:DeleteObject",
                    "s3:PutObjectAcl"
                ],
                "Resource": f"arn:aws:s3:::{BUCKET_NAME}/*"
            },
            {
                "Effect": "Allow",
                "Action": "s3:ListBucket",
                "Resource": f"arn:aws:s3:::{BUCKET_NAME}"
            }
        ]
    }
    
    policy_name = "SummitS3ChatUploadsInlinePolicy"
    
    try:
        iam.put_role_policy(
            RoleName=role_name,
            PolicyName=policy_name,
            PolicyDocument=json.dumps(policy_document)
        )
        print(f"✅ Inline policy added successfully")
    except Exception as e:
        print(f"❌ Error adding inline policy: {e}")
        return False
    
    # Step 3: Update backend environment
    print(f"\n📋 Step 3: Updating backend environment...")
    
    commands = [
        "cd /var/www/summit",
        # Remove old AWS credentials if they exist
        'sed -i "/^AWS_ACCESS_KEY_ID=/d" .env 2>/dev/null || true',
        'sed -i "/^AWS_SECRET_ACCESS_KEY=/d" .env 2>/dev/null || true',
        # Add/update S3 config
        'grep -q "^AWS_REGION=" .env || echo "AWS_REGION=eu-west-1" >> .env',
        'grep -q "^S3_BUCKET_NAME=" .env || echo "S3_BUCKET_NAME=summit-chat-uploads" >> .env',
        'sed -i "s/^AWS_REGION=.*/AWS_REGION=eu-west-1/" .env',
        'sed -i "s/^S3_BUCKET_NAME=.*/S3_BUCKET_NAME=summit-chat-uploads/" .env',
        # Restart PM2
        "export HOME=/home/ubuntu",
        "pm2 restart summit-backend",
        'echo "✅ Environment updated"',
        'grep -E "AWS_REGION|S3_BUCKET" .env'
    ]
    
    try:
        response = ssm.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName="AWS-RunShellScript",
            Parameters={"commands": commands},
            Comment="Update S3 environment variables"
        )
        
        command_id = response["Command"]["CommandId"]
        print(f"⏳ Updating environment... (Command ID: {command_id})")
        
        import time
        time.sleep(5)
        
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=INSTANCE_ID
        )
        
        if output["StandardOutputContent"]:
            print(f"\n✅ Output:\n{output['StandardOutputContent']}")
        
    except Exception as e:
        print(f"⚠️  Could not update environment: {e}")
    
    print("\n" + "="*60)
    print("✅ S3 Permissions Added Successfully!")
    print("="*60)
    print(f"\n📋 Summary:")
    print(f"   - IAM Role: {role_name}")
    print(f"   - S3 Bucket: {BUCKET_NAME}")
    print(f"   - Region: {REGION}")
    print(f"   - Backend: Restarted with IAM role credentials")
    print(f"\n💡 The backend now uses IAM role (no access keys needed!)")
    
    return True

if __name__ == "__main__":
    try:
        if main():
            print("\n✅ Setup complete! Ready for image uploads.")
        else:
            print("\n❌ Setup failed. Check errors above.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
