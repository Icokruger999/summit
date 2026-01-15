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
    console.log('📧 Testing email sending...');
    console.log(`   To: ${testEmail}`);
    console.log(`   From: ${process.env.SES_FROM_EMAIL || 'info@streamyo.net'}`);
    console.log('');
    
    await sendTempPasswordEmail(
      testEmail,
      'Test User',
      'TEST123456'
    );
    
    console.log('✅ Test email sent successfully!');
    console.log('   Check your inbox (and spam folder) for the email.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Failed to send test email:', error.message);
    console.error('');
    console.error('Common issues:');
    console.error('  1. Email address not verified in AWS SES');
    console.error('  2. AWS credentials not configured');
    console.error('  3. AWS_REGION not set correctly');
    console.error('  4. SES_FROM_EMAIL not verified in SES');
    process.exit(1);
  }
}

testEmail();
