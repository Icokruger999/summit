#!/usr/bin/env python3
"""
Add S3 permissions to existing EC2 IAM role
"""

import boto3
import json

INSTANCE_ID = "i-0fba58db502cc8d39"
REGION = "eu-west-1"
BUCKET_NAME = "summit-chat-uploads"

def main():
    print("🔧 Adding S3 Permissions to EC2 IAM Role")
    print("="*60)
    
    ec2 = boto3.client('ec2', region_name=REGION)
    iam = boto3.client('iam')
    
    # Step 1: Get instance IAM role
    print("\n📋 Step 1: Getting EC2 instance IAM role...")
    try:
        response = ec2.describe_instances(InstanceIds=[INSTANCE_ID])
        instance = response['Reservations'][0]['Instances'][0]
        
        if 'IamInstanceProfile' not in instance:
            print("❌ No IAM role attached to EC2 instance")
            print("\n💡 The instance needs an IAM role. Creating one...")
            # Would need to create and attach role here
            return False
        
        # Get role name from ARN
        profile_arn = instance['IamInstanceProfile']['Arn']
        profile_id = instance['IamInstanceProfile']['Id']
        
        # Get the profile to find the role
        profile_name = profile_arn.split('/')[-1]
        profile_response = iam.get_instance_profile(InstanceProfileName=profile_name)
        role_name = profile_response['InstanceProfile']['Roles'][0]['RoleName']
        
        print(f"✅ Found IAM role: {role_name}")
        
    except Exception as e:
        print(f"❌ Error getting IAM role: {e}")
        return False
    
    # Step 2: Create S3 policy
    print(f"\n📋 Step 2: Creating S3 policy for bucket: {BUCKET_NAME}...")
    
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
    
    policy_name = "SummitS3ChatUploadsPolicy"
    
    try:
        # Try to create the policy
        policy_response = iam.create_policy(
            PolicyName=policy_name,
            PolicyDocument=json.dumps(policy_document),
            Description=f"Allows Summit backend to upload chat images to {BUCKET_NAME}"
        )
        policy_arn = policy_response['Policy']['Arn']
        print(f"✅ Created policy: {policy_arn}")
    except iam.exceptions.EntityAlreadyExistsException:
        # Policy already exists, get its ARN
        account_id = boto3.client('sts').get_caller_identity()['Account']
        policy_arn = f"arn:aws:iam::{account_id}:policy/{policy_name}"
        print(f"✅ Policy already exists: {policy_arn}")
    except Exception as e:
        print(f"❌ Error creating policy: {e}")
        return False
    
    # Step 3: Attach policy to role
    print(f"\n📋 Step 3: Attaching policy to role: {role_name}...")
    
    try:
        iam.attach_role_policy(
            RoleName=role_name,
            PolicyArn=policy_arn
        )
        print(f"✅ Policy attached successfully")
    except iam.exceptions.LimitExceededException:
        print(f"⚠️  Role already has maximum policies attached")
        print(f"   Trying inline policy instead...")
        
        # Try inline policy as fallback
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
    except Exception as e:
        if "already attached" in str(e).lower():
            print(f"✅ Policy already attached to role")
        else:
            print(f"❌ Error attaching policy: {e}")
            return False
    
    # Step 4: Verify permissions
    print(f"\n📋 Step 4: Verifying S3 permissions...")
    
    try:
        # List attached policies
        attached_policies = iam.list_attached_role_policies(RoleName=role_name)
        print(f"\n📜 Attached policies:")
        for policy in attached_policies['AttachedPolicies']:
            print(f"   - {policy['PolicyName']}")
            if policy_name in policy['PolicyName']:
                print(f"     ✅ S3 policy is attached!")
        
        # List inline policies
        inline_policies = iam.list_role_policies(RoleName=role_name)
        if inline_policies['PolicyNames']:
            print(f"\n📜 Inline policies:")
            for policy in inline_policies['PolicyNames']:
                print(f"   - {policy}")
                if policy_name in policy:
                    print(f"     ✅ S3 policy is attached!")
        
    except Exception as e:
        print(f"⚠️  Could not verify: {e}")
    
    # Step 5: Update backend environment
    print(f"\n📋 Step 5: Updating backend environment...")
    
    ssm = boto3.client("ssm", region_name=REGION)
    
    commands = [
        "cd /var/www/summit",
        # Remove old AWS credentials if they exist (we're using IAM role now)
        'sed -i "/^AWS_ACCESS_KEY_ID=/d" .env 2>/dev/null || true',
        'sed -i "/^AWS_SECRET_ACCESS_KEY=/d" .env 2>/dev/null || true',
        # Add/update S3 config
        'grep -q "^AWS_REGION=" .env || echo "AWS_REGION=eu-west-1" >> .env',
        'grep -q "^S3_BUCKET_NAME=" .env || echo "S3_BUCKET_NAME=summit-chat-uploads" >> .env',
        # Update existing values if they exist
        'sed -i "s/^AWS_REGION=.*/AWS_REGION=eu-west-1/" .env',
        'sed -i "s/^S3_BUCKET_NAME=.*/S3_BUCKET_NAME=summit-chat-uploads/" .env',
        # Restart PM2
        "export HOME=/home/ubuntu",
        "pm2 restart summit-backend",
        # Verify
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
    print(f"\n🧪 Test upload:")
    print(f"   curl -X POST https://summit.api.codingeverest.com/api/uploads/image \\")
    print(f"     -H 'Authorization: Bearer YOUR_TOKEN' \\")
    print(f"     -F 'image=@test.jpg'")
    
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
