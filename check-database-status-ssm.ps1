# Check Database Setup Status via SSM
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$InstanceId = "i-0fba58db502cc8d39"

Write-Host "Checking Database Setup Status" -ForegroundColor Cyan
Write-Host "Instance ID: $InstanceId" -ForegroundColor Yellow
Write-Host ""

$commands = @(
    "echo '=== PostgreSQL Status ==='",
    "sudo systemctl is-active postgresql && echo 'PostgreSQL: RUNNING' || echo 'PostgreSQL: NOT RUNNING'",
    "echo ''",
    "echo '=== PgBouncer Status ==='",
    "sudo systemctl is-active pgbouncer && echo 'PgBouncer: RUNNING' || echo 'PgBouncer: NOT RUNNING'",
    "echo ''",
    "echo '=== Database Connection Test ==='",
    "sudo -u postgres psql -d summit -c 'SELECT version();' 2>&1 | head -1 || echo 'Database connection FAILED'",
    "echo ''",
    "echo '=== Tables Count ==='",
    "sudo -u postgres psql -d summit -tAc 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ''public'';' 2>&1 || echo '0 (tables not created yet)'",
    "echo ''",
    "echo '=== PgBouncer Connection Test ==='",
    "PGPASSWORD='KUQoTLZJcHN0YYXS6qiGJS9B7' psql -h 127.0.0.1 -p 6432 -U summit_user -d summit -c 'SELECT 1;' 2>&1 | head -1 || echo 'PgBouncer connection FAILED'"
)

$jsonObj = @{
    InstanceIds = @($InstanceId)
    DocumentName = "AWS-RunShellScript"
    Parameters = @{
        commands = $commands
    }
} | ConvertTo-Json -Depth 10

$tempJson = [System.IO.Path]::GetTempFileName() + ".json"
$jsonObj | Out-File -FilePath $tempJson -Encoding UTF8

try {
    $result = aws ssm send-command `
        --cli-input-json file://$tempJson `
        --region $Region `
        --output json 2>&1 | ConvertFrom-Json
    
    $commandId = $result.Command.CommandId
    
    Write-Host "Command sent. Waiting for results..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    $status = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --region $Region `
        --output json 2>&1 | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "Status: $($status.Status)" -ForegroundColor $(if ($status.Status -eq "Success") { "Green" } else { "Red" })
    Write-Host ""
    Write-Host "Output:" -ForegroundColor Cyan
    Write-Host $status.StandardOutputContent
    
    if ($status.StandardErrorContent) {
        Write-Host ""
        Write-Host "Errors:" -ForegroundColor Yellow
        Write-Host $status.StandardErrorContent
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    Remove-Item $tempJson -ErrorAction SilentlyContinue
}
