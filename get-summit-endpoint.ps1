# Get Summit RDS Endpoint
$instanceId = "summit-db"
$region = "eu-west-1"

Write-Host "Checking Summit RDS instance status..." -ForegroundColor Cyan
Write-Host ""

$instance = aws rds describe-db-instances --db-instance-identifier $instanceId --region $region --query 'DBInstances[0]' --output json | ConvertFrom-Json

if ($instance) {
    Write-Host "Instance Status: $($instance.DBInstanceStatus)" -ForegroundColor Yellow
    Write-Host ""
    
    if ($instance.DBInstanceStatus -eq "available") {
        $endpoint = $instance.Endpoint.Address
        Write-Host "SUMMIT Database Endpoint:" -ForegroundColor Green
        Write-Host "  $endpoint" -ForegroundColor White
        Write-Host ""
        Write-Host "Add this to your server/.env file:" -ForegroundColor Cyan
        Write-Host "SUMMIT_DB_HOST=$endpoint" -ForegroundColor White
        Write-Host "SUMMIT_DB_PORT=5432" -ForegroundColor White
        Write-Host "SUMMIT_DB_NAME=Summit" -ForegroundColor White
        Write-Host "SUMMIT_DB_USER=postgres" -ForegroundColor White
        Write-Host "SUMMIT_DB_PASSWORD=Stacey1122" -ForegroundColor White
    } else {
        Write-Host "Instance is still $($instance.DBInstanceStatus)" -ForegroundColor Yellow
        Write-Host "Please wait and run this script again when status is 'available'" -ForegroundColor Gray
    }
} else {
    Write-Host "Instance not found!" -ForegroundColor Red
}

