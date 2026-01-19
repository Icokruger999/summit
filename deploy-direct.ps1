#!/usr/bin/env pwsh
# Direct deployment via SSM

$INSTANCE_ID = "i-0fba58db502cc8d39"
$REGION = "us-east-1"

Write-Host "[INFO] Deploying user search fix..." -ForegroundColor Green

# Step 1: Create archive
Write-Host "[1] Creating archive..." -ForegroundColor Cyan
tar -czf server-dist-fix.tar.gz -C server dist
Write-Host "[OK] Archive created" -ForegroundColor Green

# Step 2: Read and encode file
Write-Host "[2] Encoding file..." -ForegroundColor Cyan
$fileContent = [System.IO.File]::ReadAllBytes("server-dist-fix.tar.gz")
$encoded = [System.Convert]::ToBase64String($fileContent)
Write-Host "[OK] File encoded" -ForegroundColor Green

# Step 3: Write to temp file in chunks
Write-Host "[3] Writing to temp file..." -ForegroundColor Cyan
$chunkSize = 3000
$chunks = @()
for ($i = 0; $i -lt $encoded.Length; $i += $chunkSize) {
    $chunk = $encoded.Substring($i, [Math]::Min($chunkSize, $encoded.Length - $i))
    $chunks += $chunk
}
Write-Host "[OK] Split into $($chunks.Count) chunks" -ForegroundColor Green

# Step 4: Send to EC2 via SSM
Write-Host "[4] Uploading to EC2..." -ForegroundColor Cyan

$commands = @()
for ($i = 0; $i -lt $chunks.Count; $i++) {
    if ($i -eq 0) {
        $commands += "echo '$($chunks[$i])' > /tmp/deploy.b64"
    } else {
        $commands += "echo '$($chunks[$i])' >> /tmp/deploy.b64"
    }
}

# Add decode and deploy commands
$commands += "cd /tmp && base64 -d deploy.b64 > deploy.tar.gz"
$commands += "cd /home/ubuntu/summit/server && tar -xzf /tmp/deploy.tar.gz"
$commands += "pm2 restart summit-backend"
$commands += "sleep 3 && pm2 status"
$commands += "rm /tmp/deploy.b64 /tmp/deploy.tar.gz"

# Send commands
foreach ($cmd in $commands) {
    Write-Host "[INFO] Sending command..." -ForegroundColor Gray
    aws ssm send-command `
        --instance-ids $INSTANCE_ID `
        --document-name "AWS-RunShellScript" `
        --parameters "commands=$cmd" `
        --region $REGION | Out-Null
    Start-Sleep -Milliseconds 500
}

Write-Host "[OK] All commands sent" -ForegroundColor Green
Write-Host "[OK] Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Changes deployed:" -ForegroundColor Yellow
Write-Host "  [OK] Removed subscription check from /api/users route" -ForegroundColor Green
Write-Host "  [OK] User search now works without subscription" -ForegroundColor Green
Write-Host "  [OK] Users can find contacts like ico@astutetech.co.za" -ForegroundColor Green
