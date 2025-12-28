import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { getStatusPageEmailConfig } from '@/lib/notification-providers';
import { logger } from '@/lib/logger';
import {
    EmailContainer,
    EmailContent,
    SubscriberEmailHeader,
    SubscriberEmailFooter,
    EmailButton
} from '@/lib/email-components';

export async function notifyStatusPageSubscribers(
    incidentId: string,
    eventType: 'check' | 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'scheduled' | 'inprogress' | 'completed' | 'triggered' | 'acknowledged'
) {
    try {
        // 1. Get incident details with service
        const incident = await prisma.incident.findUnique({
            where: { id: incidentId },
            include: {
                service: true
            }
        });

        if (!incident) {
            logger.error(`Incident ${incidentId} not found for status page notifications`);
            return;
        }

        // 2. Find all status pages that include this service
        const statusPages = await prisma.statusPage.findMany({
            where: {
                enabled: true,
                services: {
                    some: {
                        serviceId: incident.serviceId,
                        showOnPage: true
                    }
                }
            },
            include: {
                subscriptions: {
                    where: {
                        verified: true,
                        unsubscribedAt: null
                    }
                }
            }
        });

        if (statusPages.length === 0) {
            logger.info(`No status pages found displaying service ${incident.serviceId} for incident ${incidentId}`);
            return; // No status pages configured for this service
        }

        logger.info(`Found ${statusPages.length} status pages for incident ${incidentId}`);

        // 3. Send notifications for each status page
        for (const page of statusPages) {
            if (page.subscriptions.length === 0) continue;

            // Get email config for this status page
            const emailConfig = await getStatusPageEmailConfig(page.id);
            if (!emailConfig.enabled) {
                logger.warn(`Email not configured for status page ${page.name} (${page.id})`);
                continue;
            }

            // Prepare email content
            // Prepare email content
            const displayName = (page as any).organizationName || page.name;
            const subject = formatSubject(displayName, incident.title, eventType);
            const html = formatEmailBody(displayName, incident, eventType, page.contactUrl || '#');

            // Send to all subscribers
            logger.info(`Sending notifications to ${page.subscriptions.length} subscribers for page ${page.name}`);

            const results = await Promise.allSettled(
                page.subscriptions.map(sub =>
                    sendEmail({
                        to: sub.email,
                        subject,
                        html: html.replace('{{unsubscribe_url}}', `${process.env.NEXT_PUBLIC_APP_URL}/status/unsubscribe/${sub.token}`)
                    }, {
                        source: `status-page-${page.id}`,
                        ...emailConfig
                    })
                )
            );

            const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

            logger.info(`Status page notifications sent: ${sent} success, ${failed} failed`);
        }

    } catch (error) {
        logger.error('Failed to notify status page subscribers', {
            error: error instanceof Error ? error.message : 'Unknown error',
            incidentId
        });
    }
}

function formatSubject(pageName: string, incidentTitle: string, eventType: string): string {
    const prefix = `[${pageName}]`;
    const statusMap: Record<string, string> = {
        'triggered': 'New Incident',
        'acknowledged': 'Investigating',
        'resolved': 'Resolved',
        'investigating': 'Investigating',
        'identified': 'Identified',
        'monitoring': 'Monitoring',
        'completed': 'Completed'
    };

    return `${prefix} ${statusMap[eventType] || 'Update'}: ${incidentTitle}`;
}


function formatEmailBody(pageName: string, incident: any, eventType: string, contactUrl: string): string {
    const statusMap: Record<string, { label: string; badge: 'success' | 'warning' | 'error' | 'info' }> = {
        'triggered': { label: 'New Incident', badge: 'error' },
        'acknowledged': { label: 'Investigating', badge: 'warning' },
        'resolved': { label: 'Resolved', badge: 'success' },
        'investigating': { label: 'Investigating', badge: 'warning' },
        'identified': { label: 'Identified', badge: 'warning' },
        'monitoring': { label: 'Monitoring', badge: 'info' },
        'completed': { label: 'Maintenance Completed', badge: 'success' },
        'scheduled': { label: 'Maintenance Scheduled', badge: 'info' },
        'inprogress': { label: 'In Progress', badge: 'warning' }
    };

    const statusInfo = statusMap[eventType] || { label: 'Update', badge: 'info' };

    // Build the email content using components
    const headerGradients: Record<string, string> = {
        success: 'linear-gradient(135deg, #166534 0%, #16a34a 45%, #22c55e 100%)',
        warning: 'linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)',
        error: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #dc2626 100%)',
        info: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)'
    };

    const header = SubscriberEmailHeader(pageName, statusInfo.label, incident.title, {
        headerGradient: headerGradients[statusInfo.badge] || headerGradients.info
    });

    // Main content body
    let contentBody = `
        <div style="margin-bottom: 24px;">
            <p style="font-size: 16px; color: #4b5563; margin-bottom: 8px; font-weight: 500;">
                Affecting Service:
            </p>
            <h2 style="font-size: 20px; color: #1f2937; margin: 0; font-weight: 700;">
                ${incident.service.name}
            </h2>
        </div>

        <div style="background: #f9fafb; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb; margin-bottom: 32px;">
            <h3 style="font-size: 14px; text-transform: uppercase; color: #6b7280; margin: 0 0 12px 0; letter-spacing: 0.05em; font-weight: 600;">
                Update Details
            </h3>
            <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0; white-space: pre-wrap;">
                ${incident.description || 'No additional details provided.'}
            </p>
            <p style="font-size: 14px; color: #9ca3af; margin-top: 16px; font-style: italic;">
                Posted on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
        </div>
    `;

    // Add CTA Button
    // We assume the contactUrl is the status page URL, or we should construct it. 
    // Ideally we pass the status page URL, but contactUrl is often "mailto:" or "support page".
    // For now, let's use contactUrl if it's a web link, otherwise hide button or use generic text.
    if (contactUrl && contactUrl.startsWith('http')) {
        contentBody += EmailButton('View Status Page', contactUrl);
        contentBody += `
        <div style="text-align: center; margin-top: 24px;">
            <a href="${contactUrl}" style="color: #6b7280; font-size: 14px; text-decoration: none;">Contact Support</a>
        </div>`;
    } else {
        // Fallback if no valid URL for button
        contentBody += `
        <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <a href="${contactUrl}" style="color: #d32f2f; font-weight: 600; text-decoration: none;">Contact Support</a>
        </div>`;
    }

    const body = EmailContent(contentBody);

    // We need to inject the unsubscribe URL at send time, so we keep the placeholder
    const footer = SubscriberEmailFooter('{{unsubscribe_url}}', pageName);

    return EmailContainer(header + body + footer);
}

export async function notifyStatusPageSubscribersAnnouncement(
    announcementId: string,
    statusPageId: string
) {
    try {
        // 1. Get announcement details
        const announcement = await prisma.statusPageAnnouncement.findUnique({
            where: { id: announcementId }
        });

        if (!announcement) {
            logger.error(`Announcement ${announcementId} not found for status page notifications`);
            return;
        }

        // 2. Get status page with subscribers
        const page = await prisma.statusPage.findUnique({
            where: { id: statusPageId },
            include: {
                subscriptions: {
                    where: {
                        verified: true,
                        unsubscribedAt: null
                    }
                }
            }
        });

        if (!page) {
            logger.error(`Status page ${statusPageId} not found for announcement notifications`);
            return;
        }

        if (page.subscriptions.length === 0) {
            logger.info(`No subscribers found for status page ${page.name}`);
            return;
        }

        // 3. Get email config
        const emailConfig = await getStatusPageEmailConfig(page.id);
        if (!emailConfig.enabled) {
            logger.warn(`Email not configured for status page ${page.name} (${page.id})`);
            return;
        }

        // 4. Prepare email content
        // 4. Prepare email content
        const displayName = (page as any).organizationName || page.name;

        // Define theme based on announcement type
        const themes: Record<string, { label: string; color: string; bg: string; borderColor: string }> = {
            'INCIDENT': { label: 'Incident', color: '#dc2626', bg: '#fef2f2', borderColor: '#fecaca' },
            'MAINTENANCE': { label: 'Maintenance', color: '#2563eb', bg: '#eff6ff', borderColor: '#bfdbfe' },
            'UPDATE': { label: 'Update', color: '#059669', bg: '#ecfdf5', borderColor: '#a7f3d0' },
            'WARNING': { label: 'Warning', color: '#d97706', bg: '#fffbeb', borderColor: '#fde68a' },
            'INFO': { label: 'Information', color: '#4b5563', bg: '#f9fafb', borderColor: '#e5e7eb' }
        };

        const theme = themes[announcement.type as string] || themes['INFO'];
        const subject = `[${displayName}] ${theme.label}: ${announcement.title}`;

        let html = '';

        // Build the email content using components
        // We pass the theme label (e.g., "Maintenance") as the badge text
        const announcementHeader = SubscriberEmailHeader(displayName, theme.label, announcement.title, {
            headerGradient: announcement.type === 'INCIDENT'
                ? 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #dc2626 100%)'
                : announcement.type === 'MAINTENANCE'
                    ? 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)'
                    : announcement.type === 'UPDATE'
                        ? 'linear-gradient(135deg, #166534 0%, #16a34a 45%, #22c55e 100%)'
                        : announcement.type === 'WARNING'
                            ? 'linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)'
                            : 'linear-gradient(135deg, #8b1a1a 0%, #b91c1c 40%, #c92a2a 70%, #dc2626 100%)'
        });

        // Main content body with themed styles
        const contentBody = `
            <div style="background: ${theme.bg}; border-radius: 12px; padding: 24px; border: 1px solid ${theme.borderColor}; margin-bottom: 32px;">
                <h3 style="font-size: 14px; text-transform: uppercase; color: ${theme.color}; margin: 0 0 12px 0; letter-spacing: 0.05em; font-weight: 700;">
                    ${theme.label} Details
                </h3>
                <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0; white-space: pre-wrap;">
                    ${announcement.message}
                </p>
                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid ${theme.borderColor}; display: flex; gap: 24px; color: #6b7280; font-size: 14px;">
                    <div>
                        <span style="font-weight: 600; color: ${theme.color};">Start:</span> ${new Date(announcement.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    ${announcement.endDate ? `
                    <div>
                        <span style="font-weight: 600; color: ${theme.color};">End:</span> ${new Date(announcement.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    ` : ''}
                </div>
                <p style="font-size: 14px; color: #9ca3af; margin-top: 16px; font-style: italic;">
                    Posted on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
            </div>
            <div style="text-align: center; margin-top: 32px;">
                <a href="${page.contactUrl || '#'}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">View Status Page</a>
            </div>
        `;

        const body = EmailContent(contentBody);
        const footer = SubscriberEmailFooter('{{unsubscribe_url}}', displayName);

        html = EmailContainer(announcementHeader + body + footer);

        // 5. Send to all subscribers
        logger.info(`Sending announcement notifications to ${page.subscriptions.length} subscribers for page ${page.name}`);

        const results = await Promise.allSettled(
            page.subscriptions.map(sub =>
                sendEmail({
                    to: sub.email,
                    subject,
                    html: html.replace('{{unsubscribe_url}}', `${process.env.NEXT_PUBLIC_APP_URL}/status/unsubscribe/${sub.token}`)
                }, {
                    source: `status-page-${page.id}`,
                    ...emailConfig
                })
            )
        );

        const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

        logger.info(`Status announcement notifications sent: ${sent} success, ${failed} failed`);

    } catch (error) {
        logger.error('Failed to notify status page subscribers about announcement', {
            error: error instanceof Error ? error.message : 'Unknown error',
            announcementId
        });
    }
}
