import boto3

amplify = boto3.client('amplify', region_name='eu-west-1')

# Start a new job to deploy
job = amplify.start_job(
    appId='d1mhd5fnnjyucj',
    branchName='main',
    jobType='RELEASE'
)

print('Deployment started!')
print('Job ID:', job['jobSummary']['jobId'])
print('Status:', job['jobSummary']['status'])
