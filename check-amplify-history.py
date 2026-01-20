import boto3
amplify = boto3.client('amplify', region_name='eu-west-1')
jobs = amplify.list_jobs(appId='d1mhd5fnnjyucj', branchName='main', maxResults=20)
for job in jobs['jobSummaries']:
    commit_msg = job.get('commitMessage', 'N/A')
    if commit_msg:
        commit_msg = commit_msg[:50]
    print(f"{job['jobId']}: {job['status']} - {job.get('commitTime', 'N/A')} - {commit_msg}")
