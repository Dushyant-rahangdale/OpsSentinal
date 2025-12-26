/**
 * SMS Notification Service
 * Sends SMS notifications for incidents
 * 
 * SMS providers are configured via the UI at Settings → System → Notification Providers
 * 
 * To use with Twilio (recommended):
 * 1. Install: npm install twilio
 * 2. Configure Twilio in Settings → System → Notification Providers
 * 
 * To use with AWS SNS:
 * 1. Install: npm install @aws-sdk/client-sns
 * 2. Set AWS credentials in .env
 * 3. Use AWS SNS implementation
 */

import prisma from './prisma';
import { getSMSConfig } from './notification-providers';
import { getBaseUrl } from './env-validation';

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
        // Get SMS configuration
        const smsConfig = await getSMSConfig();

        // Check if SMS is enabled
        if (!smsConfig.enabled) {
            console.log('SMS Notification (disabled):', {
                to: options.to,
                message: options.message.substring(0, 100),
                provider: smsConfig.provider,
            });
            return { success: false, error: 'SMS notifications are not enabled' };
        }

        // Use configured provider
        if (smsConfig.provider === 'twilio') {
            // Load Twilio dynamically
            let twilio: any;
            try {
                const loadTwilio = () => {
                    try {
                        return require('twilio');
                    } catch {
                        return null;
                    }
                };
                twilio = loadTwilio();
                if (!twilio) {
                    throw new Error('Twilio package not installed');
                }
            } catch (error: any) {
                console.error('Twilio package not installed:', error?.message);
                return { success: false, error: 'Twilio package not installed. Install it with: npm install twilio' };
            }

            // Validate required Twilio config
            if (!smsConfig.accountSid || !smsConfig.authToken || !smsConfig.fromNumber) {
                return { success: false, error: 'Twilio configuration incomplete. Please configure Account SID, Auth Token, and From Number in Settings → System → Notification Providers' };
            }

            try {
                const client = twilio(smsConfig.accountSid, smsConfig.authToken);

                // Format phone number to E.164 if needed
                let toNumber = options.to.trim();
                if (!toNumber.startsWith('+')) {
                    // Try to format - remove non-digits and add +
                    const digits = toNumber.replace(/\D/g, '');
                    if (digits.length >= 10) {
                        // Assume US number if no country code
                        toNumber = `+1${digits}`;
                        console.warn('Phone number missing country code, assuming US:', toNumber);
                    } else {
                        return { success: false, error: `Invalid phone number format: ${options.to}. Must be in E.164 format (e.g., +1234567890)` };
                    }
                } else {
                    // Clean up the number (remove spaces, dashes, etc.)
                    toNumber = toNumber.replace(/[\s\-\(\)]/g, '');
                }

                console.log('Sending SMS via Twilio:', {
                    to: toNumber,
                    from: smsConfig.fromNumber,
                    messageLength: options.message.length
                });

                const result = await client.messages.create({
                    body: options.message,
                    from: smsConfig.fromNumber,
                    to: toNumber
                });

                console.log('SMS sent successfully via Twilio:', {
                    to: toNumber,
                    from: smsConfig.fromNumber,
                    messageSid: result.sid,
                    status: result.status
                });

                return { success: true };
            } catch (error: any) {
                console.error('Twilio SMS send error:', {
                    error: error.message,
                    code: error.code,
                    status: error.status,
                    to: options.to,
                    from: smsConfig.fromNumber
                });

                // Provide user-friendly error messages for common Twilio errors
                let errorMessage = error.message || `Twilio error: ${error.code || 'Unknown error'}`;

                // Handle unverified number error (common with trial accounts)
                if (error.code === 21211 || error.message?.includes('unverified')) {
                    errorMessage = `Phone number ${options.to} is not verified in your Twilio account. Trial accounts can only send to verified numbers. Please verify the number at https://twilio.com/user/account/phone-numbers/verified or upgrade your Twilio account.`;
                }

                // Handle invalid phone number format
                if (error.code === 21211 || error.message?.includes('Invalid')) {
                    errorMessage = `Invalid phone number format: ${options.to}. Please ensure the number is in E.164 format (e.g., +1234567890) and is verified in your Twilio account.`;
                }

                // Handle authentication errors
                if (error.code === 20003 || error.status === 401) {
                    errorMessage = 'Twilio authentication failed. Please check your Account SID and Auth Token in Settings → System → Notification Providers.';
                }

                // Handle insufficient balance
                if (error.code === 21212 || error.message?.includes('insufficient')) {
                    errorMessage = 'Twilio account has insufficient balance. Please add funds to your Twilio account.';
                }

                return {
                    success: false,
                    error: errorMessage
                };
            }
        }

        if (smsConfig.provider === 'aws-sns') {
            // TODO: Implement AWS SNS when npm package is installed
            // const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
            try {
                // Validate required AWS SNS config
                if (!smsConfig.accessKeyId || !smsConfig.secretAccessKey) {
                    return { success: false, error: 'AWS SNS configuration incomplete. Please configure Access Key ID and Secret Access Key in Settings → System → Notification Providers' };
                }

                // Use runtime require to avoid build-time dependency
                const requireFunc = eval('require') as (id: string) => any;
                const { SNSClient, PublishCommand } = requireFunc('@aws-sdk/client-sns');

                const client = new SNSClient({
                    region: smsConfig.region || 'us-east-1',
                    credentials: {
                        accessKeyId: smsConfig.accessKeyId,
                        secretAccessKey: smsConfig.secretAccessKey,
                    },
                });

                const command = new PublishCommand({
                    PhoneNumber: options.to,
                    Message: options.message,
                });

                const result = await client.send(command);
                console.log('SMS sent via AWS SNS:', { to: options.to, messageId: result.MessageId });
                return { success: true };
            } catch (error: any) {
                // If AWS SDK package is not installed, fall back to console log
                if (error.code === 'MODULE_NOT_FOUND') {
                    console.error('AWS SDK package not installed. Install with: npm install @aws-sdk/client-sns');
                    return { success: false, error: 'AWS SDK package not installed. Install with: npm install @aws-sdk/client-sns' };
                }
                console.error('AWS SNS SMS send error:', error);
                return { success: false, error: error.message || 'AWS SNS error' };
            }
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

        const baseUrl = getBaseUrl();
        const incidentUrl = `${baseUrl}/incidents/${incidentId}`;

        // Emojis and labels based on event type and urgency
        const eventEmoji = incident.urgency === 'HIGH'
            ? (eventType === 'triggered' ? '🚨' : eventType === 'acknowledged' ? '⚠️' : '✅')
            : (eventType === 'triggered' ? '⚠️' : eventType === 'acknowledged' ? 'ℹ️' : '✅');

        const statusLabel = eventType === 'resolved' ? 'RESOLVED' :
            eventType === 'acknowledged' ? 'ACK' :
                incident.urgency === 'HIGH' ? 'CRITICAL' : 'INCIDENT';

        // Build professional opssentinal branded message (optimized for SMS)
        const titleMaxLength = 35;
        const serviceMaxLength = 15;

        let title = incident.title.length > titleMaxLength
            ? incident.title.substring(0, titleMaxLength - 1) + '…'
            : incident.title;

        let service = incident.service.name.length > serviceMaxLength
            ? incident.service.name.substring(0, serviceMaxLength - 1) + '…'
            : incident.service.name;

        // Professional opssentinal SMS format with clean structure:
        // Line 1: [opssentinal] STATUS
        // Line 2: Incident Title
        // Line 3: Service Name
        // Line 4: Link
        let message = eventType === 'resolved'
            ? `[opssentinal] ${eventEmoji} RESOLVED\n${title}\n✓ ${service}\n${incidentUrl}`
            : eventType === 'acknowledged'
                ? `[opssentinal] ${eventEmoji} ACKNOWLEDGED\n${title}\n⚡ ${service}\n${incidentUrl}`
                : `[opssentinal] ${eventEmoji} ${incident.urgency === 'HIGH' ? 'CRITICAL ALERT' : 'INCIDENT'}\n${title}\n⚠ ${service}\n${incidentUrl}`;

        // Format phone number to E.164 format if needed
        let phoneNumber = user.phoneNumber.trim();
        if (!phoneNumber.startsWith('+')) {
            // If no country code, assume it's already formatted or add default
            // For now, just use as-is and let Twilio handle validation
            console.warn('Phone number missing country code:', phoneNumber);
        } else {
            // Ensure it's properly formatted (remove spaces, dashes, etc.)
            phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
        }

        return await sendSMS({
            to: phoneNumber,
            message,
        });
    } catch (error: any) {
        console.error('Send incident SMS error:', error);
        return { success: false, error: error.message };
    }
}



