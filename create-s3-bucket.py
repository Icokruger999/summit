#!/usr/bin/env python3
"""
Create and configure S3 bucket for Summit chat image uploads
"""

import boto3
import json
import sys

# Configuration
BUCKET_NAME = "summit-chat-uploads"
REGION = "eu-west-1"  # Same as EC2 instance

def create_bucket():
    """Create S3 bucket"""
    print(f"🪣 Creating S3 bucket: {BUCKET_NAME}")
    print(f"📍 Region: {REGION}")
    
    s3_client = boto3.client('s3', region_name=REGION)
    
    try:
        # Create bucket with location constraint for non-us-east-1 regions
        if REGION == 'us-east-1':
            s3_client.create_bucket(Bucket=BUCKET_NAME)
        else:
            s3_client.create_bucket(
                Bucket=BUCKET_NAME,
                CreateBucketConfiguration={'LocationConstraint': REGION}
            )
        print(f"✅ Bucket created successfully")
        return True
    except s3_client.exceptions.BucketAlreadyOwnedByYou:
        print(f"✅ Bucket already exists and is owned by you")
        return True
    except s3_client.exceptions.BucketAlreadyExists:
        print(f"❌ Bucket name already taken by another AWS account")
        return False
    except Exception as e:
        print(f"❌ Error creating bucket: {e}")
        return False

def configure_public_access():
    """Disable block public access settings"""
    print(f"\n🔓 Configuring public access settings...")
    
    s3_client = boto3.client('s3', region_name=REGION)
    
    try:
        s3_client.put_public_access_block(
            Bucket=BUCKET_NAME,
            PublicAccessBlockConfiguration={
                'BlockPublicAcls': False,
                'IgnorePublicAcls': False,
                'BlockPublicPolicy': False,
                'RestrictPublicBuckets': False
            }
        )
        print(f"✅ Public access configured")
        return True
    except Exception as e:
        print(f"❌ Error configuring public access: {e}")
        return False

def set_bucket_policy():
    """Set bucket policy to allow public read access"""
    print(f"\n📜 Setting bucket policy...")
    
    s3_client = boto3.client('s3', region_name=REGION)
    
    bucket_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{BUCKET_NAME}/*"
            }
        ]
    }
    
    try:
        s3_client.put_bucket_policy(
            Bucket=BUCKET_NAME,
            Policy=json.dumps(bucket_policy)
        )
        print(f"✅ Bucket policy set")
        return True
    except Exception as e:
        print(f"❌ Error setting bucket policy: {e}")
        return False

def configure_cors():
    """Configure CORS for the bucket"""
    print(f"\n🌐 Configuring CORS...")
    
    s3_client = boto3.client('s3', region_name=REGION)
    
    cors_configuration = {
        'CORSRules': [
            {
                'AllowedHeaders': ['*'],
                'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE'],
                'AllowedOrigins': ['*'],
                'ExposeHeaders': ['ETag']
            }
        ]
    }
    
    try:
        s3_client.put_bucket_cors(
            Bucket=BUCKET_NAME,
            CORSConfiguration=cors_configuration
        )
        print(f"✅ CORS configured")
        return True
    except Exception as e:
        print(f"❌ Error configuring CORS: {e}")
        return False

def create_iam_user():
    """Create IAM user for S3 access"""
    print(f"\n👤 Creating IAM user: summit-s3-uploader...")
    
    iam_client = boto3.client('iam')
    
    try:
        # Create user
        try:
            iam_client.create_user(UserName='summit-s3-uploader')
            print(f"✅ IAM user created")
        except iam_client.exceptions.EntityAlreadyExistsException:
            print(f"✅ IAM user already exists")
        
        # Create custom policy for this bucket only
        policy_document = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:PutObject",
                        "s3:GetObject",
                        "s3:DeleteObject"
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
        
        policy_name = "SummitS3UploadPolicy"
        
        # Create policy
        try:
            policy_response = iam_client.create_policy(
                PolicyName=policy_name,
                PolicyDocument=json.dumps(policy_document),
                Description="Policy for Summit chat image uploads to S3"
            )
            policy_arn = policy_response['Policy']['Arn']
            print(f"✅ IAM policy created: {policy_arn}")
        except iam_client.exceptions.EntityAlreadyExistsException:
            # Get existing policy ARN
            account_id = boto3.client('sts').get_caller_identity()['Account']
            policy_arn = f"arn:aws:iam::{account_id}:policy/{policy_name}"
            print(f"✅ IAM policy already exists: {policy_arn}")
        
        # Attach policy to user
        try:
            iam_client.attach_user_policy(
                UserName='summit-s3-uploader',
                PolicyArn=policy_arn
            )
            print(f"✅ Policy attached to user")
        except Exception as e:
            print(f"⚠️  Policy may already be attached: {e}")
        
        return True
    except Exception as e:
        print(f"❌ Error creating IAM user: {e}")
        return False

def create_access_key():
    """Create access key for IAM user"""
    print(f"\n🔑 Creating access key...")
    
    iam_client = boto3.client('iam')
    
    try:
        # List existing keys
        existing_keys = iam_client.list_access_keys(UserName='summit-s3-uploader')
        
        if len(existing_keys['AccessKeyMetadata']) >= 2:
            print(f"⚠️  User already has 2 access keys (AWS limit)")
            print(f"   Please delete an old key first or use existing credentials")
            return False
        
        # Create new access key
        response = iam_client.create_access_key(UserName='summit-s3-uploader')
        access_key = response['AccessKey']
        
        print(f"\n{'='*60}")
        print(f"✅ Access Key Created Successfully!")
        print(f"{'='*60}")
        print(f"\n⚠️  IMPORTANT: Save these credentials now!")
        print(f"   You won't be able to see the secret key again.\n")
        print(f"AWS_ACCESS_KEY_ID={access_key['AccessKeyId']}")
        print(f"AWS_SECRET_ACCESS_KEY={access_key['SecretAccessKey']}")
        print(f"\n{'='*60}")
        
        # Save to file
        with open('s3-credentials.txt', 'w') as f:
            f.write(f"# Summit S3 Credentials\n")
            f.write(f"# Created: {access_key['CreateDate']}\n\n")
            f.write(f"AWS_REGION={REGION}\n")
            f.write(f"AWS_ACCESS_KEY_ID={access_key['AccessKeyId']}\n")
            f.write(f"AWS_SECRET_ACCESS_KEY={access_key['SecretAccessKey']}\n")
            f.write(f"S3_BUCKET_NAME={BUCKET_NAME}\n")
        
        print(f"\n💾 Credentials saved to: s3-credentials.txt")
        print(f"   Add these to your .env file on EC2\n")
        
        return True
    except Exception as e:
        print(f"❌ Error creating access key: {e}")
        return False

def test_bucket():
    """Test bucket configuration"""
    print(f"\n🧪 Testing bucket configuration...")
    
    s3_client = boto3.client('s3', region_name=REGION)
    
    try:
        # Test upload
        test_key = "test-image.txt"
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=test_key,
            Body=b"Test upload",
            ContentType="text/plain",
            ACL="public-read"
        )
        
        # Test public access
        test_url = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{test_key}"
        print(f"✅ Test upload successful")
        print(f"   Test URL: {test_url}")
        
        # Clean up test file
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=test_key)
        print(f"✅ Test file cleaned up")
        
        return True
    except Exception as e:
        print(f"❌ Error testing bucket: {e}")
        return False

def main():
    print("🚀 Summit S3 Bucket Setup")
    print("="*60)
    
    # Step 1: Create bucket
    if not create_bucket():
        print("\n❌ Failed to create bucket. Exiting.")
        sys.exit(1)
    
    # Step 2: Configure public access
    if not configure_public_access():
        print("\n⚠️  Warning: Public access configuration failed")
    
    # Step 3: Set bucket policy
    if not set_bucket_policy():
        print("\n⚠️  Warning: Bucket policy configuration failed")
    
    # Step 4: Configure CORS
    if not configure_cors():
        print("\n⚠️  Warning: CORS configuration failed")
    
    # Step 5: Create IAM user
    if not create_iam_user():
        print("\n⚠️  Warning: IAM user creation failed")
    
    # Step 6: Create access key
    if not create_access_key():
        print("\n⚠️  Warning: Access key creation failed")
        print("   You may need to create it manually or use existing credentials")
    
    # Step 7: Test bucket
    if not test_bucket():
        print("\n⚠️  Warning: Bucket test failed")
    
    print("\n" + "="*60)
    print("✅ S3 Bucket Setup Complete!")
    print("="*60)
    print(f"\n📋 Next steps:")
    print(f"1. Add credentials from s3-credentials.txt to EC2 .env file")
    print(f"2. Run: python deploy-image-paste-backend.py")
    print(f"3. Deploy frontend changes")
    print(f"4. Test image upload in the app")
    print(f"\n🪣 Bucket URL: https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
