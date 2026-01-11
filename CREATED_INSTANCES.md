# Created Instances Information

## RDS Database

- **Instance Identifier**: summit-db
- **Database Name**: Summit
- **Master Username**: postgres
- **Master Password**: FlVT6=Lps0E!l5cg
- **Instance Class**: db.t3.micro
- **Engine**: PostgreSQL 15.4
- **Status**: Creating (check with: .\check-rds-status.ps1 -DBInstanceIdentifier "summit-db")

**⚠️ IMPORTANT**: Save this password securely! It's needed to connect to the database.

## EC2 Instance

- **Instance Name**: summit
- **Instance Type**: t2.micro
- **Key Pair**: summit-keypair
- **Status**: Creating (check AWS Console or use AWS CLI)

**⚠️ IMPORTANT**: Save the key file (summit-keypair.pem) - you'll need it to SSH into the instance.

## Next Steps

1. **Wait for instances to be ready** (RDS: 10-15 min, EC2: 5-10 min)
2. **Check RDS status**: `.\check-rds-status.ps1 -DBInstanceIdentifier "summit-db"`
3. **Get RDS endpoint** (will be available after creation)
4. **Update .env file** with new database connection details
5. **Set up EC2 instance**: `.\setup-new-instance.ps1 -InstanceId <instance-id>`
6. **Migrate code**: `.\migrate-summit-code.ps1 -InstanceId <instance-id>`

## Connection Details (After Creation)

Once instances are ready, connection details will be available:

### RDS Connection
- Host: (check with: `.\check-rds-status.ps1`)
- Port: 5432
- Database: Summit
- Username: postgres
- Password: FlVT6=Lps0E!l5cg

### EC2 Connection
- SSH: `ssh -i summit-keypair.pem ubuntu@<public-ip>`
- Public IP: (check AWS Console or new-instance-info.json)

