import boto3

amplify = boto3.client('amplify', region_name='eu-west-1')

# Redeploy job 297 which was the 16:00 deployment
try:
    job = amplify.start_job(
        appId='d1mhd5fnnjyucj',
        branchName='main',
        jobType='RETRY',
        jobId='297'
    )
    print(f"Redeploying job 297!")
    print(f"New Job ID: {job['jobSummary']['jobId']}")
    print(f"Status: {job['jobSummary']['status']}")
except Exception as e:
    print(f"Error: {e}")
