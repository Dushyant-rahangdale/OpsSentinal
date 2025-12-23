/**
 * SMS Notification Service
 * Sends SMS notifications for incidents
 * 
 * To use with Twilio (recommended):
 * 1. Install: npm install twilio
 * 2. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env
 * 3. Uncomment the Twilio implementation below
 * 
 * To use with AWS SNS:
 * 1. Install: npm install @aws-sdk/client-sns
 * 2. Set AWS credentials in .env
 * 3. Use AWS SNS implementation
 */

import prisma from './prisma';

export type SMSOptions = {
    to: string; // Phone number in E.164 format (e.g., +1234567890)
    message: string;
};

/**
 * Send SMS notification
 * Currently uses console.log for development
 * Replace with actual SMS service in production
 */
export async function sendSMS(options: SMSOptions): Promise<{ success: boolean; error?: string }> {
    try {
        // Get SMS configuration (database first, then env vars)
        const { getSMSConfig } = await import('./notification-providers');
        const smsConfig = await getSMSConfig();

        // Development: Log SMS instead of sending if no provider configured
        if (process.env.NODE_ENV === 'development' || !smsConfig.enabled) {
            console.log('📱 SMS Notification:', {
                to: options.to,
                message: options.message.substring(0, 100),
                provider: smsConfig.provider,
            });
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return { success: true };
        }

        // Production: Use configured provider
        if (smsConfig.provider === 'twilio') {
            // TODO: Implement Twilio when npm package is installed
            // const twilio = require('twilio');
            // const client = twilio(smsConfig.accountSid, smsConfig.authToken);
            // const result = await client.messages.create({
            //     body: options.message,
            //     from: smsConfig.fromNumber,
            //     to: options.to
            // });
            console.log('📱 Would send via Twilio:', { to: options.to, from: smsConfig.fromNumber });
            return { success: true };
        }

        if (smsConfig.provider === 'aws-sns') {
            // TODO: Implement AWS SNS when npm package is installed
            // const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
            // const client = new SNSClient({ region: smsConfig.region });
            // const command = new PublishCommand({
            //     PhoneNumber: options.to,
            //     Message: options.message
            // });
            // await client.send(command);
            console.log('📱 Would send via AWS SNS:', { to: options.to });
            return { success: true };
        }

        // No provider configured
        return { success: false, error: 'No SMS provider configured' };
    } catch (error: any) {
        console.error('SMS send error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send incident notification SMS
 */
export async function sendIncidentSMS(
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

        if (!user.phoneNumber) {
            return { success: false, error: 'User has no phone number configured' };
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const incidentUrl = `${baseUrl}/incidents/${incidentId}`;
        
        const urgencyLabel = incident.urgency === 'HIGH' ? 'CRITICAL' : 'INFO';
        const statusEmoji = eventType === 'resolved' ? '✅' : eventType === 'acknowledged' ? '👀' : '🚨';
        
        const message = `${statusEmoji} [${urgencyLabel}] ${incident.title}\nService: ${incident.service.name}\nStatus: ${incident.status}\nView: ${incidentUrl}`;

        return await sendSMS({
            to: user.phoneNumber,
            message,
        });
    } catch (error: any) {
        console.error('Send incident SMS error:', error);
        return { success: false, error: error.message };
    }
}





