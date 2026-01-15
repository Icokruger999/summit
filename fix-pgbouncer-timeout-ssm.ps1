# Fix PgBouncer timeout and keep-alive settings
# This script updates pgbouncer.ini to prevent connection timeouts

param(
    [Parameter(Mandatory=$false)]
    [string]$InstanceId = "i-0fba58db502cc8d39",
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

Write-Host "Fixing PgBouncer timeout and keep-alive settings..." -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

$commands = @(
    "echo 'Checking PgBouncer configuration...'",
    "if [ -f /etc/pgbouncer/pgbouncer.ini ]; then",
    "  PGBOUNCER_CONFIG='/etc/pgbouncer/pgbouncer.ini'",
    "elif [ -f /var/lib/pgbouncer/pgbouncer.ini ]; then",
    "  PGBOUNCER_CONFIG='/var/lib/pgbouncer/pgbouncer.ini'",
    "elif [ -f ~/pgbouncer.ini ]; then",
    "  PGBOUNCER_CONFIG='~/pgbouncer.ini'",
    "else",
    "  echo 'PgBouncer config not found. Checking common locations...'",
    "  find /etc /var/lib /opt -name 'pgbouncer.ini' 2>/dev/null | head -1",
    "  exit 1",
    "fi",
    "echo 'Found config at: $PGBOUNCER_CONFIG'",
    "echo ''",
    "echo 'Current server_idle_timeout setting:'",
    "grep -E '^server_idle_timeout' $PGBOUNCER_CONFIG || echo 'Not set (using default)'",
    "echo ''",
    "echo 'Current tcp_keepalive setting:'",
    "grep -E '^tcp_keepalive' $PGBOUNCER_CONFIG || echo 'Not set (using default)'",
    "echo ''",
    "echo 'Backing up config...'",
    "sudo cp $PGBOUNCER_CONFIG ${PGBOUNCER_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)",
    "echo ''",
    "echo 'Updating server_idle_timeout to 600 (10 minutes)...'",
    "sudo sed -i 's/^#*server_idle_timeout.*/server_idle_timeout = 600/' $PGBOUNCER_CONFIG",
    "grep -q '^server_idle_timeout' $PGBOUNCER_CONFIG || echo 'server_idle_timeout = 600' | sudo tee -a $PGBOUNCER_CONFIG > /dev/null",
    "echo ''",
    "echo 'Enabling tcp_keepalive...'",
    "sudo sed -i 's/^#*tcp_keepalive.*/tcp_keepalive = 1/' $PGBOUNCER_CONFIG",
    "grep -q '^tcp_keepalive' $PGBOUNCER_CONFIG || echo 'tcp_keepalive = 1' | sudo tee -a $PGBOUNCER_CONFIG > /dev/null",
    "echo ''",
    "echo 'Updated settings:'",
    "grep -E '^(server_idle_timeout|tcp_keepalive)' $PGBOUNCER_CONFIG",
    "echo ''",
    "echo 'Restarting PgBouncer...'",
    "sudo systemctl restart pgbouncer || sudo service pgbouncer restart || echo 'Please restart PgBouncer manually'",
    "echo 'Done!'"
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
    Write-Host "Command sent. Command ID: $commandId" -ForegroundColor Green
    Write-Host "Waiting for completion..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    $statusResult = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --output json | ConvertFrom-Json
    
    if ($statusResult.Status -eq "Success") {
        Write-Host ""
        Write-Host "PgBouncer configuration updated!" -ForegroundColor Green
        Write-Host ""
        Write-Host "=== Output ===" -ForegroundColor Cyan
        Write-Host $statusResult.StandardOutputContent
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
