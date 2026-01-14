# Add SES Permissions to Existing EC2-SSM-Role
# This only adds email permissions - does NOT modify Milo's S3 access

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$RoleName = "EC2-SSM-Role"
$PolicyName = "SummitSESEmailPolicy"

Write-Host "Adding SES Permissions to Existing IAM Role" -ForegroundColor Cyan
Write-Host "Role: $RoleName" -ForegroundColor Yellow
Write-Host "Note: This only adds email permissions - Milo's S3 access is NOT affected" -ForegroundColor Green
Write-Host ""

# Create SES policy document
$policyDocument = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Action = @(
                "ses:SendEmail",
                "ses:SendRawEmail"
            )
            Resource = "*"
        }
    )
} | ConvertTo-Json -Depth 10

$policyFile = [System.IO.Path]::GetTempFileName() + ".json"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($policyFile, $policyDocument, $utf8NoBom)

Write-Host "Attempting to add SES policy to role..." -ForegroundColor Yellow

try {
    # Try to create and attach inline policy
    Write-Host "Creating inline policy on role..." -ForegroundColor Gray
    
    $putPolicyResult = aws iam put-role-policy `
        --role-name $RoleName `
        --policy-name $PolicyName `
        --policy-document file://$policyFile `
        --output json 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully added SES permissions to $RoleName!" -ForegroundColor Green
        Write-Host ""
        Write-Host "The role now has SES email sending permissions." -ForegroundColor Green
        Write-Host "Milo's S3 permissions remain unchanged." -ForegroundColor Green
    } else {
        Write-Host "⚠️  Could not add policy automatically (may need AWS Console access)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please add the policy manually:" -ForegroundColor Yellow
        Write-Host "1. Go to: https://console.aws.amazon.com/iam/home?region=eu-west-1#/roles/$RoleName" -ForegroundColor Cyan
        Write-Host "2. Click 'Add permissions' → 'Create inline policy'" -ForegroundColor Cyan
        Write-Host "3. Click 'JSON' tab" -ForegroundColor Cyan
        Write-Host "4. Paste this JSON:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host $policyDocument -ForegroundColor Gray
        Write-Host ""
        Write-Host "5. Name: $PolicyName" -ForegroundColor Cyan
        Write-Host "6. Click 'Create policy'" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please add the policy manually via AWS Console:" -ForegroundColor Yellow
    Write-Host "https://console.aws.amazon.com/iam/home?region=eu-west-1#/roles/$RoleName" -ForegroundColor Cyan
} finally {
    Remove-Item $policyFile -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Policy JSON saved to: $policyFile" -ForegroundColor Gray
Write-Host "(File will be cleaned up automatically)" -ForegroundColor Gray
