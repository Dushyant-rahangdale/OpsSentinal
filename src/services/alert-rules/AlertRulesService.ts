import 'server-only';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Alert Rule Configuration
 * Defines thresholds for auto-incident creation
 */
interface AlertRule {
  id: string;
  name: string;
  serviceId: string;
  metricName: string;
  condition: 'gt' | 'lt' | 'eq'; // greater than, less than, equal
  threshold: number;
  windowMinutes: number;
  severity: 'HIGH' | 'LOW';
  enabled: boolean;
}

interface AlertEvaluation {
  rule: AlertRule;
  currentValue: number;
  breached: boolean;
}

/**
 * Alert Rules Service
 * Evaluates telemetry metrics against defined rules and creates incidents
 */
export class AlertRulesService {
  /**
   * Get all active alert rules
   */
  async getActiveRules(): Promise<AlertRule[]> {
    // For now, we'll use SystemConfig to store rules
    // In production, this could be a dedicated table
    const config = await prisma.systemConfig.findFirst({
      where: { key: 'ALERT_RULES' },
    });

    if (!config?.value) {
      return this.getDefaultRules();
    }

    try {
      return config.value as unknown as AlertRule[];
    } catch {
      return this.getDefaultRules();
    }
  }

  /**
   * Get default alert rules (fallback)
   */
  private getDefaultRules(): AlertRule[] {
    return [
      {
        id: 'default-error-rate',
        name: 'High Error Rate',
        serviceId: '*', // Applies to all services
        metricName: 'http.request.status',
        condition: 'gt',
        threshold: 5, // 5% error rate
        windowMinutes: 5,
        severity: 'HIGH',
        enabled: true,
      },
      {
        id: 'default-latency',
        name: 'High Latency',
        serviceId: '*',
        metricName: 'http.request.duration',
        condition: 'gt',
        threshold: 2000, // 2 seconds
        windowMinutes: 5,
        severity: 'HIGH',
        enabled: true,
      },
    ];
  }

  /**
   * Evaluate all active rules against recent metrics
   */
  async evaluateRules(): Promise<AlertEvaluation[]> {
    const rules = await this.getActiveRules();
    const evaluations: AlertEvaluation[] = [];
    const windowEnd = new Date();

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const windowStart = new Date(windowEnd.getTime() - rule.windowMinutes * 60 * 1000);

      const metrics = await prisma.metricRollup.findMany({
        where: {
          name: rule.metricName,
          bucket: { gte: windowStart, lte: windowEnd },
          ...(rule.serviceId !== '*' ? { serviceId: rule.serviceId } : {}),
        },
      });

      if (metrics.length === 0) {
        evaluations.push({ rule, currentValue: 0, breached: false });
        continue;
      }

      // Calculate aggregate value
      let aggregateValue = 0;
      if (rule.metricName.includes('status')) {
        // Error rate calculation
        const totalCount = metrics.reduce((sum, m) => sum + m.count, 0);
        const errorCount = metrics
          .filter(m => {
            const tags = m.tags as Record<string, string>;
            return tags?.status?.startsWith('5');
          })
          .reduce((sum, m) => sum + m.count, 0);
        aggregateValue = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
      } else {
        // Average value (e.g., latency)
        const totalSum = metrics.reduce((sum, m) => sum + m.sum, 0);
        const totalCount = metrics.reduce((sum, m) => sum + m.count, 0);
        aggregateValue = totalCount > 0 ? totalSum / totalCount : 0;
      }

      // Evaluate condition
      let breached = false;
      switch (rule.condition) {
        case 'gt':
          breached = aggregateValue > rule.threshold;
          break;
        case 'lt':
          breached = aggregateValue < rule.threshold;
          break;
        case 'eq':
          breached = Math.abs(aggregateValue - rule.threshold) < 0.01;
          break;
      }

      evaluations.push({ rule, currentValue: aggregateValue, breached });
    }

    return evaluations;
  }

  /**
   * Create incidents for breached rules
   */
  async createIncidentsForBreaches(evaluations: AlertEvaluation[]): Promise<string[]> {
    const createdIncidents: string[] = [];

    for (const evaluation of evaluations) {
      if (!evaluation.breached) continue;

      const rule = evaluation.rule;

      // Check for existing open incident with same dedup key
      const dedupKey = `telemetry-${rule.id}`;
      const existing = await prisma.incident.findFirst({
        where: {
          dedupKey,
          status: { not: 'RESOLVED' },
        },
      });

      if (existing) {
        logger.info('[AlertRules] Incident already exists for rule', {
          ruleId: rule.id,
          incidentId: existing.id,
        });
        continue;
      }

      // Find the service (or use first service if rule is global)
      let serviceId = rule.serviceId;
      if (serviceId === '*') {
        const firstService = await prisma.service.findFirst({ select: { id: true } });
        if (!firstService) {
          logger.warn('[AlertRules] No service found for global rule', { ruleId: rule.id });
          continue;
        }
        serviceId = firstService.id;
      }

      // Create incident
      const incident = await prisma.incident.create({
        data: {
          title: `[Auto] ${rule.name}: ${evaluation.currentValue.toFixed(2)} exceeds threshold`,
          description: `Automated incident created by AlertRulesService.\n\nRule: ${rule.name}\nMetric: ${rule.metricName}\nCondition: ${rule.condition} ${rule.threshold}\nCurrent Value: ${evaluation.currentValue.toFixed(2)}\nWindow: ${rule.windowMinutes} minutes`,
          urgency: rule.severity,
          serviceId,
          dedupKey,
          events: {
            create: {
              message: `Incident auto-created by telemetry alert: ${rule.name}`,
            },
          },
        },
      });

      logger.info('[AlertRules] Created incident for breached rule', {
        ruleId: rule.id,
        incidentId: incident.id,
        currentValue: evaluation.currentValue,
      });

      createdIncidents.push(incident.id);

      // Execute escalation policy
      try {
        const { executeEscalation } = await import('@/lib/escalation');
        await executeEscalation(incident.id);
      } catch (e) {
        logger.error('[AlertRules] Escalation failed', { error: e, incidentId: incident.id });
      }

      // Send notifications
      try {
        const { sendIncidentNotifications } = await import('@/lib/user-notifications');
        await sendIncidentNotifications(incident.id, 'triggered', []);
      } catch (e) {
        logger.error('[AlertRules] Notification failed', { error: e, incidentId: incident.id });
      }
    }

    return createdIncidents;
  }

  /**
   * Main evaluation loop - run this on a schedule (e.g., every minute)
   */
  async runEvaluation(): Promise<{
    evaluated: number;
    breached: number;
    incidentsCreated: string[];
  }> {
    const evaluations = await this.evaluateRules();
    const breachedCount = evaluations.filter(e => e.breached).length;
    const incidentsCreated = await this.createIncidentsForBreaches(evaluations);

    return {
      evaluated: evaluations.length,
      breached: breachedCount,
      incidentsCreated,
    };
  }
}

export const alertRulesService = new AlertRulesService();
