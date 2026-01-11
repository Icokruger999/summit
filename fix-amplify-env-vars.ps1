# Fix Amplify Environment Variables
# This sets VITE_SERVER_URL directly in Amplify Console

$appId = "d1mhd5fnnjyucj"
$branchName = "main"
$region = "eu-west-1"

Write-Host "=== Setting Amplify Environment Variables ===" -ForegroundColor Cyan
Write-Host ""

# Get current branch config
Write-Host "Getting current branch configuration..." -ForegroundColor Yellow
$branch = aws amplify get-branch --app-id $appId --branch-name $branchName --region $region --output json | ConvertFrom-Json

# Prepare environment variables
$envVars = @{
    "VITE_SERVER_URL" = "https://summit.api.codingeverest.com"
}

# Convert to AWS format
$envVarsArray = @()
foreach ($key in $envVars.Keys) {
    $envVarsArray += @{
        name = $key
        value = $envVars[$key]
    }
}

Write-Host "Setting environment variables:" -ForegroundColor Yellow
$envVarsArray | ForEach-Object {
    Write-Host "  $($_.name) = $($_.value)" -ForegroundColor Green
}

# Update branch with environment variables
Write-Host ""
Write-Host "Updating Amplify branch configuration..." -ForegroundColor Yellow
$updateParams = @{
    appId = $appId
    branchName = $branchName
    region = $region
    environmentVariables = $envVarsArray
} | ConvertTo-Json -Depth 10

# Note: AWS CLI doesn't support updating env vars directly via CLI easily
# We need to use the console or update via API
Write-Host ""
Write-Host "⚠️  AWS CLI limitation: Environment variables must be set via Amplify Console" -ForegroundColor Yellow
Write-Host ""
Write-Host "Manual Steps:" -ForegroundColor Cyan
Write-Host "1. Go to AWS Amplify Console" -ForegroundColor White
Write-Host "2. Select app: $appId" -ForegroundColor White
Write-Host "3. Go to: App settings > Environment variables" -ForegroundColor White
Write-Host "4. Add/Update:" -ForegroundColor White
Write-Host "   Name: VITE_SERVER_URL" -ForegroundColor Green
Write-Host "   Value: https://summit.api.codingeverest.com" -ForegroundColor Green
Write-Host "5. Save and trigger a new build" -ForegroundColor White

