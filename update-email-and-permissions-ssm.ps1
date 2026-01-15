# Update SES email to info@streamyo.net and verify configuration
param(
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "i-0fba58db502cc8d39",
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1",
    [Parameter(Mandatory=$false)]
    [string]$SesFromEmail = "info@streamyo.net",
    [Parameter(Mandatory=$false)]
    [string]$SesFromName = "Summit"
)

$ServerPath = "/var/www/summit/server"

Write-Host "Updating AWS SES Email Configuration" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host "New From Email: $SesFromEmail" -ForegroundColor Yellow
Write-Host "From Name: $SesFromName" -ForegroundColor Yellow
Write-Host ""

Write-Host "Updating .env file..." -ForegroundColor Yellow

$commands = @(
    "cd $ServerPath",
    "if [ ! -f .env ]; then echo 'ERROR: .env file not found' && exit 1; fi",
    "# Remove existing SES email lines",
    "grep -v '^SES_FROM_EMAIL=' .env > .env.tmp || true",
    "grep -v '^SES_FROM_NAME=' .env.tmp > .env.tmp2 || true",
    "mv .env.tmp2 .env",
    "# Add updated SES configuration",
    "echo 'SES_FROM_EMAIL=$SesFromEmail' >> .env",
    "echo 'SES_FROM_NAME=$SesFromName' >> .env",
    "# Verify the changes",
    "echo '--- Updated .env SES email settings ---'",
    "grep -E '^(SES_FROM_EMAIL|SES_FROM_NAME)=' .env || echo 'WARNING: SES settings not found in .env'",
    "echo '.env file updated with new email address'"
)

$jsonObj = @{
    InstanceIds = @($InstanceId)
    DocumentName = "AWS-RunShellScript"
    Parameters = @{
        commands = $commands
    }
} | ConvertTo-Json -Depth 10

$tempJson = [System.IO.Path]::GetTempFileName() + ".json"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tempJson, $jsonObj, $utf8NoBom)

$result = aws ssm send-command --cli-input-json "file://$tempJson" --region $Region --output json | ConvertFrom-Json
Remove-Item $tempJson

$commandId = $result.Command.CommandId
Write-Host "Update command sent. Command ID: $commandId" -ForegroundColor Green

Write-Host "Waiting for command to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$maxAttempts = 12
$attempt = 0
$completed = $false

while (-not $completed -and $attempt -lt $maxAttempts) {
    $statusResult = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --region $Region --output json | ConvertFrom-Json

    if ($statusResult.Status -eq "Success") {
        $completed = $true
        Write-Host "Email configuration updated successfully!" -ForegroundColor Green
        Write-Host "Output:" -ForegroundColor Cyan
        Write-Host $statusResult.StandardOutputContent
        if ($statusResult.StandardErrorContent) {
            Write-Host "Errors:" -ForegroundColor Yellow
            Write-Host $statusResult.StandardErrorContent
        }
    } elseif ($statusResult.Status -eq "Failed") {
        Write-Host "Command failed!" -ForegroundColor Red
        Write-Host $statusResult.StandardErrorContent
        exit 1
    } else {
        $attempt++
        Write-Host "Still running... (attempt $attempt/$maxAttempts)" -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}

if (-not $completed) {
    Write-Host "Command timed out after $maxAttempts attempts" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "IMPORTANT: IAM Permissions Issue Detected" -ForegroundColor Red
Write-Host "The EC2-SSM-Role needs SES permissions. You need to:" -ForegroundColor Yellow
Write-Host "1. Go to AWS IAM Console" -ForegroundColor Cyan
Write-Host "2. Find the EC2-SSM-Role" -ForegroundColor Cyan
Write-Host "3. Attach the AmazonSESFullAccess policy OR create a custom policy with:" -ForegroundColor Cyan
Write-Host "   - ses:SendEmail" -ForegroundColor White
Write-Host "   - ses:SendRawEmail" -ForegroundColor White
Write-Host "   Resource: arn:aws:ses:eu-west-1:148450585085:identity/*" -ForegroundColor White
Write-Host ""
Write-Host "After updating IAM permissions, restart the server:" -ForegroundColor Yellow
Write-Host "  pm2 restart all" -ForegroundColor White
