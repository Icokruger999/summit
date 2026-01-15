# SMTP Fallback Setup for Email

## Overview

The email service now has automatic fallback from AWS SES to SMTP. If SES fails due to verification issues or permissions, the system will automatically attempt to send via SMTP.

## How It Works

1. **Primary**: Attempts to send via AWS SES
2. **Fallback**: If SES fails with verification/permission errors, automatically falls back to SMTP
3. **Error**: If both fail, returns an error

## SMTP Configuration

Add these environment variables to your `server/.env` file:

```bash
# SMTP Configuration (Fallback)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM_EMAIL=info@streamyo.net
SMTP_FROM_NAME=Summit
```

### Common SMTP Providers

#### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password  # Generate in Google Account > Security > App passwords
```

#### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Amazon SES SMTP
```bash
SMTP_HOST=email-smtp.eu-west-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

#### Custom SMTP Server
```bash
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587  # or 465 for SSL
SMTP_SECURE=false  # true for port 465
SMTP_USER=your-username
SMTP_PASS=your-password
```

## Important Notes

1. **Gmail**: Requires an [App Password](https://support.google.com/accounts/answer/185833) if 2FA is enabled
2. **Security**: Never commit `.env` file with credentials to Git
3. **Testing**: Use the test email script to verify SMTP works:
   ```bash
   cd server
   npx tsx scripts/test-email.ts recipient@example.com
   ```

## When Fallback Activates

SMTP fallback activates when SES fails with:
- `MessageRejected` - Email/domain not verified
- `AccessDenied` - IAM permissions issue
- Any error containing "not verified" or "not authorized"

## Status Logging

The system logs which method was used:
- `✅ Temp password email sent successfully via AWS SES` - SES worked
- `✅ Temp password email sent successfully via SMTP (fallback)` - SMTP fallback worked
- `❌ Error sending temp password email` - Both methods failed

## Environment Variables Priority

1. **FROM_EMAIL**: Uses `SES_FROM_EMAIL` first, falls back to `SMTP_FROM_EMAIL`, then default
2. **FROM_NAME**: Uses `SES_FROM_NAME` first, falls back to `SMTP_FROM_NAME`, then default
