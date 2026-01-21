#!/usr/bin/env python3
"""
Check Amplify build status for the latest commit
"""

import boto3
import time

REGION = "us-east-1"

def main():
    print("🔍 Checking Amplify Build Status")
    print("="*60)
    
    amplify = boto3.client('amplify', region_name=REGION)
    
    try:
        # List all apps
        apps_response = amplify.list_apps()
        
        if not apps_response.get('apps'):
            print("❌ No Amplify apps found")
            return
        
        for app in apps_response['apps']:
            print(f"\n📱 App: {app['name']}")
            print(f"   App ID: {app['appId']}")
            print(f"   Default Domain: {app['defaultDomain']}")
            
            # List branches
            branches_response = amplify.list_branches(appId=app['appId'])
            
            for branch in branches_response.get('branches', []):
                print(f"\n   🌿 Branch: {branch['branchName']}")
                
                # Get latest job
                jobs_response = amplify.list_jobs(
                    appId=app['appId'],
                    branchName=branch['branchName'],
                    maxResults=1
                )
                
                if jobs_response.get('jobSummaries'):
                    job = jobs_response['jobSummaries'][0]
                    print(f"      Latest Build:")
                    print(f"      - Status: {job['status']}")
                    print(f"      - Commit: {job.get('commitId', 'N/A')[:7]}")
                    print(f"      - Message: {job.get('commitMessage', 'N/A')[:50]}")
                    print(f"      - Started: {job.get('startTime', 'N/A')}")
                    
                    if job['status'] == 'FAILED':
                        print(f"      ❌ BUILD FAILED")
                        # Get job details
                        job_detail = amplify.get_job(
                            appId=app['appId'],
                            branchName=branch['branchName'],
                            jobId=job['jobId']
                        )
                        print(f"\n      Error Details:")
                        for step in job_detail['job']['steps']:
                            if step['status'] == 'FAILED':
                                print(f"      - Step '{step['stepName']}' failed")
                                print(f"        {step.get('logUrl', 'No log URL')}")
                    
                    elif job['status'] == 'SUCCEED':
                        print(f"      ✅ BUILD SUCCESSFUL")
                        print(f"      🌐 URL: https://{branch['branchName']}.{app['defaultDomain']}")
                    
                    elif job['status'] in ['PENDING', 'RUNNING']:
                        print(f"      ⏳ BUILD IN PROGRESS")
                else:
                    print(f"      No builds found")
    
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
