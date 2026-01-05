import 'server-only';
import { logger } from './logger';

/**
 * SLA Breach Monitor - Proactive Breach Detection
 *
 * Monitors active incidents for approaching SLA breaches and
 * sends notifications before breaches occur.
 *
 * Run this via scheduled job every 5 minutes.
 */

// Default warning thresholds (ms before breach to trigger warning)
const DEFAULT_ACK_WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before ack breach
const DEFAULT_RESOLVE_WARNING_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes before resolve breach

export interface BreachWarning {
  incidentId: string;
  title: string;
  serviceId: string;
  serviceName: string;
  breachType: 'ack' | 'resolve';
  timeRemainingMs: number;
  targetMinutes: number;
  urgency: string;
  status: string;
  assigneeName?: string;
  createdAt: Date;
}

export interface BreachCheckResult {
  warnings: BreachWarning[];
  checkedAt: Date;
  activeIncidentCount: number;
  warningCount: number;
}

export interface BreachMonitorConfig {
  ackWarningThresholdMs?: number;
  resolveWarningThresholdMs?: number;
  notifySlack?: boolean;
  notifyEmail?: boolean;
  alertEmail?: string;
}

/**
 * Check for incidents nearing SLA breach
 * Run every 5 minutes via scheduled job
 */
export async function checkSLABreaches(
  config: BreachMonitorConfig = {}
): Promise<BreachCheckResult> {
  const { default: prisma } = await import('./prisma');

  const now = new Date();
  const warnings: BreachWarning[] = [];

  const ackWarningThreshold = config.ackWarningThresholdMs ?? DEFAULT_ACK_WARNING_THRESHOLD_MS;
  const resolveWarningThreshold =
    config.resolveWarningThresholdMs ?? DEFAULT_RESOLVE_WARNING_THRESHOLD_MS;

  // Get all active incidents with their service SLA targets
  const incidents = await prisma.incident.findMany({
    where: {
      status: { not: 'RESOLVED' },
    },
    select: {
      id: true,
      title: true,
      serviceId: true,
      urgency: true,
      status: true,
      createdAt: true,
      acknowledgedAt: true,
      service: {
        select: {
          id: true,
          name: true,
          targetAckMinutes: true,
          targetResolveMinutes: true,
          slackWebhookUrl: true,
          serviceNotifyOnSlaBreach: true,
        },
      },
      assignee: {
        select: {
          name: true,
        },
      },
    },
  });

  logger.debug('[SLA Breach Monitor] Checking active incidents', {
    count: incidents.length,
    timestamp: now.toISOString(),
  });

  for (const rawIncident of incidents) {
    const incident = rawIncident as any;
    const elapsedMs = now.getTime() - incident.createdAt.getTime();

    // Default SLA targets
    const ackTargetMinutes = incident.service.targetAckMinutes ?? 15;
    const resolveTargetMinutes = incident.service.targetResolveMinutes ?? 120;

    const ackTargetMs = ackTargetMinutes * 60 * 1000;
    const resolveTargetMs = resolveTargetMinutes * 60 * 1000;

    // Skip if service has disabled SLA notifications
    if (!incident.service.serviceNotifyOnSlaBreach) {
      continue;
    }

    // Check ack SLA (only if not acknowledged)
    if (!incident.acknowledgedAt) {
      const ackRemainingMs = ackTargetMs - elapsedMs;

      // Warning: within threshold but not yet breached
      if (ackRemainingMs > 0 && ackRemainingMs < ackWarningThreshold) {
        warnings.push({
          incidentId: incident.id,
          title: incident.title,
          serviceId: incident.service.id,
          serviceName: incident.service.name,
          breachType: 'ack',
          timeRemainingMs: ackRemainingMs,
          targetMinutes: ackTargetMinutes,
          urgency: incident.urgency,
          status: incident.status,
          assigneeName: incident.assignee?.name,
          createdAt: incident.createdAt,
        });
      }
    }

    // Check resolve SLA
    const resolveRemainingMs = resolveTargetMs - elapsedMs;

    // Warning: within threshold but not yet breached
    if (resolveRemainingMs > 0 && resolveRemainingMs < resolveWarningThreshold) {
      warnings.push({
        incidentId: incident.id,
        title: incident.title,
        serviceId: incident.service.id,
        serviceName: incident.service.name,
        breachType: 'resolve',
        timeRemainingMs: resolveRemainingMs,
        targetMinutes: resolveTargetMinutes,
        urgency: incident.urgency,
        status: incident.status,
        assigneeName: incident.assignee?.name,
        createdAt: incident.createdAt,
      });
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    logger.warn('[SLA Breach Monitor] Breach warnings detected', {
      warningCount: warnings.length,
      ackWarnings: warnings.filter(w => w.breachType === 'ack').length,
      resolveWarnings: warnings.filter(w => w.breachType === 'resolve').length,
      incidentIds: warnings.map(w => w.incidentId),
    });

    // Send notifications for each warning
    for (const warning of warnings) {
      await notifyBreachWarning(warning, config);
    }
  } else {
    logger.debug('[SLA Breach Monitor] No breach warnings', {
      activeIncidentCount: incidents.length,
    });
  }

  return {
    warnings,
    checkedAt: now,
    activeIncidentCount: incidents.length,
    warningCount: warnings.length,
  };
}

/**
 * Send breach warning notification
 */
async function notifyBreachWarning(
  warning: BreachWarning,
  config: BreachMonitorConfig
): Promise<void> {
  const remainingMinutes = Math.round(warning.timeRemainingMs / 60000);
  const urgencyEmoji =
    warning.urgency === 'HIGH' ? '🔴' : warning.urgency === 'MEDIUM' ? '🟡' : '🟢';
  const breachEmoji = warning.breachType === 'ack' ? '⏰' : '⚠️';

  const message = `${breachEmoji} SLA ${warning.breachType.toUpperCase()} Warning: "${warning.title}" (${warning.serviceName}) - ${remainingMinutes} min remaining ${urgencyEmoji}`;

  // Always log the warning
  logger.warn('[SLA Breach Warning]', {
    incidentId: warning.incidentId,
    breachType: warning.breachType,
    remainingMinutes,
    targetMinutes: warning.targetMinutes,
    urgency: warning.urgency,
    service: warning.serviceName,
    message,
  });

  // Send Slack notification if enabled
  if (config.notifySlack) {
    try {
      const { sendSlackNotification } = await import('./slack');

      await sendSlackNotification(
        'triggered', // Use triggered style (Red) for attention
        {
          id: warning.incidentId,
          title: warning.title,
          status: warning.status,
          urgency: warning.urgency,
          serviceName: warning.serviceName,
          assigneeName: warning.assigneeName,
        },
        message // Additional context
      );

      logger.info('[SLA Breach Monitor] Slack notification sent', { warning });
    } catch (error) {
      logger.error('[SLA Breach Monitor] Failed to send Slack notification', { error });
    }
  }

  // Send email notification if enabled
  if (config.notifyEmail) {
    try {
      // Check for generic alert email in config
      const alertEmail = config.alertEmail || process.env.SLA_ALERT_EMAIL;

      if (alertEmail) {
        const { sendEmail } = await import('./email');

        await sendEmail({
          to: alertEmail,
          subject: `[SLA WARNING] ${warning.serviceName}: ${warning.title}`,
          html: `
                        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                            <h2 style="color: #dc2626; margin-top: 0;">${breachEmoji} SLA Warning</h2>
                            <p><strong>Incident:</strong> <a href="${process.env.NEXTAUTH_URL}/incidents/${warning.incidentId}">${warning.title}</a></p>
                            <p><strong>Service:</strong> ${warning.serviceName}</p>
                            <p><strong>Urgency:</strong> ${warning.urgency}</p>
                            <p><strong>Type:</strong> ${warning.breachType.toUpperCase()} Target</p>
                            <p style="font-size: 1.25em; font-weight: bold;">
                                <span style="color: ${remainingMinutes < 0 ? '#dc2626' : '#d97706'}">
                                    ${remainingMinutes} minutes remaining
                                </span>
                            </p>
                        </div>
                    `,
          text: message,
        });

        logger.info('[SLA Breach Monitor] Email notification sent', { to: alertEmail });
      } else {
        logger.debug('[SLA Breach Monitor] Email skipped (SLA_ALERT_EMAIL not set)');
      }
    } catch (error) {
      logger.error('[SLA Breach Monitor] Failed to send email notification', { error });
    }
  }
}

/**
 * Format breach warning for display
 */
export function formatBreachWarning(warning: BreachWarning): string {
  const remainingMinutes = Math.round(warning.timeRemainingMs / 60000);
  const type = warning.breachType === 'ack' ? 'Acknowledgment' : 'Resolution';
  return `${type} SLA breach in ${remainingMinutes} min (target: ${warning.targetMinutes} min)`;
}
