# SMTP Email Setup - Complete Guide

## ✅ Switched from AWS SES to SMTP

We've switched from AWS SES to SMTP (PrivateEmail.com) to simplify setup and avoid IAM role changes.

## Configuration

### Environment Variables

Add these to `/var/www/summit/server/.env`:

```bash
# SMTP Configuration (PrivateEmail.com)
SMTP_HOST=mail.privateemail.com
SMTP_PORT=587
SMTP_EMAIL=info@streamyo.net
SMTP_PASSWORD=your-smtp-password-here
SMTP_FROM_NAME=Summit

# Frontend URL (for email links)
FRONTEND_URL=https://summit.codingeverest.com
```

### SMTP Settings

- **Host:** `mail.privateemail.com`
- **Port:** `587` (TLS/STARTTLS)
- **Email:** `info@streamyo.net`
- **From Name:** `Summit`
- **Security:** TLS enabled (STARTTLS)

## Benefits of SMTP

✅ **No IAM role changes needed** - Works immediately
✅ **Simpler setup** - Just add SMTP credentials
✅ **Already have account** - Using existing PrivateEmail.com
✅ **No AWS dependencies** - Independent email service
✅ **Same email template** - Beautiful HTML emails maintained

## Deployment Steps

1. **Install nodemailer:**
   ```bash
   cd /var/www/summit/server
   npm install nodemailer@^6.9.8
   npm install --save-dev @types/nodemailer@^6.4.14
   ```

2. **Update .env file** with SMTP credentials

3. **Rebuild and restart:**
   ```bash
   npm run build
   pm2 restart summit-backend
   ```

## Testing

After deployment, test the signup flow:
1. Go to signup page
2. Create account
3. Check email inbox for temp password
4. Verify email formatting and links work

## Email Template

The email includes:
- Beautiful HTML design
- Plain text alternative
- Temporary password (highlighted)
- Step-by-step instructions
- 24-hour deletion warning
- Login URL link

## Troubleshooting

**Email not sending:**
- Check SMTP credentials in `.env`
- Verify SMTP_HOST and SMTP_PORT are correct
- Check server logs: `pm2 logs summit-backend`
- Test SMTP connection manually

**Connection errors:**
- Verify firewall allows port 587
- Check SMTP credentials are correct
- Ensure TLS/STARTTLS is enabled (port 587)

**Email in spam:**
- Check SPF/DKIM records for streamyo.net domain
- Verify FROM email matches SMTP account
- Consider adding SPF record: `v=spf1 include:privateemail.com ~all`

## Security Notes

- SMTP password stored in `.env` file (not in Git)
- TLS/STARTTLS encryption enabled
- Consider using environment variables or secrets manager for production
- Password should be strong and unique

## Migration from AWS SES

- ✅ Removed `@aws-sdk/client-ses` dependency
- ✅ Added `nodemailer` for SMTP
- ✅ Updated email service to use SMTP
- ✅ Maintained same email template
- ✅ No IAM role changes needed

---

**Status:** Ready to deploy
**Next:** Update .env with SMTP credentials and deploy
