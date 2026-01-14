// Email service using AWS SES
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import dotenv from 'dotenv';

dotenv.config();

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined, // Use IAM role if credentials not provided (EC2 instance)
});

const FROM_EMAIL = process.env.AWS_SES_FROM_EMAIL || 'noreply@summit.codingeverest.com';

// HTML email template for temporary password
function getTempPasswordEmailTemplate(name: string, tempPassword: string, loginUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Summit</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome to Summit!</h1>
  </div>
  
  <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hello ${name || 'there'},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your Summit account has been created successfully! We've generated a temporary password for you to get started.
    </p>
    
    <div style="background: #f3f4f6; border-left: 4px solid #2563eb; padding: 20px; margin: 30px 0; border-radius: 8px;">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #1f2937;">Your Temporary Password:</p>
      <p style="margin: 0; font-size: 24px; font-weight: 700; color: #2563eb; font-family: 'Courier New', monospace; letter-spacing: 2px;">
        ${tempPassword}
      </p>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>Next Steps:</strong>
    </p>
    <ol style="font-size: 16px; margin-bottom: 30px; padding-left: 20px;">
      <li style="margin-bottom: 10px;">Go to <a href="${loginUrl}" style="color: #2563eb; text-decoration: none;">${loginUrl}</a></li>
      <li style="margin-bottom: 10px;">Sign in with your email and the temporary password above</li>
      <li style="margin-bottom: 10px;">You will be required to create a new password immediately</li>
      <li style="margin-bottom: 10px;">Complete the setup and start using Summit!</li>
    </ol>
    
    <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 8px;">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #92400e;">
        ⚠️ Important: Your account will be automatically deleted if you don't change your password within 24 hours.
      </p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #78350f;">
        Please sign in and create your permanent password as soon as possible.
      </p>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="font-size: 14px; color: #6b7280; margin: 0;">
        If you didn't create this account, please ignore this email.
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} Summit by Coding Everest. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

// Send temporary password email
export async function sendTempPasswordEmail(
  email: string,
  name: string,
  tempPassword: string
): Promise<void> {
  try {
    const loginUrl = process.env.FRONTEND_URL || 'https://summit.codingeverest.com/login';
    const htmlBody = getTempPasswordEmailTemplate(name, tempPassword, loginUrl);
    
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: 'Welcome to Summit - Your Temporary Password',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `
Welcome to Summit!

Hello ${name || 'there'},

Your Summit account has been created successfully! We've generated a temporary password for you to get started.

Your Temporary Password: ${tempPassword}

Next Steps:
1. Go to ${loginUrl}
2. Sign in with your email and the temporary password above
3. You will be required to create a new password immediately
4. Complete the setup and start using Summit!

⚠️ Important: Your account will be automatically deleted if you don't change your password within 24 hours.
Please sign in and create your permanent password as soon as possible.

If you didn't create this account, please ignore this email.

© ${new Date().getFullYear()} Summit by Coding Everest. All rights reserved.
            `.trim(),
            Charset: 'UTF-8',
          },
        },
      },
    });

    const response = await sesClient.send(command);
    console.log('✅ Temp password email sent successfully:', response.MessageId);
  } catch (error: any) {
    console.error('❌ Error sending temp password email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
