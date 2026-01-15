# Script to attach SES policy to EC2-SSM-Role
# NOTE: This requires AWS credentials with IAM permissions (cannot be run by amplify-deploy user)
# Run this with an AWS account that has IAM admin permissions

param(
    [Parameter(Mandatory=$false)]
    [string]$RoleName = "EC2-SSM-Role",
    [Parameter(Mandatory=$false)]
    [string]$PolicyArn = "arn:aws:iam::aws:policy/AmazonSESFullAccess",
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

Write-Host "Attaching SES Policy to IAM Role" -ForegroundColor Cyan
Write-Host "Role: $RoleName" -ForegroundColor Yellow
Write-Host "Policy: $PolicyArn" -ForegroundColor Yellow
Write-Host ""

# Check if policy is already attached
Write-Host "Checking current policies..." -ForegroundColor Yellow
$attachedPolicies = aws iam list-attached-role-policies --role-name $RoleName --region $Region --output json | ConvertFrom-Json

$alreadyAttached = $attachedPolicies.AttachedPolicies | Where-Object { $_.PolicyArn -eq $PolicyArn }

if ($alreadyAttached) {
    Write-Host "Policy is already attached!" -ForegroundColor Green
    exit 0
}

# Attach the policy
Write-Host "Attaching policy..." -ForegroundColor Yellow
try {
    aws iam attach-role-policy `
        --role-name $RoleName `
        --policy-arn $PolicyArn `
        --region $Region

    Write-Host "Successfully attached SES policy to $RoleName!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Restart the server: pm2 restart all" -ForegroundColor White
    Write-Host "2. Test email sending with: npx tsx scripts/test-email.ts your-email@example.com" -ForegroundColor White
} catch {
    Write-Host "Failed to attach policy. Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "This script requires AWS credentials with IAM permissions." -ForegroundColor Yellow
    Write-Host "The amplify-deploy user cannot perform this action." -ForegroundColor Yellow
    exit 1
}
