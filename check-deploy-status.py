import boto3
import time

amplify = boto3.client('amplify', region_name='eu-west-1')

# List recent jobs
jobs = amplify.list_jobs(
    appId='d1mhd5fnnjyucj',
    branchName='main',
    maxResults=3
)

for job_summary in jobs['jobSummaries']:
    print(f"Job {job_summary['jobId']}: {job_summary['status']} - {job_summary.get('commitMessage', 'N/A')[:50]}")
