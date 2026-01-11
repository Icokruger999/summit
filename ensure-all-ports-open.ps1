# Ensure all necessary ports are open in security group
$instanceId = "i-0fba58db502cc8d39"
$region = "eu-west-1"

Write-Host "Getting security group ID..." -ForegroundColor Cyan
$sgIds = aws ec2 describe-instances --instance-ids $instanceId --region $region --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' --output text 2>$null
$sgId = ($sgIds -split ' ')[0]

Write-Host "Security Group ID: $sgId" -ForegroundColor Green

# Check existing rules
Write-Host "`nChecking existing rules..." -ForegroundColor Cyan
$existingRules = aws ec2 describe-security-groups --group-ids $sgId --region $region --query 'SecurityGroups[0].IpPermissions[*].[FromPort,ToPort,IpProtocol]' --output json 2>$null | ConvertFrom-Json

$requiredPorts = @(
    @{Port=80; Protocol="tcp"; Name="HTTP"},
    @{Port=443; Protocol="tcp"; Name="HTTPS"},
    @{Port=3000; Protocol="tcp"; Name="Backend API"},
    @{Port=22; Protocol="tcp"; Name="SSH"}
)

Write-Host "`nRequired ports:" -ForegroundColor Yellow
foreach ($port in $requiredPorts) {
    $exists = $existingRules | Where-Object { $_[0] -eq $port.Port -and $_[2] -eq $port.Protocol }
    if ($exists) {
        Write-Host "  ✅ Port $($port.Port) ($($port.Name)) - OPEN" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Port $($port.Port) ($($port.Name)) - MISSING" -ForegroundColor Red
        Write-Host "     Adding rule..." -ForegroundColor Yellow
        aws ec2 authorize-security-group-ingress --group-id $sgId --protocol $port.Protocol --port $port.Port --cidr 0.0.0.0/0 --region $region 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "     ✅ Port $($port.Port) opened successfully" -ForegroundColor Green
        } else {
            Write-Host "     ⚠️  Failed to open port $($port.Port) (may already exist)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n✅ Security group configuration complete!" -ForegroundColor Green

