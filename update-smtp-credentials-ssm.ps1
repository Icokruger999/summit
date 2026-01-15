# Update SMTP credentials in server .env file via SSM
# Usage: .\update-smtp-credentials-ssm.ps1 -Host "smtp.gmail.com" -Port 587 -User "email@gmail.com" -Pass "password"

param(
    [Parameter(Mandatory=$true)]
    [string]$Host,
    [Parameter(Mandatory=$true)]
    [string]$User,
    [Parameter(Mandatory=$true)]
    [string]$Pass,
    [Parameter(Mandatory=$false)]
    [int]$Port = 587,
    [Parameter(Mandatory=$false)]
    [string]$Secure = "false",
    [Parameter(Mandatory=$false)]
    [string]$FromEmail = "info@streamyo.net",
    [Parameter(Mandatory=$false)]
    [string]$FromName = "Summit",
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "i-0fba58db502cc8d39",
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$ServerPath = "/var/www/summit/server"

Write-Host "Updating SMTP Credentials in .env file" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host "SMTP Host: $Host" -ForegroundColor Yellow
Write-Host "SMTP Port: $Port" -ForegroundColor Yellow
Write-Host ""

$commands = @(
    "cd $ServerPath",
    "if [ ! -f .env ]; then echo 'ERROR: .env file not found' && exit 1; fi",
    "# Remove existing SMTP credential lines",
    "grep -v '^SMTP_HOST=' .env > .env.tmp || true",
    "grep -v '^SMTP_PORT=' .env.tmp > .env.tmp2 || true",
    "grep -v '^SMTP_SECURE=' .env.tmp2 > .env.tmp3 || true",
    "grep -v '^SMTP_USER=' .env.tmp3 > .env.tmp4 || true",
    "grep -v '^SMTP_PASS=' .env.tmp4 > .env.tmp5 || true",
    "grep -v '^SMTP_FROM_EMAIL=' .env.tmp5 > .env.tmp6 || true",
    "grep -v '^SMTP_FROM_NAME=' .env.tmp6 > .env.tmp7 || true",
    "mv .env.tmp7 .env",
    "# Add SMTP credentials",
    "echo 'SMTP_HOST=$Host' >> .env",
    "echo 'SMTP_PORT=$Port' >> .env",
    "echo 'SMTP_SECURE=$Secure' >> .env",
    "echo 'SMTP_USER=$User' >> .env",
    "echo 'SMTP_PASS=$Pass' >> .env",
    "echo 'SMTP_FROM_EMAIL=$FromEmail' >> .env",
    "echo 'SMTP_FROM_NAME=$FromName' >> .env",
    "# Verify the changes",
    "echo '--- Updated .env SMTP credentials (password hidden) ---'",
    "grep -E '^(SMTP_HOST|SMTP_PORT|SMTP_SECURE|SMTP_USER|SMTP_FROM_EMAIL|SMTP_FROM_NAME)=' .env || echo 'WARNING: SMTP config not found in .env'",
    "grep -E '^SMTP_PASS=' .env | sed 's/\(.*\)=\(.\)[^=]*\(.\)/\1=***hidden***/' || echo 'WARNING: SMTP_PASS not found in .env'",
    "echo '.env file updated with SMTP credentials'"
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

try {
    $result = aws ssm send-command `
        --cli-input-json file://$tempJson `
        --region $Region `
        --output json | ConvertFrom-Json
    
    $commandId = $result.Command.CommandId
    Write-Host "Update command sent. Command ID: $commandId" -ForegroundColor Green
    
    # Wait for command to complete
    Write-Host "Waiting for command to complete..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    $statusResult = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --output json | ConvertFrom-Json
    
    if ($statusResult.Status -eq "Success") {
        Write-Host "SMTP credentials updated successfully!" -ForegroundColor Green
        Write-Host "Output:" -ForegroundColor Cyan
        $output = $statusResult.StandardOutputContent -replace '[^\x20-\x7E\n\r]', '?'
        Write-Host $output
        Write-Host ""
        Write-Host "⚠️  Remember to restart the server for changes to take effect:" -ForegroundColor Yellow
        Write-Host "   pm2 restart summit-backend" -ForegroundColor Gray
        return $true
    } else {
        Write-Host "❌ Command failed!" -ForegroundColor Red
        Write-Host $statusResult.StandardErrorContent
        return $false
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    return $false
} finally {
    Remove-Item $tempJson -ErrorAction SilentlyContinue
}
