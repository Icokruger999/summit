# Summit Deployment Workflow
# Order: 1. GitHub -> 2. Amplify (auto) -> 3. EC2 via SSM

Write-Host "=== Summit Deployment Workflow ===" -ForegroundColor Cyan
Write-Host "Order: GitHub -> Amplify (auto) -> EC2 via SSM`n" -ForegroundColor Yellow

# Step 1: Ensure GitHub is up-to-date
Write-Host "Step 1: Updating GitHub..." -ForegroundColor Cyan
git status --short | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
$uncommitted = git status --porcelain
if ($uncommitted) {
    Write-Host "`nUncommitted changes found. Committing..." -ForegroundColor Yellow
    git add .
    git commit -m "Deploy: Latest changes"
}
Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push to GitHub!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Successfully pushed to GitHub" -ForegroundColor Green
Write-Host "Latest commit: $(git log --oneline -1)`n" -ForegroundColor White

# Step 2: Amplify will auto-deploy from GitHub
Write-Host "Step 2: Amplify will auto-deploy from GitHub" -ForegroundColor Cyan
Write-Host "✅ Monitor Amplify console for build status`n" -ForegroundColor Green

# Step 3: Deploy to EC2 via SSM
Write-Host "Step 3: Deploying to EC2 via SSM..." -ForegroundColor Cyan
$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"
$commands = @(
    "cd /var/www/summit",
    "git pull origin main",
    "cd server",
    "npm run build",
    "pm2 restart summit",
    "sleep 3",
    "pm2 list | grep summit"
)
$json = @{commands = $commands} | ConvertTo-Json
$json | Out-File -FilePath deploy-workflow-commands.json -Encoding utf8 -Force

Write-Host "Sending SSM deployment command..." -ForegroundColor Yellow
$result = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters file://deploy-workflow-commands.json --region $region --output json 2>&1

if ($LASTEXITCODE -eq 0) {
    $parsed = $result | ConvertFrom-Json
    $cmd = $parsed.Command
    Write-Host "`n✅ Deployment command sent!" -ForegroundColor Green
    Write-Host "Command ID: $($cmd.CommandId)" -ForegroundColor Cyan
    Write-Host "Status: $($cmd.Status)" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    Write-Host $result -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Deployment Summary ===" -ForegroundColor Cyan
Write-Host "✅ GitHub: Updated" -ForegroundColor Green
Write-Host "✅ Amplify: Auto-deploying from GitHub" -ForegroundColor Green
Write-Host "✅ EC2: Deployment command sent (Command ID: $($cmd.CommandId))" -ForegroundColor Green
Write-Host "`nNext: Wait 1-2 minutes for backend restart, then refresh app" -ForegroundColor Yellow

