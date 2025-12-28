/**
 * WhatsApp Integration via Twilio
 * Sends WhatsApp notifications for incidents
 */

import prisma from './prisma';
import { logger } from './logger';
import { getBaseUrl } from './env-validation';
import { getWhatsAppConfig } from './notification-providers';

export type WhatsAppOptions = {
    userId: string;
    incidentId: string;
    eventType: 'triggered' | 'acknowledged' | 'resolved';
};

const normalizeWhatsAppNumber = (value: string) => value.replace(/^whatsapp:/i, '');

/**
 * Send WhatsApp notification for an incident
 * Uses Twilio WhatsApp API (format: whatsapp:+1234567890)
 */
export async function sendIncidentWhatsApp(
    userId: string,
    incidentId: string,
    eventType: 'triggered' | 'acknowledged' | 'resolved'
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get user and incident
        const [user, incident] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { phoneNumber: true, name: true }
            }),
            prisma.incident.findUnique({
                where: { id: incidentId },
                include: { service: true, assignee: true }
            })
        ]);

        if (!user || !incident) {
            return { success: false, error: 'User or incident not found' };
        }

        if (!user.phoneNumber) {
            return { success: false, error: 'User has no phone number configured' };
        }

        // Get WhatsApp config (independent of Twilio SMS)
        const whatsappConfig = await getWhatsAppConfig();
        if (!whatsappConfig.enabled || whatsappConfig.provider !== 'twilio') {
            return { success: false, error: 'WhatsApp not configured or enabled' };
        }

        // Format phone number for WhatsApp (must be E.164 format)
        let phoneNumber = user.phoneNumber.trim();
        if (!phoneNumber.startsWith('+')) {
            // Assume US number if no country code
            phoneNumber = `+1${phoneNumber.replace(/\D/g, '')}`;
        } else {
            phoneNumber = `+${phoneNumber.replace(/\D/g, '')}`;
        }

        const whatsappNumber = `whatsapp:${phoneNumber}`;
        // Get WhatsApp from number from database config
        const whatsappFromNumber = whatsappConfig.whatsappNumber;
        const normalizedFromNumber = whatsappFromNumber ? normalizeWhatsAppNumber(whatsappFromNumber) : '';
        const fromNumber = normalizedFromNumber ? `whatsapp:${normalizedFromNumber}` : null;

        if (!fromNumber) {
            return { success: false, error: 'Twilio WhatsApp number not configured' };
        }

        // Format message
        const baseUrl = getBaseUrl();
        const incidentUrl = `${baseUrl}/incidents/${incident.id}`;

        let statusLine = '';

        if (eventType === 'triggered') {
            statusLine = '!! *CRITICAL ALERT*';
            if (incident.urgency !== 'HIGH') statusLine = '*INCIDENT ALERT*';
        } else if (eventType === 'acknowledged') {
            statusLine = '*ACKNOWLEDGED*';
        } else if (eventType === 'resolved') {
            statusLine = '*RESOLVED*';
        }

        // Truncate for sanity, though WhatsApp limit is 1600 chars
        const titleMaxLength = 100;
        let title = incident.title.length > titleMaxLength
            ? incident.title.substring(0, titleMaxLength) + '...'
            : incident.title;

        // Send via Twilio WhatsApp API
        const twilio = (await import('twilio')).default as any;

        const client = twilio(whatsappConfig.accountSid, whatsappConfig.authToken);

        try {
            if (!whatsappConfig.whatsappContentSid) {
                return { success: false, error: 'WhatsApp template (contentSid) not configured' };
            }

            // Use Twilio Content API (Templates) - Required for 24h window
            // Variables: 1: Title, 2: Service, 3: Status, 4: Link
            const variables = {
                '1': title,
                '2': incident.service.name,
                '3': statusLine.replace(/[\*\_]/g, ''), // Remove markdown for plain text template
                '4': incidentUrl
            };

            const messageResult = await client.messages.create({
                from: fromNumber,
                to: whatsappNumber,
                contentSid: whatsappConfig.whatsappContentSid,
                contentVariables: JSON.stringify(variables)
            });

            logger.info('WhatsApp notification sent via Template', {
                userId,
                incidentId,
                contentSid: whatsappConfig.whatsappContentSid,
                messageSid: messageResult.sid
            });

            return { success: true };
        } catch (twilioError: any) {
            logger.error('WhatsApp send error', {
                userId,
                incidentId,
                error: twilioError.message,
                code: twilioError.code
            });

            return { success: false, error: twilioError.message || 'WhatsApp send failed' };
        }
    } catch (error: any) {
        logger.error('WhatsApp notification error', {
            userId,
            incidentId,
            error: error.message
        });
        return { success: false, error: error.message };
    }
}

/**
 * Send WhatsApp message (generic)
 */
export async function sendWhatsApp(
    to: string,
    message: string,
    from?: string
): Promise<{ success: boolean; error?: string; messageSid?: string }> {
    try {
        const whatsappConfig = await getWhatsAppConfig();
        if (!whatsappConfig.enabled || whatsappConfig.provider !== 'twilio') {
            return { success: false, error: 'WhatsApp not configured or enabled' };
        }

        // Format phone numbers
        let toNumber = to.trim();
        if (!toNumber.startsWith('+')) {
            toNumber = `+1${toNumber.replace(/\D/g, '')}`;
        } else {
            toNumber = `+${toNumber.replace(/\D/g, '')}`;
        }

        const whatsappTo = `whatsapp:${toNumber}`;
        // Get WhatsApp from number from database config
        const whatsappFromNumber = whatsappConfig.whatsappNumber;
        const normalizedFrom = from
            ? normalizeWhatsAppNumber(from)
            : whatsappFromNumber
                ? normalizeWhatsAppNumber(whatsappFromNumber)
                : '';
        const whatsappFrom = normalizedFrom ? `whatsapp:${normalizedFrom}` : null;

        if (!whatsappFrom) {
            return { success: false, error: 'WhatsApp from number not configured' };
        }

        // Send via Twilio WhatsApp API
        const twilio = (await import('twilio')).default as any;

        const client = twilio(whatsappConfig.accountSid, whatsappConfig.authToken);

        const messageResult = await client.messages.create({
            from: whatsappFrom,
            to: whatsappTo,
            body: message
        });

        return { success: true, messageSid: messageResult.sid };
    } catch (error: any) {
        logger.error('WhatsApp send error', {
            to,
            error: error.message
        });
        return { success: false, error: error.message };
    }
}




