# PowerShell Script to Check RDS Instance Status

param(
    [string]$DBInstanceIdentifier = "summit-db",
    [string]$Region = "eu-west-1"
)

Write-Host "=== Checking RDS Instance Status ===" -ForegroundColor Cyan
Write-Host ""

try {
    $instance = aws rds describe-db-instances --db-instance-identifier $DBInstanceIdentifier --region $Region --output json | ConvertFrom-Json
    
    if ($instance.DBInstances.Count -eq 0) {
        Write-Host "❌ Instance not found: $DBInstanceIdentifier" -ForegroundColor Red
        exit 1
    }
    
    $db = $instance.DBInstances[0]
    
    Write-Host "Instance Status: $($db.DBInstanceStatus)" -ForegroundColor $(if ($db.DBInstanceStatus -eq 'available') { 'Green' } else { 'Yellow' })
    Write-Host ""
    Write-Host "Details:" -ForegroundColor Cyan
    Write-Host "  Identifier: $($db.DBInstanceIdentifier)" -ForegroundColor White
    Write-Host "  Engine: $($db.Engine) $($db.EngineVersion)" -ForegroundColor White
    Write-Host "  Class: $($db.DBInstanceClass)" -ForegroundColor White
    Write-Host "  Database Name: $($db.DBName)" -ForegroundColor White
    Write-Host "  Master Username: $($db.MasterUsername)" -ForegroundColor White
    
    if ($db.Endpoint) {
        Write-Host "  Endpoint: $($db.Endpoint.Address)" -ForegroundColor Green
        Write-Host "  Port: $($db.Endpoint.Port)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Connection String:" -ForegroundColor Cyan
        Write-Host "  Host: $($db.Endpoint.Address)" -ForegroundColor White
        Write-Host "  Port: $($db.Endpoint.Port)" -ForegroundColor White
        Write-Host "  Database: $($db.DBName)" -ForegroundColor White
        Write-Host "  Username: $($db.MasterUsername)" -ForegroundColor White
    } else {
        Write-Host "  Endpoint: Not available yet (instance is still being created)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Status: $($db.DBInstanceStatus)" -ForegroundColor $(if ($db.DBInstanceStatus -eq 'available') { 'Green' } elseif ($db.DBInstanceStatus -eq 'creating') { 'Yellow' } else { 'Red' })
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

