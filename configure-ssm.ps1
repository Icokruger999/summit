# Configure SSM for EC2 Instance
$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"
$roleName = "EC2-SSM-Role"
$policyArn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"

Write-Host "`n===========================================================" -ForegroundColor Cyan
Write-Host "  Configuring SSM for codingeverest Instance" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "Instance: $instanceId" -ForegroundColor Yellow
Write-Host "Region: $region" -ForegroundColor Yellow
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check current IAM role
Write-Host "[1/5] Checking current IAM role..." -ForegroundColor Green
$currentRole = python -m awscli ec2 describe-instances `
    --region $region `
    --instance-ids $instanceId `
    --query "Reservations[0].Instances[0].IamInstanceProfile.Arn" `
    --output text 2>$null

if ($currentRole -and $currentRole -ne "None") {
    Write-Host "  Instance already has IAM role: $currentRole" -ForegroundColor Gray
    Write-Host "  Attaching SSM policy to existing role..." -ForegroundColor Yellow
    
    # Extract role name from ARN
    $existingRoleName = $currentRole -split "/" | Select-Object -Last 1
    
    # Attach SSM policy
    python -m awscli iam attach-role-policy `
        --role-name $existingRoleName `
        --policy-arn $policyArn 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  SSM policy attached to existing role" -ForegroundColor Green
    } else {
        Write-Host "  Policy may already be attached" -ForegroundColor Gray
    }
} else {
    Write-Host "  No IAM role attached" -ForegroundColor Gray
    
    # Step 2: Create IAM role
    Write-Host "`n[2/5] Creating IAM role for SSM..." -ForegroundColor Green
    
    $trustPolicy = @'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
'@
    
    $trustPolicy | Out-File -FilePath "trust-policy.json" -Encoding ASCII
    
    # Create role
    python -m awscli iam create-role `
        --role-name $roleName `
        --assume-role-policy-document file://trust-policy.json 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Created IAM role: $roleName" -ForegroundColor Green
    } else {
        Write-Host "  Role may already exist" -ForegroundColor Gray
    }
    
    # Step 3: Attach SSM policy
    Write-Host "`n[3/5] Attaching SSM policy..." -ForegroundColor Green
    python -m awscli iam attach-role-policy `
        --role-name $roleName `
        --policy-arn $policyArn 2>&1 | Out-Null
    
    Write-Host "  Attached AmazonSSMManagedInstanceCore policy" -ForegroundColor Green
    
    # Step 4: Create instance profile
    Write-Host "`n[4/5] Creating instance profile..." -ForegroundColor Green
    python -m awscli iam create-instance-profile `
        --instance-profile-name $roleName 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Created instance profile" -ForegroundColor Green
    } else {
        Write-Host "  Instance profile may already exist" -ForegroundColor Gray
    }
    
    # Add role to instance profile
    python -m awscli iam add-role-to-instance-profile `
        --instance-profile-name $roleName `
        --role-name $roleName 2>&1 | Out-Null
    
    # Wait a moment for IAM to propagate
    Write-Host "  Waiting for IAM propagation..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
    
    # Step 5: Attach instance profile to EC2
    Write-Host "`n[5/5] Attaching instance profile to EC2..." -ForegroundColor Green
    python -m awscli ec2 associate-iam-instance-profile `
        --region $region `
        --instance-id $instanceId `
        --iam-instance-profile Name=$roleName 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Instance profile attached!" -ForegroundColor Green
    } else {
        Write-Host "  May already be attached or need to replace" -ForegroundColor Yellow
        
        # Try to replace
        python -m awscli ec2 replace-iam-instance-profile-association `
            --region $region `
            --iam-instance-profile Name=$roleName `
            --association-id (python -m awscli ec2 describe-iam-instance-profile-associations --region $region --filters "Name=instance-id,Values=$instanceId" --query "IamInstanceProfileAssociations[0].AssociationId" --output text) 2>&1 | Out-Null
    }
}

# Cleanup
Remove-Item "trust-policy.json" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  SSM Configuration Complete!" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Wait 2-3 minutes for SSM agent to register" -ForegroundColor White
Write-Host "2. Run: .\deploy-final.ps1" -ForegroundColor White
Write-Host ""
Write-Host "To verify SSM is ready:" -ForegroundColor Yellow
Write-Host "  python -m awscli ssm describe-instance-information --region $region --filters ""Key=InstanceIds,Values=$instanceId""" -ForegroundColor Gray
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

