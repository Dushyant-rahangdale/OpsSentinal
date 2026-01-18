/**
 * Password Reset Email Template using OpsKnight Branding
 */

import {
  EmailContainer,
  EmailHeader,
  EmailContent,
  EmailButton,
  AlertBox,
  EmailFooter,
} from '@/lib/email-components';

export interface PasswordResetEmailData {
  userName: string;
  resetLink: string;
  expiryMinutes?: number;
}

/**
 * Password Reset Request Template
 * Professional, secure, and branded template for password reset emails
 */
export function getPasswordResetEmailTemplate(data: PasswordResetEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = '🔐 Reset your OpsKnight password';
  const expiryText = data.expiryMinutes ? `${data.expiryMinutes} minutes` : '1 hour';

  const content = `
        ${EmailHeader('Password Reset Request', 'OpsKnight Account Security')}
        ${EmailContent(`
            <!-- Security Icon -->
            <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 40%, #fca5a5 100%); border-radius: 999px; padding: 16px 24px; margin-bottom: 20px;">
                    <span style="font-size: 42px; filter: drop-shadow(0 2px 4px rgba(211, 47, 47, 0.2));">🔐</span>
                </div>
                <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">
                    Reset Your Password
                </h2>
                <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                    Hello ${data.userName}, we received a request to reset your password.
                </p>
            </div>
            
            <!-- Reset Instructions -->
            <div style="background: linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%); border: 2px solid #fecaca; border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 18px rgba(220, 38, 38, 0.12);">
                <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.7; text-align: center;">
                    Click the button below to create a new password for your account:
                </p>
                
                ${EmailButton('Reset Password →', data.resetLink)}
                
                <p style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #fecaca; color: #9ca3af; font-size: 13px; text-align: center;">
                    ⏱️ This link expires in ${expiryText}
                </p>
            </div>
            
            <!-- Alternative Link -->
            <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; font-weight: 600;">
                    Button not working?
                </p>
                <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.6; word-break: break-all;">
                    Copy and paste this link: <a href="${data.resetLink}" style="color: #d32f2f; text-decoration: none;">${data.resetLink}</a>
                </p>
            </div>
            
            <!-- Security Warning -->
            ${AlertBox(
              '🛡️ Security Notice',
              'If you did not request a password reset, please ignore this email. Your password will remain unchanged. Consider enabling two-factor authentication for added security.',
              'warning'
            )}
            
            <!-- Additional Info -->
            <div style="text-align: center; margin-top: 32px; padding-top: 32px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; font-weight: 600;">
                    Need help with your account?
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                    Contact your administrator or visit our support center.
                </p>
            </div>
        `)}
        ${EmailFooter()}
    `;

  const html = EmailContainer(content);

  const text = `
OpsKnight - Password Reset Request

Hello ${data.userName},

We received a request to reset your password for your OpsKnight account.

To reset your password, visit this link:
${data.resetLink}

This link will expire in ${expiryText}.

SECURITY NOTICE:
If you did not request a password reset, please ignore this email. Your password will remain unchanged.

Need help? Contact your administrator for assistance.

---
This is an automated message from OpsKnight Incident Management.
    `.trim();

  return { subject, html, text };
}
