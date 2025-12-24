/**
 * Email Notification Service
 * Sends email notifications for incidents
 * 
 * To use with Resend (recommended):
 * 1. Install: npm install resend
 * 2. Set RESEND_API_KEY in .env
 * 3. Uncomment the Resend implementation below
 * 
 * To use with SendGrid:
 * 1. Install: npm install @sendgrid/mail
 * 2. Set SENDGRID_API_KEY in .env
 * 3. Use SendGrid implementation
 */

import prisma from './prisma';
import { getEmailConfig } from './notification-providers';
import { getBaseUrl } from './env-validation';

export type EmailOptions = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

/**
 * Send email notification
 * Currently uses console.log for development
 * Replace with actual email service in production
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
        // Get email configuration (database first, then env vars)
        const { getEmailConfig } = await import('./notification-providers');
        const emailConfig = await getEmailConfig();

        // Development: Log email instead of sending if no provider configured
        if (process.env.NODE_ENV === 'development' || !emailConfig.enabled) {
            console.log('Email Notification:', {
                to: options.to,
                subject: options.subject,
                preview: options.text || options.html.substring(0, 100),
                provider: emailConfig.provider,
                source: emailConfig.source
            });

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 100));

            return { success: true };
        }

        // Production: Use configured provider
        if (emailConfig.provider === 'resend') {
            try {
                // Use runtime require to avoid build-time dependency
                const requireFunc = eval('require') as (id: string) => any;
                const { Resend } = requireFunc('resend');
                const resend = new Resend(emailConfig.apiKey);

                const result = await resend.emails.send({
                    from: emailConfig.fromEmail,
                    to: options.to,
                    subject: options.subject,
                    html: options.html,
                    text: options.text,
                });

                if (result.error) {
                    console.error('Resend error:', result.error);
                    return { success: false, error: result.error.message || 'Resend API error' };
                }

                console.log('Email sent via Resend:', { to: options.to, id: result.data?.id });
                return { success: true };
            } catch (error: any) {
                // If resend package is not installed, fall back to console log
                if (error.code === 'MODULE_NOT_FOUND') {
                    console.log('Resend package not installed. Install with: npm install resend');
                    console.log('Would send via Resend:', { to: options.to, from: emailConfig.fromEmail });
                    return { success: true };
                }
                console.error('Resend send error:', error);
                return { success: false, error: error.message };
            }
        }

        if (emailConfig.provider === 'sendgrid') {
            // TODO: Implement SendGrid when npm package is installed
            // const sgMail = require('@sendgrid/mail');
            // sgMail.setApiKey(emailConfig.apiKey);
            // await sgMail.send({...});
            console.log('Would send via SendGrid:', { to: options.to, from: emailConfig.fromEmail });
            return { success: true };
        }

        if (emailConfig.provider === 'smtp') {
            // TODO: Implement SMTP when nodemailer is installed
            // const nodemailer = require('nodemailer');
            // const transporter = nodemailer.createTransport({...});
            // await transporter.sendMail({...});
            console.log('Would send via SMTP:', { to: options.to, from: emailConfig.fromEmail, host: emailConfig.host });
            return { success: true };
        }

        // No provider configured
        return { success: false, error: 'No email provider configured' };
    } catch (error: any) {
        console.error('Email send error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate email HTML for incident notification
 */
export function generateIncidentEmailHTML(incident: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    urgency: string;
    service: { name: string };
    assignee?: { name: string; email: string } | null;
    createdAt: Date;
    incidentUrl?: string;
}): string {
    const baseUrl = getBaseUrl();
    const incidentUrl = incident.incidentUrl || `${baseUrl}/incidents/${incident.id}`;
    const urgencyColor = incident.urgency === 'HIGH' ? '#ef4444' : '#f59e0b';
    const statusColor = incident.status === 'RESOLVED' ? '#10b981' :
        incident.status === 'ACKNOWLEDGED' ? '#3b82f6' : '#ef4444';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${incident.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${incident.title}</h1>
    </div>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px 0; font-weight: 600; width: 120px;">Service:</td>
                <td style="padding: 8px 0;">${incident.service.name}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; font-weight: 600;">Status:</td>
                <td style="padding: 8px 0;">
                    <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                        ${incident.status}
                    </span>
                </td>
            </tr>
            <tr>
                <td style="padding: 8px 0; font-weight: 600;">Urgency:</td>
                <td style="padding: 8px 0;">
                    <span style="background: ${urgencyColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                        ${incident.urgency}
                    </span>
                </td>
            </tr>
            ${incident.assignee ? `
            <tr>
                <td style="padding: 8px 0; font-weight: 600;">Assignee:</td>
                <td style="padding: 8px 0;">${incident.assignee.name}</td>
            </tr>
            ` : ''}
            <tr>
                <td style="padding: 8px 0; font-weight: 600;">Created:</td>
                <td style="padding: 8px 0;">${incident.createdAt.toLocaleString()}</td>
            </tr>
        </table>
    </div>
    
    ${incident.description ? `
    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #1f2937;">Description</h3>
        <p style="color: #4b5563; white-space: pre-wrap;">${incident.description}</p>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="${incidentUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Incident
        </a>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
        <p>This is an automated notification from OpsGuard Incident Management System.</p>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Send incident notification email
 */
export async function sendIncidentEmail(
    userId: string,
    incidentId: string,
    eventType: 'triggered' | 'acknowledged' | 'resolved'
): Promise<{ success: boolean; error?: string }> {
    try {
        const [user, incident] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId } }),
            prisma.incident.findUnique({
                where: { id: incidentId },
                include: {
                    service: true,
                    assignee: true
                }
            })
        ]);

        if (!user || !incident) {
            return { success: false, error: 'User or incident not found' };
        }

        const baseUrl = getBaseUrl();
        const incidentUrl = `${baseUrl}/incidents/${incidentId}`;

        const subject = `[${incident.urgency === 'HIGH' ? 'CRITICAL' : 'INFO'}] ${incident.title}`;
        const html = generateIncidentEmailHTML({
            ...incident,
            incidentUrl
        });

        return await sendEmail({
            to: user.email,
            subject,
            html,
            text: `${incident.title}\n\nService: ${incident.service.name}\nStatus: ${incident.status}\nUrgency: ${incident.urgency}\n\nView: ${incidentUrl}`
        });
    } catch (error: any) {
        console.error('Send incident email error:', error);
        return { success: false, error: error.message };
    }
}
