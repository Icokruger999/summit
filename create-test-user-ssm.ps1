# Create test user on server via SSM
param(
    [string]$InstanceId = "i-0fba58db502cc8d39",
    [string]$Region = "eu-west-1"
)

Write-Host "Creating test user on server..." -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow

$commands = @(
    "cd /var/www/summit/server",
    "npx tsx scripts/create-test-user.ts"
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
    $result = aws ssm send-command --cli-input-json file://$tempJson --region $Region --output json | ConvertFrom-Json
    $commandId = $result.Command.CommandId
    Write-Host "Command sent. Command ID: $commandId" -ForegroundColor Green
    Write-Host "Waiting for completion..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    $statusResult = aws ssm get-command-invocation --command-id $commandId --instance-id $InstanceId --region $Region --output json | ConvertFrom-Json
    
    if ($statusResult.Status -eq "Success") {
        Write-Host ""
        Write-Host "Test user created/updated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "=== Output ===" -ForegroundColor Cyan
        Write-Host $statusResult.StandardOutputContent
        Write-Host ""
        Write-Host "Test Credentials:" -ForegroundColor Yellow
        Write-Host "   Email: test@summit.com" -ForegroundColor White
        Write-Host "   Password: test123" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "Command failed!" -ForegroundColor Red
        Write-Host "Error:" -ForegroundColor Red
        Write-Host $statusResult.StandardErrorContent
    }
} catch {
    Write-Host "Error occurred" -ForegroundColor Red
    Write-Host $_.Exception.Message
} finally {
    Remove-Item $tempJson -ErrorAction SilentlyContinue
}
