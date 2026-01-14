// Email service using SMTP (PrivateEmail.com)
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// SMTP configuration
const smtpConfig = {
  host: process.env.SMTP_HOST || 'mail.privateemail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports (587 uses STARTTLS)
  auth: {
    user: process.env.SMTP_USER || process.env.SMTP_EMAIL || 'info@streamyo.net',
    pass: process.env.SMTP_PASSWORD || '',
  },
  tls: {
    // Do not fail on invalid certificates
    rejectUnauthorized: false,
  },
};

// Create transporter
const transporter = nodemailer.createTransport(smtpConfig);

// Verify SMTP connection on startup
transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP connection error:', error);
  } else {
    console.log('✅ SMTP server is ready to send emails');
  }
});

const FROM_EMAIL = process.env.SMTP_EMAIL || process.env.SMTP_USER || 'info@streamyo.net';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Summit';

// Beautiful HTML email template for temporary password
function getTempPasswordEmailTemplate(name: string, tempPassword: string, loginUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to Summit - Your Account is Ready!</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: #ffffff; border-radius: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15); overflow: hidden;">
          
          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 40px; text-align: center;">
              <div style="margin-bottom: 20px;">
                <div style="width: 80px; height: 80px; background: rgba(255, 255, 255, 0.2); border-radius: 50%; margin: 0 auto 20px; display: inline-block; line-height: 80px; font-size: 40px;">🎉</div>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">Welcome to Summit!</h1>
              <p style="margin: 15px 0 0; color: rgba(255, 255, 255, 0.95); font-size: 18px; font-weight: 300;">Your account is ready to go</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              <!-- Greeting -->
              <p style="margin: 0 0 25px; color: #1f2937; font-size: 18px; line-height: 1.6;">
                Hello <strong style="color: #667eea;">${name || 'there'}</strong>! 👋
              </p>
              
              <p style="margin: 0 0 35px; color: #4b5563; font-size: 16px; line-height: 1.7;">
                We're thrilled to have you join Summit! Your account has been created successfully. 
                We've generated a secure temporary password for you to get started right away.
              </p>
              
              <!-- Password Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 35px 0; background: linear-gradient(135deg, #f6f8fb 0%, #ffffff 100%); border-radius: 16px; border: 2px solid #e5e7eb; overflow: hidden;">
                <tr>
                  <td style="padding: 30px; text-align: center;">
                    <div style="margin-bottom: 15px;">
                      <span style="display: inline-block; width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; line-height: 50px; font-size: 24px;">🔐</span>
                    </div>
                    <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Temporary Password</p>
                    <div style="background: #ffffff; border: 2px dashed #667eea; border-radius: 12px; padding: 20px; margin: 15px 0;">
                      <p style="margin: 0; font-size: 32px; font-weight: 700; color: #667eea; font-family: 'Courier New', 'Monaco', monospace; letter-spacing: 4px; word-break: break-all; line-height: 1.2;">
                        ${tempPassword}
                      </p>
                    </div>
                    <p style="margin: 15px 0 0; color: #9ca3af; font-size: 13px;">Keep this password safe until you log in</p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 35px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                      🚀 Sign In to Summit
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Steps -->
              <div style="margin: 40px 0; padding: 30px; background: #f9fafb; border-radius: 16px; border-left: 4px solid #667eea;">
                <p style="margin: 0 0 20px; color: #1f2937; font-size: 18px; font-weight: 600;">
                  📋 Next Steps:
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 12px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                      <span style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 700; font-size: 14px; margin-right: 12px; vertical-align: middle;">1</span>
                      Click the button above or visit <a href="${loginUrl}" style="color: #667eea; text-decoration: none; font-weight: 600;">${loginUrl}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                      <span style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 700; font-size: 14px; margin-right: 12px; vertical-align: middle;">2</span>
                      Sign in with your email and the temporary password
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                      <span style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 700; font-size: 14px; margin-right: 12px; vertical-align: middle;">3</span>
                      Create your permanent password (required for security)
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                      <span style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 700; font-size: 14px; margin-right: 12px; vertical-align: middle;">4</span>
                      Complete setup and start using Summit!
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Warning Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 35px 0; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; border: 2px solid #f59e0b; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <div style="display: flex; align-items: flex-start;">
                      <div style="font-size: 32px; margin-right: 15px; line-height: 1;">⚠️</div>
                      <div>
                        <p style="margin: 0 0 8px; color: #92400e; font-size: 16px; font-weight: 700;">
                          Important Security Notice
                        </p>
                        <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                          Your account will be <strong>automatically deleted</strong> if you don't change your password within <strong>24 hours</strong>. Please sign in and create your permanent password as soon as possible.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <div style="margin: 40px 0; height: 1px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent);"></div>
              
              <!-- Footer Note -->
              <p style="margin: 0; color: #9ca3af; font-size: 13px; text-align: center; line-height: 1.6;">
                If you didn't create this account, please ignore this email or contact our support team.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; font-weight: 600;">Summit by Coding Everest</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Coding Everest. All rights reserved.
              </p>
              <p style="margin: 15px 0 0; color: #9ca3af; font-size: 11px;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Plain text version for email clients that don't support HTML
function getTempPasswordEmailText(name: string, tempPassword: string, loginUrl: string): string {
  return `
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
    const textBody = getTempPasswordEmailText(name, tempPassword, loginUrl);

    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: 'Welcome to Summit - Your Temporary Password',
      text: textBody,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Temp password email sent successfully:', info.messageId);
    console.log('   To:', email);
  } catch (error: any) {
    console.error('❌ Error sending temp password email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
