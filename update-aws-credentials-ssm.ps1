# Update AWS credentials in server .env file via SSM
# Usage: .\update-aws-credentials-ssm.ps1 -AccessKeyId "AKIA..." -SecretAccessKey "secret..."

param(
    [Parameter(Mandatory=$true)]
    [string]$AccessKeyId,
    [Parameter(Mandatory=$true)]
    [string]$SecretAccessKey,
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "i-0fba58db502cc8d39",
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$ServerPath = "/var/www/summit/server"

Write-Host "Updating AWS Credentials in .env file" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

$commands = @(
    "cd $ServerPath",
    "if [ ! -f .env ]; then echo 'ERROR: .env file not found' && exit 1; fi",
    "# Remove existing AWS credential lines",
    "grep -v '^AWS_ACCESS_KEY_ID=' .env > .env.tmp || true",
    "grep -v '^AWS_SECRET_ACCESS_KEY=' .env.tmp > .env.tmp2 || true",
    "grep -v '^AWS_REGION=' .env.tmp2 > .env.tmp3 || true",
    "mv .env.tmp3 .env",
    "# Add AWS credentials",
    "echo 'AWS_ACCESS_KEY_ID=$AccessKeyId' >> .env",
    "echo 'AWS_SECRET_ACCESS_KEY=$SecretAccessKey' >> .env",
    "echo 'AWS_REGION=$Region' >> .env",
    "# Verify the changes (without showing secrets)",
    "echo '--- Updated .env AWS credentials (keys hidden) ---'",
    "grep -E '^AWS_ACCESS_KEY_ID=' .env | sed 's/\(.*\)=\(.\)[^=]*\(.\)/\1=***hidden***/' || echo 'WARNING: AWS_ACCESS_KEY_ID not found'",
    "grep -E '^AWS_SECRET_ACCESS_KEY=' .env | sed 's/\(.*\)=\(.\)[^=]*\(.\)/\1=***hidden***/' || echo 'WARNING: AWS_SECRET_ACCESS_KEY not found'",
    "grep -E '^AWS_REGION=' .env || echo 'WARNING: AWS_REGION not found'",
    "echo '.env file updated with AWS credentials'"
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
        Write-Host "AWS credentials updated successfully!" -ForegroundColor Green
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
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart the server: pm2 restart all" -ForegroundColor White
Write-Host "2. Test email sending: npx tsx scripts/test-email.ts your-email@example.com" -ForegroundColor White
