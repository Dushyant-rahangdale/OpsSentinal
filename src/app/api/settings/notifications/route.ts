import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/rbac';
import { jsonError, jsonOk } from '@/lib/api-response';
import { getUserFriendlyError } from '@/lib/user-friendly-errors';
import prisma from '@/lib/prisma';

/**
 * GET /api/settings/notifications
 * Get notification provider settings from database
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return jsonError('Unauthorized. Admin access required.', 403);
    }

    // Get settings from database
    const [twilioProvider, awsProvider, webPushProvider] = await Promise.all([
      prisma.notificationProvider.findUnique({ where: { provider: 'twilio' } }),
      prisma.notificationProvider.findUnique({ where: { provider: 'aws-sns' } }),
      prisma.notificationProvider.findUnique({ where: { provider: 'web-push' } }),
    ]);

    // Build SMS config from database
    let smsConfig: any = { enabled: false, provider: null }; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (twilioProvider && twilioProvider.enabled) {
      const config = twilioProvider.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      smsConfig = {
        enabled: true,
        provider: 'twilio',
        accountSid: config.accountSid || '',
        authToken: config.authToken || '',
        fromNumber: config.fromNumber || '',
      };
    } else if (awsProvider && awsProvider.enabled) {
      const config = awsProvider.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      smsConfig = {
        enabled: true,
        provider: 'aws-sns',
        region: config.region || 'us-east-1',
        accessKeyId: config.accessKeyId || '',
        secretAccessKey: config.secretAccessKey || '',
      };
    }

    // Build Push config from database
    let pushConfig: any = { enabled: false, provider: null }; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (webPushProvider && webPushProvider.enabled) {
      const config = webPushProvider.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      pushConfig = {
        enabled: true,
        provider: 'web-push',
        vapidPublicKey: config.vapidPublicKey || '',
        vapidPrivateKey: config.vapidPrivateKey || '',
        vapidSubject: config.vapidSubject || '',
      };
    }

    // Get WhatsApp config from Twilio provider config (independent of SMS enablement)
    const whatsappProvider = twilioProvider?.config as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const whatsappNumber = whatsappProvider?.whatsappNumber || '';
    const whatsappContentSid = whatsappProvider?.whatsappContentSid || '';
    const whatsappEnabled = whatsappProvider?.whatsappEnabled ?? !!whatsappNumber;
    const whatsappConfig = {
      number: whatsappNumber,
      contentSid: whatsappContentSid,
      accountSid: whatsappProvider?.whatsappAccountSid || '',
      authToken: whatsappProvider?.whatsappAuthToken || '',
      enabled: !!whatsappEnabled && !!whatsappNumber,
    };

    return jsonOk({
      sms: smsConfig,
      push: pushConfig,
      whatsapp: whatsappConfig,
    });
  } catch (error) {
    return jsonError(getUserFriendlyError(error), 500);
  }
}

/**
 * POST /api/settings/notifications
 * Update notification provider settings in database
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return jsonError('Unauthorized. Admin access required.', 403);
    }

    const body = await req.json();
    const existingTwilioProvider = await prisma.notificationProvider.findUnique({
      where: { provider: 'twilio' },
    });
    const existingTwilioConfig = (existingTwilioProvider?.config as any) || {}; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Save SMS provider (Twilio or AWS SNS)
    if (body.sms) {
      const smsProvider = body.sms.provider === 'twilio' ? 'twilio' : 'aws-sns';
      const smsConfig: any = {
        enabled: body.sms.enabled || false,
      };

      if (body.sms.provider === 'twilio') {
        smsConfig.accountSid = body.sms.accountSid || '';
        smsConfig.authToken = body.sms.authToken || '';
        smsConfig.fromNumber = body.sms.fromNumber || '';
        // Store WhatsApp config in Twilio provider config
        const whatsappNumber = body.whatsapp?.number ?? existingTwilioConfig.whatsappNumber ?? '';
        smsConfig.whatsappNumber = whatsappNumber;
        smsConfig.whatsappContentSid =
          body.whatsapp?.contentSid ?? existingTwilioConfig.whatsappContentSid ?? '';
        smsConfig.whatsappEnabled =
          body.whatsapp?.enabled ?? existingTwilioConfig.whatsappEnabled ?? !!whatsappNumber;
        smsConfig.whatsappAccountSid =
          body.whatsapp?.accountSid ?? existingTwilioConfig.whatsappAccountSid ?? '';
        smsConfig.whatsappAuthToken =
          body.whatsapp?.authToken ?? existingTwilioConfig.whatsappAuthToken ?? '';
      } else if (body.sms.provider === 'aws-sns') {
        smsConfig.region = body.sms.region || 'us-east-1';
        smsConfig.accessKeyId = body.sms.accessKeyId || '';
        smsConfig.secretAccessKey = body.sms.secretAccessKey || '';
      }

      await prisma.notificationProvider.upsert({
        where: { provider: smsProvider },
        create: {
          provider: smsProvider,
          enabled: smsConfig.enabled,
          config: smsConfig,
          updatedBy: user.id,
        },
        update: {
          enabled: smsConfig.enabled,
          config: smsConfig,
          updatedBy: user.id,
        },
      });

      // Disable the other SMS provider if switching
      const otherProvider = body.sms.provider === 'twilio' ? 'aws-sns' : 'twilio';
      const otherProviderRecord = await prisma.notificationProvider.findUnique({
        where: { provider: otherProvider },
      });
      if (otherProviderRecord) {
        await prisma.notificationProvider.update({
          where: { provider: otherProvider },
          data: { enabled: false, updatedBy: user.id },
        });
      }
    }

    // Save Push provider (Web Push)
    if (body.push) {
      const pushConfig: any = {
        enabled: body.push.enabled || false,
      };

      pushConfig.vapidPublicKey = body.push.vapidPublicKey || '';
      pushConfig.vapidPrivateKey = body.push.vapidPrivateKey || '';
      pushConfig.vapidSubject = body.push.vapidSubject || '';

      await prisma.notificationProvider.upsert({
        where: { provider: 'web-push' },
        create: {
          provider: 'web-push',
          enabled: pushConfig.enabled,
          config: pushConfig,
          updatedBy: user.id,
        },
        update: {
          enabled: pushConfig.enabled,
          config: pushConfig,
          updatedBy: user.id,
        },
      });
    }

    if (body.whatsapp) {
      const whatsappNumber = body.whatsapp.number ?? existingTwilioConfig.whatsappNumber ?? '';
      const updatedTwilioConfig = {
        ...existingTwilioConfig,
        whatsappNumber,
        whatsappContentSid:
          body.whatsapp.contentSid ?? existingTwilioConfig.whatsappContentSid ?? '',
        whatsappEnabled:
          body.whatsapp.enabled ?? existingTwilioConfig.whatsappEnabled ?? !!whatsappNumber,
        whatsappAccountSid:
          body.whatsapp.accountSid ?? existingTwilioConfig.whatsappAccountSid ?? '',
        whatsappAuthToken: body.whatsapp.authToken ?? existingTwilioConfig.whatsappAuthToken ?? '',
      };

      if (existingTwilioProvider) {
        await prisma.notificationProvider.update({
          where: { provider: 'twilio' },
          data: {
            config: updatedTwilioConfig,
            updatedBy: user.id,
          },
        });
      } else {
        await prisma.notificationProvider.create({
          data: {
            provider: 'twilio',
            enabled: false,
            config: updatedTwilioConfig,
            updatedBy: user.id,
          },
        });
      }
    }

    return jsonOk({
      success: true,
      message: 'Notification provider settings saved successfully',
    });
  } catch (error) {
    return jsonError(getUserFriendlyError(error), 500);
  }
}
