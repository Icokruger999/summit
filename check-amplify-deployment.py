#!/usr/bin/env python3
"""Check Amplify deployment status"""
import boto3
import time
from datetime import datetime

amplify = boto3.client('amplify', region_name='us-east-1')

# Your Amplify app ID
app_id = 'd2yjqvvvvvvvvv'  # Replace with actual app ID if different

try:
    # Get app info
    app = amplify.get_app(appId=app_id)
    print(f"📱 App: {app['app']['name']}")
    print(f"🌐 Default Domain: {app['app']['defaultDomain']}")
    print()
    
    # List branches
    branches = amplify.list_branches(appId=app_id)
    
    for branch in branches['branches']:
        print(f"🌿 Branch: {branch['branchName']}")
        print(f"   Stage: {branch['stage']}")
        
        # Get latest job for this branch
        jobs = amplify.list_jobs(appId=app_id, branchName=branch['branchName'], maxResults=1)
        
        if jobs['jobSummaries']:
            job = jobs['jobSummaries'][0]
            print(f"   Latest Build:")
            print(f"   - Status: {job['status']}")
            print(f"   - Started: {job['startTime']}")
            if 'endTime' in job:
                print(f"   - Ended: {job['endTime']}")
            print(f"   - Commit: {job.get('commitId', 'N/A')[:7]}")
            print(f"   - Message: {job.get('commitMessage', 'N/A')[:50]}")
        print()

except Exception as e:
    print(f"❌ Error: {e}")
    print("\nTrying to list all apps...")
    try:
        apps = amplify.list_apps()
        print(f"\n📱 Found {len(apps['apps'])} Amplify apps:")
        for app in apps['apps']:
            print(f"   - {app['name']} (ID: {app['appId']})")
    except Exception as e2:
        print(f"❌ Could not list apps: {e2}")
