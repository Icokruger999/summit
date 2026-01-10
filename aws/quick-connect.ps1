# Quick Connect to Your Summit Instance
# Instance: i-03589e2371d2fad15 (Windows Server 2019)

$INSTANCE_ID = "i-03589e2371d2fad15"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Connect to Summit Instance" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Instance ID: $INSTANCE_ID" -ForegroundColor White
Write-Host "Platform: Windows Server 2019 Datacenter`n" -ForegroundColor Gray

Write-Host "Select connection method:`n" -ForegroundColor Yellow

Write-Host "  [1] AWS Console (Browser) - Recommended" -ForegroundColor White
Write-Host "  [2] AWS CLI (Requires Session Manager Plugin)" -ForegroundColor White
Write-Host "  [3] Port Forward (Backend API port 3000)" -ForegroundColor White
Write-Host "  [4] Check Instance Status" -ForegroundColor White
Write-Host "  [Q] Quit`n" -ForegroundColor Gray

$choice = Read-Host "Enter choice"

switch ($choice) {
    "1" {
        Write-Host "`nOpening AWS Console..." -ForegroundColor Green
        Start-Process "https://console.aws.amazon.com/systems-manager/session-manager/sessions"
        Write-Host "`nSelect instance: $INSTANCE_ID" -ForegroundColor Yellow
        Write-Host "Then click 'Start session'`n" -ForegroundColor Yellow
    }
    "2" {
        Write-Host "`nChecking Session Manager Plugin..." -ForegroundColor Cyan
        try {
            session-manager-plugin 2>$null
            Write-Host "✅ Plugin found!`n" -ForegroundColor Green
            Write-Host "Connecting to instance..." -ForegroundColor Green
            aws ssm start-session --target $INSTANCE_ID
        } catch {
            Write-Host "❌ Session Manager Plugin not found!`n" -ForegroundColor Red
            Write-Host "Download from:" -ForegroundColor Yellow
            Write-Host "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/windows/SessionManagerPluginSetup.exe`n" -ForegroundColor White
            
            $download = Read-Host "Open download page? (y/n)"
            if ($download -eq "y") {
                Start-Process "https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
            }
        }
    }
    "3" {
        Write-Host "`nSetting up port forwarding..." -ForegroundColor Cyan
        Write-Host "Local port 3000 -> EC2 port 3000`n" -ForegroundColor Gray
        Write-Host "Once connected, access backend at: http://localhost:3000`n" -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop forwarding`n" -ForegroundColor Gray
        
        try {
            aws ssm start-session `
                --target $INSTANCE_ID `
                --document-name AWS-StartPortForwardingSession `
                --parameters "portNumber=3000,localPortNumber=3000"
        } catch {
            Write-Host "`n❌ Port forwarding failed!" -ForegroundColor Red
            Write-Host "Make sure Session Manager Plugin is installed.`n" -ForegroundColor Yellow
        }
    }
    "4" {
        Write-Host "`nChecking instance status...`n" -ForegroundColor Cyan
        
        Write-Host "EC2 Status:" -ForegroundColor Yellow
        aws ec2 describe-instance-status --instance-ids $INSTANCE_ID --query "InstanceStatuses[0].[InstanceState.Name,InstanceStatus.Status,SystemStatus.Status]" --output table
        
        Write-Host "`nSSM Status:" -ForegroundColor Yellow
        aws ssm describe-instance-information --instance-information-filter-list "key=InstanceIds,valueSet=$INSTANCE_ID" --query "InstanceInformationList[0].[PingStatus,LastPingDateTime,PlatformName]" --output table
        
        Write-Host ""
    }
    "q" {
        Write-Host "`nExiting...`n" -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "`n❌ Invalid choice!`n" -ForegroundColor Red
    }
}

Write-Host ""

