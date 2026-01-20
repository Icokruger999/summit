#!/usr/bin/env python3
"""
Check existing Chime policy
"""
import boto3
import json

iam = boto3.client('iam')
sts = boto3.client('sts')

print("🔍 CHECKING EXISTING CHIME POLICY")
print("=" * 60)

try:
    # Get account ID
    account_id = sts.get_caller_identity()['Account']
    
    print("\n1. Checking SummitChimePolicy...")
    policy_arn = f"arn:aws:iam::{account_id}:policy/SummitChimePolicy"
    
    try:
        # Get policy
        policy = iam.get_policy(PolicyArn=policy_arn)
        print(f"   ✅ Policy exists: {policy_arn}")
        print(f"   Created: {policy['Policy']['CreateDate']}")
        print(f"   Updated: {policy['Policy']['UpdateDate']}")
        
        # Get policy version
        version_id = policy['Policy']['DefaultVersionId']
        policy_version = iam.get_policy_version(
            PolicyArn=policy_arn,
            VersionId=version_id
        )
        
        print(f"\n2. Policy document:")
        document = policy_version['PolicyVersion']['Document']
        print(json.dumps(document, indent=2))
        
        # Check if it has the right permissions
        print(f"\n3. Checking permissions...")
        has_create_meeting = False
        has_create_attendee = False
        
        for statement in document.get('Statement', []):
            actions = statement.get('Action', [])
            if isinstance(actions, str):
                actions = [actions]
            
            for action in actions:
                if 'CreateMeeting' in action or 'chime:*' in action:
                    has_create_meeting = True
                if 'CreateAttendee' in action or 'chime:*' in action:
                    has_create_attendee = True
        
        if has_create_meeting and has_create_attendee:
            print("   ✅ Policy has required Chime permissions")
        else:
            print("   ❌ Policy missing some Chime permissions")
            print(f"      CreateMeeting: {has_create_meeting}")
            print(f"      CreateAttendee: {has_create_attendee}")
        
    except iam.exceptions.NoSuchEntityException:
        print(f"   ❌ Policy not found: {policy_arn}")
    
    print("\n4. Checking if policy is attached to role...")
    role_policies = iam.list_attached_role_policies(RoleName='EC2-SSM-Role')
    chime_attached = any(p['PolicyName'] == 'SummitChimePolicy' for p in role_policies['AttachedPolicies'])
    
    if chime_attached:
        print("   ✅ SummitChimePolicy is attached to EC2-SSM-Role")
    else:
        print("   ❌ SummitChimePolicy is NOT attached to EC2-SSM-Role")
    
    print("\n" + "=" * 60)
    print("\nCONCLUSION:")
    if chime_attached and has_create_meeting and has_create_attendee:
        print("✅ Chime permissions are correctly configured!")
        print("\nThe issue might be:")
        print("1. IAM changes need time to propagate (wait 30 seconds)")
        print("2. Backend needs restart to pick up new permissions")
        print("3. There's a different error in the backend code")
    else:
        print("⚠️ Chime permissions need attention")
        
except Exception as e:
    print(f"\n❌ Error: {e}")
