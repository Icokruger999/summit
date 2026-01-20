#!/usr/bin/env python3
"""
Add Chime SDK permissions to EC2 IAM role
"""
import boto3
import json

iam = boto3.client('iam')
ROLE_NAME = 'EC2-SSM-Role'

print("🔧 ADDING CHIME SDK PERMISSIONS")
print("=" * 60)

# Chime SDK policy
chime_policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "chime:CreateMeeting",
                "chime:DeleteMeeting",
                "chime:GetMeeting",
                "chime:ListMeetings",
                "chime:BatchCreateAttendee",
                "chime:CreateAttendee",
                "chime:DeleteAttendee",
                "chime:GetAttendee",
                "chime:ListAttendees"
            ],
            "Resource": "*"
        }
    ]
}

try:
    print("\n1. Checking current role policies...")
    response = iam.list_attached_role_policies(RoleName=ROLE_NAME)
    print(f"   Current policies: {len(response['AttachedPolicies'])}")
    for policy in response['AttachedPolicies']:
        print(f"   - {policy['PolicyName']}")
    
    print("\n2. Creating Chime SDK policy...")
    policy_name = 'ChimeSDKMeetingsPolicy'
    
    try:
        # Try to create the policy
        policy_response = iam.create_policy(
            PolicyName=policy_name,
            PolicyDocument=json.dumps(chime_policy),
            Description='Allows EC2 instance to create and manage Chime SDK meetings'
        )
        policy_arn = policy_response['Policy']['Arn']
        print(f"   ✅ Created policy: {policy_arn}")
    except iam.exceptions.EntityAlreadyExistsException:
        # Policy already exists, get its ARN
        account_id = boto3.client('sts').get_caller_identity()['Account']
        policy_arn = f"arn:aws:iam::{account_id}:policy/{policy_name}"
        print(f"   ℹ️  Policy already exists: {policy_arn}")
    
    print("\n3. Attaching policy to role...")
    iam.attach_role_policy(
        RoleName=ROLE_NAME,
        PolicyArn=policy_arn
    )
    print(f"   ✅ Attached policy to {ROLE_NAME}")
    
    print("\n4. Verifying attachment...")
    response = iam.list_attached_role_policies(RoleName=ROLE_NAME)
    chime_attached = any(p['PolicyName'] == policy_name for p in response['AttachedPolicies'])
    
    if chime_attached:
        print("   ✅ Chime SDK policy successfully attached!")
    else:
        print("   ❌ Policy attachment verification failed")
    
    print("\n" + "=" * 60)
    print("✅ CHIME SDK PERMISSIONS ADDED")
    print("\nNext steps:")
    print("1. Wait 30 seconds for IAM changes to propagate")
    print("2. Restart backend: python summit/start-backend.py")
    print("3. Test Chime call again")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\nManual steps:")
    print("1. Go to AWS IAM Console")
    print("2. Find role: EC2-SSM-Role")
    print("3. Attach policy: ChimeSDKMeetingsPolicy")
    print("4. Or create inline policy with Chime permissions")
