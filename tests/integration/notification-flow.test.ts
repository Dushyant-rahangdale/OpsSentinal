/**
 * Integration Tests for Complete Notification Flow
 *
 * Tests the end-to-end flow:
 * 1. Incident created
 * 2. Service notifications sent (service channels)
 * 3. Escalation policy executed
 * 4. Notifications sent to users based on preferences/step config
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import prisma from '../../src/lib/prisma';
import { sendServiceNotifications } from '../../src/lib/service-notifications';
import { executeEscalation } from '../../src/lib/escalation';
import { mockUser, mockIncident, mockService, mockTeam } from '../helpers/mock-factories';

describe('Notification Flow Integration Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  it('should send service notifications and escalation notifications separately', async () => {
    // Setup
    const user = mockUser({ id: 'user-1' });
    const service = mockService({
      id: 'svc-1',
      serviceNotificationChannels: ['SLACK'],
      policy: {
        id: 'pol-1',
        steps: [
          {
            stepOrder: 0,
            delayMinutes: 0,
            targetType: 'USER',
            targetUserId: user.id,
          },
        ],
      },
    });

    const incident = mockIncident({
      id: 'inc-1',
      serviceId: service.id,
      service: service,
    });

    // Mock Prisma responses
    vi.mocked(prisma.incident.findUnique).mockResolvedValue(incident as any);
    vi.mocked(prisma.service.findUnique).mockResolvedValue(service as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);
    vi.mocked(prisma.notificationProvider.findUnique).mockResolvedValue({
      provider: 'resend',
      enabled: true,
      config: { apiKey: 'test', fromEmail: 'test@test.com' }
    } as any);
    vi.mocked(prisma.incident.updateMany).mockResolvedValue({ count: 1 });

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
    // Since we are mocking, we can check if prisma.notification.create was called
    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it('should handle team escalation with notifyOnlyTeamLead option', async () => {
    const teamLead = {
      id: 'lead-1',
      name: 'Team Lead',
      email: 'lead@example.com',
      emailNotificationsEnabled: true,
    };

    const member = {
      id: 'member-1',
      name: 'Member',
      email: 'member@example.com',
      emailNotificationsEnabled: true,
    };

    const team = {
      id: 'team-1',
      name: 'Test Team',
      teamLeadId: teamLead.id,
      members: [
        { userId: teamLead.id, role: 'OWNER' },
        { userId: member.id, role: 'MEMBER' },
      ],
    };

    const service = {
      id: 'svc-2',
      name: 'Test Service',
      policy: {
        id: 'pol-2',
        name: 'Test Policy',
        steps: [
          {
            stepOrder: 0,
            delayMinutes: 0,
            targetType: 'TEAM',
            targetTeamId: team.id,
            notifyOnlyTeamLead: true, // Only notify lead
          },
        ],
      },
    };

    const incident = {
      id: 'inc-2',
      title: 'Test Incident',
      serviceId: service.id,
      status: 'OPEN',
      urgency: 'HIGH',
      service: service,
    };

    // Mock Prisma responses
    vi.mocked(prisma.incident.findUnique).mockResolvedValue(incident as any);
    vi.mocked(prisma.team.findUnique).mockResolvedValue(team as any);
    vi.mocked(prisma.teamMember.findMany).mockResolvedValue(team.members as any);
    vi.mocked(prisma.teamMember.findFirst).mockResolvedValue({ userId: teamLead.id } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(teamLead as any);
    vi.mocked(prisma.notificationProvider.findUnique).mockResolvedValue({
      provider: 'resend',
      enabled: true,
      config: { apiKey: 'test', fromEmail: 'test@test.com' }
    } as any);
    vi.mocked(prisma.incident.updateMany).mockResolvedValue({ count: 1 });

    const result = await executeEscalation(incident.id, 0);

    expect(result.escalated).toBe(true);
    expect(result.targetCount).toBe(1); // Only team lead

    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it('should handle schedule escalation with multiple active layers', async () => {
    const user1 = {
      id: 'u1',
      name: 'User 1',
      email: 'user1@example.com',
      emailNotificationsEnabled: true,
    };

    const user2 = {
      id: 'u2',
      name: 'User 2',
      email: 'user2@example.com',
      emailNotificationsEnabled: true,
    };

    const schedule = {
      id: 'sch-1',
      name: 'Test Schedule',
      timeZone: 'UTC',
      layers: [
        {
          name: 'Day Layer',
          start: new Date('2024-01-01'),
          end: null,
          rotationLengthHours: 24,
          users: [{ userId: user1.id, position: 0, user: user1 }],
        },
        {
          name: 'Night Layer',
          start: new Date('2024-01-01'),
          end: null,
          rotationLengthHours: 24,
          users: [{ userId: user2.id, position: 0, user: user2 }],
        },
      ],
      overrides: [],
    };

    const service = {
      id: 'svc-3',
      name: 'Test Service',
      policy: {
        id: 'pol-3',
        name: 'Test Policy',
        steps: [
          {
            stepOrder: 0,
            delayMinutes: 0,
            targetType: 'SCHEDULE',
            targetScheduleId: schedule.id,
          },
        ],
      },
    };

    const incident = {
      id: 'inc-3',
      title: 'Test Incident',
      serviceId: service.id,
      status: 'OPEN',
      urgency: 'HIGH',
      service: service,
    };

    // Mock Prisma responses
    vi.mocked(prisma.incident.findUnique).mockResolvedValue(incident as any);
    vi.mocked(prisma.onCallSchedule.findUnique).mockResolvedValue(schedule as any);
    vi.mocked(prisma.user.findUnique).mockImplementation(((args: any) => {
      if (args.where.id === user1.id) return Promise.resolve(user1 as any);
      if (args.where.id === user2.id) return Promise.resolve(user2 as any);
      return Promise.resolve(null);
    }) as any);
    vi.mocked(prisma.notificationProvider.findUnique).mockResolvedValue({
      provider: 'resend',
      enabled: true,
      config: { apiKey: 'test', fromEmail: 'test@test.com' }
    } as any);
    vi.mocked(prisma.incident.updateMany).mockResolvedValue({ count: 1 });

    const result = await executeEscalation(incident.id, 0);

    expect(result.escalated).toBe(true);
    expect(result.targetCount).toBeGreaterThanOrEqual(1); // At least one user

    expect(prisma.notification.create).toHaveBeenCalled();
  });
});
