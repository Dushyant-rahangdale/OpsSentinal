/**
 * WhatsApp Integration via Twilio
 * Sends WhatsApp notifications for incidents
 */

import prisma from './prisma';
import { logger } from './logger';
import { getBaseUrl } from './env-validation';
import { getSMSConfig } from './notification-providers';

export type WhatsAppOptions = {
    userId: string;
    incidentId: string;
    eventType: 'triggered' | 'acknowledged' | 'resolved';
};

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

        // Get Twilio config
        const smsConfig = await getSMSConfig();
        if (!smsConfig.enabled || smsConfig.provider !== 'twilio') {
            return { success: false, error: 'Twilio not configured' };
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
        const fromNumber = smsConfig.fromNumber 
            ? `whatsapp:${smsConfig.fromNumber}`
            : process.env.TWILIO_WHATSAPP_NUMBER 
                ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
                : null;

        if (!fromNumber) {
            return { success: false, error: 'Twilio WhatsApp number not configured' };
        }

        // Format message
        const baseUrl = getBaseUrl();
        const incidentUrl = `${baseUrl}/incidents/${incident.id}`;
        
        const eventEmoji = eventType === 'triggered' ? '🚨' :
                          eventType === 'acknowledged' ? '⚠️' :
                          '✅';
        
        const message = `${eventEmoji} *OpsGuard Incident ${eventType.toUpperCase()}*\n\n` +
                       `*${incident.title}*\n\n` +
                       `Service: ${incident.service.name}\n` +
                       `Status: ${incident.status}\n` +
                       `Urgency: ${incident.urgency}\n` +
                       (incident.assignee ? `Assignee: ${incident.assignee.name}\n` : '') +
                       `\nView: ${incidentUrl}`;

        // Send via Twilio WhatsApp API
        const twilio = require('twilio');
        const client = twilio(smsConfig.accountSid, smsConfig.authToken);

        try {
            const messageResult = await client.messages.create({
                from: fromNumber,
                to: whatsappNumber,
                body: message
            });

            logger.info('WhatsApp notification sent', {
                userId,
                incidentId,
                eventType,
                messageSid: messageResult.sid
            });

            return { success: true };
        } catch (twilioError: any) {
            // If WhatsApp fails, try fallback to SMS
            if (twilioError.code === 21211 || twilioError.message?.includes('not a valid WhatsApp')) {
                logger.warn('WhatsApp number not valid, falling back to SMS', {
                    userId,
                    phoneNumber
                });
                
                try {
                    const { sendIncidentSMS } = await import('./sms');
                    return await sendIncidentSMS(userId, incidentId, eventType);
                } catch (smsError: any) {
                    logger.error('SMS fallback also failed', {
                        userId,
                        error: smsError.message
                    });
                    return { success: false, error: `WhatsApp and SMS both failed: ${smsError.message}` };
                }
            }

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
        const smsConfig = await getSMSConfig();
        if (!smsConfig.enabled || smsConfig.provider !== 'twilio') {
            return { success: false, error: 'Twilio not configured' };
        }

        // Format phone numbers
        let toNumber = to.trim();
        if (!toNumber.startsWith('+')) {
            toNumber = `+1${toNumber.replace(/\D/g, '')}`;
        } else {
            toNumber = `+${toNumber.replace(/\D/g, '')}`;
        }

        const whatsappTo = `whatsapp:${toNumber}`;
        const whatsappFrom = from 
            ? `whatsapp:${from}`
            : process.env.TWILIO_WHATSAPP_NUMBER
                ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
                : smsConfig.fromNumber
                    ? `whatsapp:${smsConfig.fromNumber}`
                    : null;

        if (!whatsappFrom) {
            return { success: false, error: 'WhatsApp from number not configured' };
        }

        const twilio = require('twilio');
        const client = twilio(smsConfig.accountSid, smsConfig.authToken);

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


