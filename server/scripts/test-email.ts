import { sendTempPasswordEmail } from '../src/lib/email.js';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  const testEmail = process.argv[2];
  
  if (!testEmail) {
    console.log('Usage: npx tsx scripts/test-email.ts <email>');
    console.log('Example: npx tsx scripts/test-email.ts your-email@example.com');
    process.exit(1);
  }

  try {
    console.log('📧 Testing email sending via SMTP (Namecheap Private Email)...');
    console.log(`   To: ${testEmail}`);
    console.log(`   From: ${process.env.SMTP_FROM_EMAIL || process.env.SES_FROM_EMAIL || 'info@streamyo.net'}`);
    console.log(`   SMTP Host: ${process.env.SMTP_HOST || 'NOT SET'}`);
    console.log(`   SMTP Port: ${process.env.SMTP_PORT || '587'}`);
    console.log('');
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('❌ SMTP not configured!');
      console.error('   Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
      process.exit(1);
    }
    
    await sendTempPasswordEmail(
      testEmail,
      'Test User',
      'TEST123456'
    );
    
    console.log('✅ Test email sent successfully via SMTP!');
    console.log('   Check your inbox (and spam folder) for the email.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Failed to send test email:', error.message);
    console.error('');
    console.error('Common issues:');
    console.error('  1. SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)');
    console.error('  2. SMTP server connection failed');
    console.error('  3. Authentication failed (wrong username/password)');
    console.error('  4. Firewall blocking SMTP port');
    process.exit(1);
  }
}

testEmail();
