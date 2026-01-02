/**
 * Email Notification Service
 * Sends email notifications for incidents
 *
 * Email providers are configured via the UI at Settings → System → Notification Providers
 *
 * To use with Resend (recommended):
 * 1. Install: npm install resend
 * 2. Configure Resend in Settings → System → Notification Providers
 *
 * To use with SendGrid:
 * 1. Install: npm install @sendgrid/mail
 * 2. Configure SendGrid in Settings → System → Notification Providers
 */

import prisma from './prisma';
import { getBaseUrl } from './env-validation';
import { getUserTimeZone, formatDateTime } from './timezone';
import { logger } from './logger';
import {
  EmailButton,
  EmailContainer,
  EmailContent,
  EmailFooter,
  EmailHeader,
  InfoCard,
  StatusBadge,
} from './email-components';

export type EmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type EmailConfig = {
  enabled?: boolean;
  provider?: string;
  source?: string;
  apiKey?: string;
  fromEmail?: string;
  host?: string;
  port?: string | number;
  user?: string;
  password?: string;
  secure?: boolean;
};

/**
 * Send email notification
 * @param options Email options
 * @param providedConfig Optional email config - if provided, uses this instead of fetching from DB
 */
export async function sendEmail(
  options: EmailOptions,
  providedConfig?: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use provided config or get from database
    let emailConfig: EmailConfig;
    if (providedConfig) {
      emailConfig = providedConfig as EmailConfig;
    } else {
      const { getEmailConfig } = await import('./notification-providers');
      emailConfig = (await getEmailConfig()) as EmailConfig;
    }

    // Log email if no provider configured or disabled
    if (!emailConfig.enabled || !emailConfig.provider) {
      logger.warn('Email notification skipped - provider not configured', {
        to: options.to,
        subject: options.subject,
        preview: options.text || options.html.substring(0, 100),
        provider: emailConfig.provider || 'none',
        source: emailConfig.source,
      });

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));

      return { success: true };
    }

    // Production: Use configured provider
    if (emailConfig.provider === 'resend') {
      try {
        // Use runtime require to avoid build-time dependency
        const requireFunc = eval('require') as (id: string) => unknown;
        const { Resend } = requireFunc('resend') as {
          Resend: new (apiKey?: string) => {
            emails: {
              send: (args: {
                from?: string;
                to: string;
                subject: string;
                html: string;
                text?: string;
              }) => Promise<{ error?: { message?: string }; data?: { id?: string } }>;
            };
          };
        };
        const resend = new Resend(emailConfig.apiKey);

        const result = await resend.emails.send({
          from: emailConfig.fromEmail,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        if (result.error) {
          logger.error('Resend email send failed', {
            component: 'email',
            provider: 'resend',
            error: result.error,
            to: options.to,
          });
          return { success: false, error: result.error.message || 'Resend API error' };
        }

        logger.info('Email sent via Resend', { to: options.to, id: result.data?.id });
        return { success: true };
      } catch (error: unknown) {
        // If resend package is not installed, fall back to logger notes
        const err = error as { code?: string; message?: string };
        if (err.code === 'MODULE_NOT_FOUND') {
          logger.warn('Resend package not installed', { installCommand: 'npm install resend' });
          logger.info('Would send via Resend', { to: options.to, from: emailConfig.fromEmail });
          return { success: true };
        }
        logger.error('Resend send error', {
          component: 'email',
          provider: 'resend',
          error,
          to: options.to,
        });
        return { success: false, error: err.message || 'Resend send error' };
      }
    }

    if (emailConfig.provider === 'sendgrid') {
      try {
        // Use runtime require to avoid build-time dependency
        const requireFunc = eval('require') as (id: string) => unknown;
        const sgMail = requireFunc('@sendgrid/mail') as {
          setApiKey: (key: string) => void;
          send: (msg: {
            to: string;
            from: string;
            subject: string;
            html: string;
            text: string;
            trackingSettings?: {
              clickTracking?: { enable: boolean; enableText?: boolean };
              openTracking?: { enable: boolean };
            };
          }) => Promise<
            Array<{ statusCode: number; headers?: Record<string, string>; body?: unknown }>
          >;
        };

        // Validate API key
        if (!emailConfig.apiKey || emailConfig.apiKey.trim() === '') {
          logger.error('SendGrid API key missing', { component: 'email', provider: 'sendgrid' });
          return { success: false, error: 'SendGrid API key is not configured' };
        }

        // Validate from email
        if (!emailConfig.fromEmail || emailConfig.fromEmail.trim() === '') {
          logger.error('SendGrid from email missing', { component: 'email', provider: 'sendgrid' });
          return { success: false, error: 'SendGrid from email is not configured' };
        }

        sgMail.setApiKey(emailConfig.apiKey);

        const result = await sgMail.send({
          to: options.to,
          from: emailConfig.fromEmail,
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
          // Disable click and open tracking for security-critical emails (password resets, etc.)
          // This prevents SendGrid from wrapping URLs with tracking domains
          trackingSettings: {
            clickTracking: { enable: false, enableText: false },
            openTracking: { enable: false },
          },
        });

        // Check response for errors
        const response = result[0];
        if (response) {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            const messageId = response.headers?.['x-message-id'] || 'unknown';
              logger.info('Email sent via SendGrid', {
                to: options.to,
                from: emailConfig.fromEmail,
                subject: options.subject,
                statusCode: response.statusCode,
                messageId: messageId,
                note: 'Check SendGrid Activity Feed for delivery status. If email not received, verify sender email is authenticated in SendGrid.',
              });
            return { success: true };
          } else {
            logger.error('SendGrid returned error status', {
              component: 'email',
              provider: 'sendgrid',
              statusCode: response.statusCode,
              body: response.body,
              to: options.to,
            });
            return {
              success: false,
              error: `SendGrid API returned status ${response.statusCode}: ${JSON.stringify(response.body)}`,
            };
          }
        } else {
          logger.error('SendGrid returned empty response', {
            component: 'email',
            provider: 'sendgrid',
            to: options.to,
          });
          return { success: false, error: 'SendGrid API returned empty response' };
        }
      } catch (error: unknown) {
        // If SendGrid package is not installed, fall back to logger notes
        const err = error as {
          code?: string;
          message?: string;
          response?: { body?: unknown; statusCode?: number; headers?: Record<string, string> };
        };
        if (err.code === 'MODULE_NOT_FOUND') {
          logger.warn('SendGrid package not installed', {
            component: 'email',
            provider: 'sendgrid',
            installCommand: 'npm install @sendgrid/mail',
          });
          return {
            success: false,
            error: 'SendGrid package not installed. Install with: npm install @sendgrid/mail',
          };
        }

        // Log full error details
        logger.error('SendGrid send error', {
          component: 'email',
          provider: 'sendgrid',
          error: err,
          statusCode: err.response?.statusCode,
          to: options.to,
        });

        // Extract error message from SendGrid response if available
        const errorMessage =
          typeof err.response?.body === 'object' &&
          err.response?.body &&
          'errors' in (err.response.body as Record<string, unknown>)
            ? JSON.stringify((err.response.body as Record<string, unknown>).errors)
            : err.message || 'SendGrid API error';

        return { success: false, error: errorMessage };
      }
    }

    if (emailConfig.provider === 'smtp') {
      try {
        // Use runtime require to avoid build-time dependency
        const requireFunc = eval('require') as (id: string) => unknown;
        const nodemailer = requireFunc('nodemailer') as {
          createTransport: (options: Record<string, unknown>) => {
            sendMail: (options: Record<string, unknown>) => Promise<{ messageId?: string }>;
          };
        };

        // Validate required SMTP config
        if (!emailConfig.host || !emailConfig.port || !emailConfig.user || !emailConfig.password) {
          return {
            success: false,
            error:
              'SMTP configuration incomplete. Please configure Host, Port, Username, and Password in Settings → System → Notification Providers',
          };
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
          host: emailConfig.host,
          port: parseInt(emailConfig.port.toString()),
          secure: emailConfig.secure || false, // true for 465, false for other ports
          auth: {
            user: emailConfig.user,
            pass: emailConfig.password,
          },
        });

        // Send email
        const info = await transporter.sendMail({
          from: emailConfig.fromEmail,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        });

        logger.info('Email sent via SMTP', { to: options.to, messageId: info.messageId });
        return { success: true };
      } catch (error: unknown) {
        // If nodemailer package is not installed, fall back to logger notes
        const err = error as { code?: string; message?: string };
        if (err.code === 'MODULE_NOT_FOUND') {
          logger.warn('Nodemailer package not installed', {
            component: 'email',
            provider: 'smtp',
            installCommand: 'npm install nodemailer',
          });
          return {
            success: false,
            error: 'Nodemailer package not installed. Install with: npm install nodemailer',
          };
        }
        logger.error('SMTP send error', {
          component: 'email',
          provider: 'smtp',
          error,
          to: options.to,
        });
        return { success: false, error: err.message || 'SMTP send error' };
      }
    }

    if (emailConfig.provider === 'ses') {
      try {
        // Use runtime require to avoid build-time dependency
        const requireFunc = eval('require') as (id: string) => unknown;
        const { SESClient, SendEmailCommand } = requireFunc('@aws-sdk/client-ses') as {
          SESClient: new (config: Record<string, unknown>) => {
            send: (command: unknown) => Promise<{ MessageId?: string }>;
          };
          SendEmailCommand: new (args: Record<string, unknown>) => unknown;
        };

        // Validate required SES config
        if (!emailConfig.apiKey || !emailConfig.host || !emailConfig.fromEmail) {
          // In our case, apiKey is secretAccessKey and host is region
          return {
            success: false,
            error:
              'Amazon SES configuration incomplete. Please configure Access Key ID, Secret Access Key, and Region in Settings → System → Notification Providers',
          };
        }

        // Get access key ID from config
        const sesClient = new SESClient({
          region: emailConfig.host,
          credentials: {
            accessKeyId: (emailConfig as any).accessKeyId || process.env.AWS_ACCESS_KEY_ID || '', // eslint-disable-line @typescript-eslint/no-explicit-any
            secretAccessKey: emailConfig.apiKey || '',
          },
        });

        const command = new SendEmailCommand({
          Destination: {
            ToAddresses: [options.to],
          },
          Message: {
            Body: {
              Html: {
                Charset: 'UTF-8',
                Data: options.html,
              },
              Text: {
                Charset: 'UTF-8',
                Data: options.text || options.html.replace(/<[^>]*>/g, ''),
              },
            },
            Subject: {
              Charset: 'UTF-8',
              Data: options.subject,
            },
          },
          Source: emailConfig.fromEmail,
        });

        const result = await sesClient.send(command);
        logger.info('Email sent via Amazon SES', { to: options.to, messageId: result.MessageId });
        return { success: true };
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        if (err.code === 'MODULE_NOT_FOUND') {
          logger.warn('AWS SES SDK not installed', {
            component: 'email',
            provider: 'ses',
            installCommand: 'npm install @aws-sdk/client-ses',
          });
          return {
            success: false,
            error:
              'AWS SES SDK package not installed. Install with: npm install @aws-sdk/client-ses',
          };
        }
        logger.error('SES send error', {
          component: 'email',
          provider: 'ses',
          error,
          to: options.to,
        });
        return { success: false, error: err.message || 'SES send error' };
      }
    }

    // No provider configured
    return { success: false, error: 'No email provider configured' };
  } catch (error: unknown) {
    logger.error('Email send error', { component: 'email', error, to: options.to });
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Email send error' };
  }
}

/**
 * Generate email HTML for incident notification
 */
export function generateIncidentEmailHTML(
  incident: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    urgency: string;
    service: { name: string };
    assignee?: { name: string; email: string } | null;
    createdAt: Date;
    acknowledgedAt?: Date | null;
    resolvedAt?: Date | null;
    incidentUrl?: string;
  },
  timeZone: string = 'UTC',
  eventType?: 'triggered' | 'acknowledged' | 'resolved'
): string {
  const baseUrl = getBaseUrl();
  const incidentUrl = incident.incidentUrl || `${baseUrl}/incidents/${incident.id}`;

  const normalizedEventType =
    eventType ||
    (incident.status === 'RESOLVED'
      ? 'resolved'
      : incident.status === 'ACKNOWLEDGED'
        ? 'acknowledged'
        : 'triggered');

  const headerTitle =
    normalizedEventType === 'resolved'
      ? 'Incident Resolved'
      : normalizedEventType === 'acknowledged'
        ? 'Incident Acknowledged'
        : incident.urgency === 'HIGH'
          ? 'Critical Incident Alert'
          : 'Incident Notification';
  const headerSubtitle = `Service: ${incident.service.name}`;

  const updateTitle =
    normalizedEventType === 'resolved'
      ? 'Resolved'
      : normalizedEventType === 'acknowledged'
        ? 'Acknowledged'
        : incident.urgency === 'HIGH'
          ? 'Critical Incident'
          : 'New Incident';
  const updateMessage =
    normalizedEventType === 'resolved'
      ? 'This incident has been resolved. Review the summary and timeline below.'
      : normalizedEventType === 'acknowledged'
        ? 'This incident has been acknowledged and is being actively worked.'
        : 'A new incident has been reported. Review the details and take action.';

  const theme =
    normalizedEventType === 'resolved'
      ? {
          badgeType: 'success' as const,
          accent: '#059669',
          background: '#f0fdf4',
          border: '#d1fae5',
          title: '#064e3b',
          text: '#065f46',
        }
      : normalizedEventType === 'acknowledged'
        ? {
            badgeType: 'warning' as const,
            accent: '#d97706',
            background: '#fffbeb',
            border: '#fde68a',
            title: '#78350f',
            text: '#92400e',
          }
        : incident.urgency === 'HIGH'
          ? {
              badgeType: 'error' as const,
              accent: '#be123c',
              background: '#fef2f2',
              border: '#fecaca',
              title: '#881337',
              text: '#991b1b',
            }
          : {
              badgeType: 'info' as const,
              accent: '#2563eb',
              background: '#eff6ff',
              border: '#bfdbfe',
              title: '#1e3a8a',
              text: '#1d4ed8',
            };

  const formatDuration = (start: Date, end?: Date | null) => {
    if (!end) return 'N/A';
    const diffMs = end.getTime() - start.getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) return 'N/A';
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    return parts.join(' ');
  };

  const infoItems = [
    { label: 'Service', value: incident.service.name, highlight: true },
    { label: 'Status', value: incident.status },
    { label: 'Urgency', value: incident.urgency },
    { label: 'Assignee', value: incident.assignee?.name || 'Unassigned' },
    {
      label: 'Created',
      value: formatDateTime(incident.createdAt, timeZone, { format: 'datetime' }),
    },
  ];

  if (incident.acknowledgedAt) {
    infoItems.push({
      label: 'Acknowledged',
      value: formatDateTime(incident.acknowledgedAt, timeZone, { format: 'datetime' }),
    });
  }

  if (incident.resolvedAt) {
    infoItems.push({
      label: 'Resolved',
      value: formatDateTime(incident.resolvedAt, timeZone, { format: 'datetime' }),
    });
    infoItems.push({
      label: 'Time to Resolve',
      value: formatDuration(incident.createdAt, incident.resolvedAt),
    });
  }

  const content = `
        ${EmailHeader(headerTitle, headerSubtitle)}
        
        ${EmailContent(`
            <div style="text-align: left; margin-bottom: 20px;">
                ${StatusBadge(updateTitle.toUpperCase(), theme.badgeType)}
            </div>

            <div style="background: ${theme.background}; border: 1px solid ${theme.border}; border-left: 4px solid ${theme.accent}; padding: 16px 18px; border-radius: 12px; margin-bottom: 26px;">
                <p style="margin: 0; color: ${theme.title}; font-size: 14px; font-weight: 700;">
                    ${updateTitle}
                </p>
                <p style="margin: 6px 0 0; color: ${theme.text}; font-size: 13px; line-height: 1.6;">
                    ${updateMessage}
                </p>
            </div>

            <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 22px; font-weight: 700; line-height: 1.35;">
                ${incident.title}
            </h2>

            <h3 style="margin: 26px 0 12px 0; color: #111827; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">
                Incident Summary
            </h3>
            ${InfoCard(infoItems)}

            ${
              incident.description
                ? `
            <h3 style="margin: 26px 0 12px 0; color: #111827; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">
                Overview
            </h3>
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px;">
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">
                    ${incident.description}
                </p>
            </div>
            `
                : ''
            }

            ${
              normalizedEventType === 'resolved'
                ? `
            <h3 style="margin: 26px 0 12px 0; color: #111827; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">
                Resolution
            </h3>
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px;">
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.7;">
                    Incident marked resolved${incident.resolvedAt ? ` on ${formatDateTime(incident.resolvedAt, timeZone, { format: 'datetime' })}.` : '.'}
                </p>
            </div>
            `
                : ''
            }

            ${EmailButton(normalizedEventType === 'resolved' ? 'View Resolution' : 'View Incident', incidentUrl)}
        `)}
        
        ${EmailFooter()}
    `;

  return EmailContainer(content);
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
          assignee: true,
        },
      }),
    ]);

    if (!user || !incident) {
      return { success: false, error: 'User or incident not found' };
    }

    const baseUrl = getBaseUrl();
    const incidentUrl = `${baseUrl}/incidents/${incidentId}`;

    const subjectTag =
      eventType === 'resolved'
        ? 'RESOLVED'
        : eventType === 'acknowledged'
          ? 'ACKNOWLEDGED'
          : incident.urgency === 'HIGH'
            ? 'CRITICAL'
            : 'NEW';
    const subject = `[${subjectTag}] ${incident.title}`;
    const userTimeZone = getUserTimeZone(user ?? undefined);
    const html = generateIncidentEmailHTML(
      {
        ...incident,
        incidentUrl,
      },
      userTimeZone,
      eventType
    );

    return await sendEmail({
      to: user.email,
      subject,
      html,
      text: `${incident.title}\n\nService: ${incident.service.name}\nStatus: ${incident.status}\nUrgency: ${incident.urgency}\n\n${subjectTag} update. View: ${incidentUrl}`,
    });
  } catch (error: unknown) {
    logger.error('Send incident email error', {
      component: 'email',
      error,
      incidentId,
      userId,
      eventType,
    });
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Send incident email error' };
  }
}
