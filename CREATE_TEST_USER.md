# Create Test User

## Test Account Credentials

**Email:** `test@summit.com`  
**Password:** `test123`

## How to Create/Update Test User

### Option 1: Run on Server (Recommended)

SSH into your server and run:

```bash
cd /var/www/summit
git pull
cd server
npx tsx scripts/create-test-user.ts
```

This will:
- Create a new test user if it doesn't exist
- Update the password if the user already exists
- Set the account to verified status (no temp password needed)

### Option 2: Use the Script

Run the PowerShell script (if SSM works):

```powershell
.\create-test-user-ssm.ps1
```

## What the Script Does

1. Checks if `test@summit.com` exists
2. If exists: Updates password to `test123` and removes temp password requirement
3. If new: Creates user with email `test@summit.com`, password `test123`, name "Test User"
4. Sets account status to verified (can log in immediately)

## Login

After running the script, you can log in with:
- **Email:** `test@summit.com`
- **Password:** `test123`

## Remove Test User (Before Production)

```bash
cd /var/www/summit/server
npx tsx scripts/delete-user.ts test@summit.com
```

Or manually in database:
```sql
DELETE FROM users WHERE LOWER(email) = 'test@summit.com';
```
