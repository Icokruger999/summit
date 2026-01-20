import boto3
import time

amplify = boto3.client('amplify', region_name='eu-west-1')

# Check job status
job = amplify.get_job(
    appId='d1mhd5fnnjyucj',
    branchName='main',
    jobId='295'
)

print('Status:', job['job']['summary']['status'])
print('Start time:', job['job']['summary'].get('startTime', 'N/A'))

# Show steps
for step in job['job'].get('steps', []):
    print(f"  {step['stepName']}: {step['status']}")
