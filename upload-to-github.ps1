# Upload files to GitHub via GitHub CLI or manual instructions
# Run this script to push files to GitHub

cd C:\CodingE-Chat

Write-Host "=== Uploading Files to GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is available
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "✅ GitHub CLI found - using gh to upload files" -ForegroundColor Green
    Write-Host ""
    
    # Authenticate
    gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Not authenticated with GitHub CLI" -ForegroundColor Yellow
        Write-Host "Run: gh auth login" -ForegroundColor White
        Write-Host "Or continue with manual push below" -ForegroundColor Gray
    } else {
        # Push using gh
        git push origin main --force-with-lease 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Files pushed successfully!" -ForegroundColor Green
            exit 0
        }
    }
}

# Fallback: Manual push instructions
Write-Host "=== Manual Push Required ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Files are ready. To push manually:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: GitHub Web Interface (Easiest)" -ForegroundColor Green
Write-Host "  1. Go to: https://github.com/Icokruger999/summit" -ForegroundColor White
Write-Host "  2. Click 'Add file' → 'Upload files'" -ForegroundColor White
Write-Host "  3. Upload these files:" -ForegroundColor White
Write-Host "     - index.html (from C:\CodingE-Chat\index.html)" -ForegroundColor Gray
Write-Host "     - amplify.yml (from C:\CodingE-Chat\amplify.yml)" -ForegroundColor Gray
Write-Host "     - app/ folder (entire folder from C:\CodingE-Chat\app\)" -ForegroundColor Gray
Write-Host "  4. Commit to main branch" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Command Line (After authentication)" -ForegroundColor Green
Write-Host "  git push origin main --force" -ForegroundColor White
Write-Host ""

# Show file locations
Write-Host "Files ready at:" -ForegroundColor Cyan
Write-Host "  C:\CodingE-Chat\index.html" -ForegroundColor White
Write-Host "  C:\CodingE-Chat\amplify.yml" -ForegroundColor White
Write-Host "  C:\CodingE-Chat\app\index.html" -ForegroundColor White
Write-Host ""

