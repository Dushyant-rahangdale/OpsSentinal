/**
 * Integration Tests for Complete Notification Flow
 *
 * Tests the end-to-end flow:
 * 1. Incident created
 * 2. Service notifications sent (service channels)
 * 3. Escalation policy executed
 * 4. Notifications sent to users based on preferences/step config
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import prisma from '../../src/lib/prisma';
import { sendServiceNotifications } from '../../src/lib/service-notifications';
import { executeEscalation } from '../../src/lib/escalation';
// Note: we assert via prisma.notification rows instead of spying on imported bindings.

describe('Notification Flow Integration Tests', () => {
  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.onCallLayerUser.deleteMany();
    await prisma.onCallLayer.deleteMany();
    await prisma.onCallOverride.deleteMany();
    await prisma.onCallShift.deleteMany();
    await prisma.onCallSchedule.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.escalationRule.deleteMany();
    await prisma.escalationPolicy.deleteMany();
    await prisma.service.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.onCallLayerUser.deleteMany();
    await prisma.onCallLayer.deleteMany();
    await prisma.onCallOverride.deleteMany();
    await prisma.onCallShift.deleteMany();
    await prisma.onCallSchedule.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.escalationRule.deleteMany();
    await prisma.escalationPolicy.deleteMany();
    await prisma.service.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should send service notifications and escalation notifications separately', async () => {
    // Setup
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test.user@example.com',
        emailNotificationsEnabled: true,
      },
    });

    const service = await prisma.service.create({
      data: {
        name: 'Test Service',
        serviceNotificationChannels: ['SLACK'],
        slackWebhookUrl: 'https://hooks.slack.com/test',
        policy: {
          create: {
            name: 'Test Policy',
            steps: {
              create: {
                stepOrder: 0,
                delayMinutes: 0,
                targetType: 'USER',
                targetUserId: user.id,
              },
            },
          },
        },
      },
    });

    const incident = await prisma.incident.create({
      data: {
        title: 'Test Incident',
        serviceId: service.id,
        status: 'OPEN',
        urgency: 'HIGH',
      },
    });

    // 1. Send service notifications
    const serviceResult = await sendServiceNotifications(incident.id, 'triggered');
    expect(serviceResult.success).toBe(true);
    // Service notifications are isolated from escalation notifications (no prisma.notification rows)
    const beforeEscalation = await prisma.notification.count({
      where: { incidentId: incident.id },
    });
    expect(beforeEscalation).toBe(0);

    // 2. Execute escalation (separate from service notifications)
    const escalationResult = await executeEscalation(incident.id, 0);
    expect(escalationResult.escalated).toBe(true);

    // Escalation should create at least one EMAIL notification record
    const notifications = await prisma.notification.findMany({
      where: { incidentId: incident.id },
    });
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications.some(n => n.channel === 'EMAIL' && n.userId === user.id)).toBe(true);
  });

  it('should handle team escalation with notifyOnlyTeamLead option', async () => {
    const teamLead = await prisma.user.create({
      data: {
        name: 'Team Lead',
        email: 'lead@example.com',
        emailNotificationsEnabled: true,
      },
    });

    const member = await prisma.user.create({
      data: {
        name: 'Member',
        email: 'member@example.com',
        emailNotificationsEnabled: true,
      },
    });

    const team = await prisma.team.create({
      data: {
        name: 'Test Team',
        teamLeadId: teamLead.id,
        members: {
          create: [
            { userId: teamLead.id, role: 'OWNER' },
            { userId: member.id, role: 'MEMBER' },
          ],
        },
      },
    });

    const service = await prisma.service.create({
      data: {
        name: 'Test Service',
        policy: {
          create: {
            name: 'Test Policy',
            steps: {
              create: {
                stepOrder: 0,
                delayMinutes: 0,
                targetType: 'TEAM',
                targetTeamId: team.id,
                notifyOnlyTeamLead: true, // Only notify lead
              },
            },
          },
        },
      },
    });

    const incident = await prisma.incident.create({
      data: {
        title: 'Test Incident',
        serviceId: service.id,
        status: 'OPEN',
        urgency: 'HIGH',
      },
    });

    const result = await executeEscalation(incident.id, 0);

    expect(result.escalated).toBe(true);
    expect(result.targetCount).toBe(1); // Only team lead

    const notifications = await prisma.notification.findMany({
      where: { incidentId: incident.id },
    });
    expect(notifications.length).toBe(1);
    expect(notifications[0].channel).toBe('EMAIL');
    expect(notifications[0].userId).toBe(teamLead.id);
  });

  it('should handle schedule escalation with multiple active layers', async () => {
    const user1 = await prisma.user.create({
      data: {
        name: 'User 1',
        email: 'user1@example.com',
        emailNotificationsEnabled: true,
      },
    });

    const user2 = await prisma.user.create({
      data: {
        name: 'User 2',
        email: 'user2@example.com',
        emailNotificationsEnabled: true,
      },
    });

    const schedule = await prisma.onCallSchedule.create({
      data: {
        name: 'Test Schedule',
        timeZone: 'UTC',
        layers: {
          create: [
            {
              name: 'Day Layer',
              start: new Date('2024-01-01'),
              end: null,
              rotationLengthHours: 24,
              users: {
                create: [{ userId: user1.id, position: 0 }],
              },
            },
            {
              name: 'Night Layer',
              start: new Date('2024-01-01'),
              end: null,
              rotationLengthHours: 24,
              users: {
                create: [{ userId: user2.id, position: 0 }],
              },
            },
          ],
        },
      },
    });

    const service = await prisma.service.create({
      data: {
        name: 'Test Service',
        policy: {
          create: {
            name: 'Test Policy',
            steps: {
              create: {
                stepOrder: 0,
                delayMinutes: 0,
                targetType: 'SCHEDULE',
                targetScheduleId: schedule.id,
              },
            },
          },
        },
      },
    });

    const incident = await prisma.incident.create({
      data: {
        title: 'Test Incident',
        serviceId: service.id,
        status: 'OPEN',
        urgency: 'HIGH',
      },
    });

    const result = await executeEscalation(incident.id, 0);

    expect(result.escalated).toBe(true);
    expect(result.targetCount).toBeGreaterThanOrEqual(1); // At least one user

    const notifications = await prisma.notification.findMany({
      where: { incidentId: incident.id },
    });
    expect(notifications.length).toBeGreaterThanOrEqual(1);
    expect(notifications.every(n => n.channel === 'EMAIL')).toBe(true);
    // We expect all active-layer users to receive notifications
    const notifiedUserIds = new Set(notifications.map(n => n.userId));
    expect(notifiedUserIds.has(user1.id)).toBe(true);
    expect(notifiedUserIds.has(user2.id)).toBe(true);
  });
});
