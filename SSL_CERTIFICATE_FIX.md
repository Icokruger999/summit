# Fixing SSL Certificate Error: ERR_SSL_VERSION_OR_CIPHER_MISMATCH

## Error
```
summit.codingeverest.com uses an unsupported protocol.
ERR_SSL_VERSION_OR_CIPHER_MISMATCH
```

## Cause
This error occurs when the SSL/TLS certificate for `summit.codingeverest.com` is not properly configured in AWS Amplify or the domain is not correctly connected.

## Solution Steps

### Option 1: Verify Domain in AWS Amplify Console (Recommended)

1. **Go to AWS Amplify Console**
   - Navigate to: https://console.aws.amazon.com/amplify/
   - Select your Summit app

2. **Check Domain Management**
   - Click on your app
   - Go to "Domain management" in the left sidebar
   - Check if `summit.codingeverest.com` is listed

3. **Add Domain (if not present)**
   - Click "Add domain"
   - Enter: `summit.codingeverest.com`
   - Choose "Subdomain" if `codingeverest.com` is your root domain
   - Or choose "Domain" if you have the full domain

4. **Verify DNS Records**
   - Amplify will provide DNS records (CNAME or A records)
   - Go to your DNS provider (Route 53, Cloudflare, etc.)
   - Add the DNS records Amplify provides
   - Wait 24-48 hours for DNS propagation and certificate provisioning

5. **Check Certificate Status**
   - In Domain management, check certificate status
   - Should show "Available" or "Pending validation"
   - If "Failed", check DNS records are correct

### Option 2: Use Amplify Default Domain (Quick Test)

If you need immediate access while fixing the custom domain:

1. **Get Amplify Default Domain**
   - In Amplify Console → Your App → General
   - Find "Default domain" (e.g., `xxxxx.amplifyapp.com`)
   - Use this domain temporarily
   - SSL certificate is automatically provisioned

2. **Update Frontend Configuration (if needed)**
   - Check if any hardcoded domains in code
   - Update environment variables if necessary

### Option 3: Verify DNS Configuration

If domain is added but SSL fails:

1. **Check DNS Records**
   ```bash
   # Check CNAME record
   nslookup summit.codingeverest.com
   
   # Should point to Amplify domain (e.g., xxxxx.amplifyapp.com)
   ```

2. **Verify Record Types**
   - **CNAME**: `summit.codingeverest.com` → `xxxxx.amplifyapp.com`
   - **A Record**: Should point to Amplify's IP (if using A records)

3. **Check DNS Propagation**
   - Use: https://www.whatsmydns.net/
   - Enter: `summit.codingeverest.com`
   - Verify records match Amplify's requirements

### Option 4: Request New Certificate

If certificate provisioning failed:

1. **Remove Domain in Amplify**
   - Domain management → Remove `summit.codingeverest.com`

2. **Re-add Domain**
   - Add domain again
   - Verify DNS records
   - Wait for certificate provisioning (can take 1-2 hours)

3. **Check AWS Certificate Manager (ACM)**
   - Go to: https://console.aws.amazon.com/acm/
   - Look for certificate for `summit.codingeverest.com`
   - Check status and validation

### Option 5: Manual Certificate (Not Recommended)

If automatic provisioning doesn't work:

1. **Request Certificate in ACM**
   - AWS Certificate Manager → Request certificate
   - Add domain: `summit.codingeverest.com`
   - Use DNS validation
   - Add validation records to DNS

2. **Configure in Amplify**
   - Once validated, certificate should appear in Amplify domain management
   - Select the certificate
   - Complete domain setup

## Quick Diagnostic Commands

### Check DNS Records
```bash
# Windows PowerShell
Resolve-DnsName summit.codingeverest.com -Type CNAME

# Linux/Mac
dig summit.codingeverest.com CNAME
nslookup summit.codingeverest.com
```

### Test SSL Certificate
```bash
# Check SSL certificate
openssl s_client -connect summit.codingeverest.com:443 -servername summit.codingeverest.com

# Or use online tool
# https://www.ssllabs.com/ssltest/analyze.html?d=summit.codingeverest.com
```

### Test Connection
```bash
# Test HTTPS connection
curl -I https://summit.codingeverest.com

# Check SSL/TLS version
openssl s_client -connect summit.codingeverest.com:443 -tls1_2
```

## Common Issues

### Issue 1: Domain Not Added to Amplify
**Solution**: Add domain in Amplify Console → Domain management

### Issue 2: DNS Records Not Configured
**Solution**: Add CNAME record pointing to Amplify domain

### Issue 3: Certificate Still Provisioning
**Solution**: Wait 1-2 hours, check status in Amplify Console

### Issue 4: Certificate Validation Failed
**Solution**: Check DNS records match exactly what Amplify requires

### Issue 5: Mixed Content (HTTP/HTTPS)
**Solution**: Ensure all resources use HTTPS, check browser console

## Verification Checklist

- [ ] Domain added in Amplify Console
- [ ] DNS records configured correctly
- [ ] Certificate status shows "Available" or "Pending"
- [ ] DNS propagation completed (24-48 hours)
- [ ] No CORS or mixed content errors
- [ ] Browser cache cleared (try incognito mode)

## Expected Timeline

- **DNS Propagation**: 1-24 hours (usually < 1 hour)
- **Certificate Provisioning**: 1-2 hours (usually < 30 minutes)
- **Total Setup Time**: 2-48 hours (usually 1-2 hours)

## Next Steps

1. **Check Amplify Console** for domain status
2. **Verify DNS records** match Amplify requirements
3. **Wait for certificate** to be provisioned (if pending)
4. **Test in browser** after certificate is available
5. **Clear browser cache** if issues persist

## Important Notes

- Amplify automatically provisions SSL certificates via AWS Certificate Manager (ACM)
- Certificates are free and auto-renewed
- DNS changes can take up to 48 hours to propagate globally
- Always use HTTPS in production (Amplify enforces this)

## Contact Points

If issues persist:
1. Check AWS Amplify documentation
2. Check AWS Certificate Manager (ACM) for certificate status
3. Verify DNS provider settings
4. Check AWS Support if certificate provisioning keeps failing

