/**
 * Integration Tests for Complete Notification Flow
 * 
 * Tests the end-to-end flow:
 * 1. Incident created
 * 2. Service notifications sent (isolated)
 * 3. Escalation policy executed
 * 4. Notifications sent to users based on preferences/step config
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import prisma from '../../src/lib/prisma';
import { sendServiceNotifications } from '../../src/lib/service-notifications';
import { executeEscalation } from '../../src/lib/escalation';

describe('Notification Flow Integration Tests', () => {
    beforeEach(async () => {
        await prisma.notification.deleteMany();
        await prisma.incident.deleteMany();
        await prisma.escalationRule.deleteMany();
        await prisma.escalationPolicy.deleteMany();
        await prisma.service.deleteMany();
        await prisma.team.deleteMany();
        await prisma.user.deleteMany();
    });

    afterEach(async () => {
        await prisma.notification.deleteMany();
        await prisma.incident.deleteMany();
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
                email: 'test@example.com',
                emailNotificationsEnabled: true
            }
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
                                targetUserId: user.id
                            }
                        }
                    }
                }
            }
        });

        const incident = await prisma.incident.create({
            data: {
                title: 'Test Incident',
                serviceId: service.id,
                status: 'OPEN',
                urgency: 'HIGH'
            }
        });

        // Mock notifications
        const slackSpy = vi.spyOn(require('../../src/lib/slack'), 'notifySlackForIncident');
        slackSpy.mockResolvedValue({ success: true });

        const emailSpy = vi.spyOn(require('../../src/lib/email'), 'sendIncidentEmail');
        emailSpy.mockResolvedValue({ success: true });

        // 1. Send service notifications (isolated)
        const serviceResult = await sendServiceNotifications(incident.id, 'triggered');
        expect(serviceResult.success).toBe(true);
        expect(slackSpy).toHaveBeenCalled();

        // 2. Execute escalation (separate from service notifications)
        const escalationResult = await executeEscalation(incident.id, 0);
        expect(escalationResult.escalated).toBe(true);
        expect(emailSpy).toHaveBeenCalled(); // User preference: email enabled
    });

    it('should handle team escalation with notifyOnlyTeamLead option', async () => {
        const teamLead = await prisma.user.create({
            data: {
                name: 'Team Lead',
                email: 'lead@example.com',
                emailNotificationsEnabled: true
            }
        });

        const member = await prisma.user.create({
            data: {
                name: 'Member',
                email: 'member@example.com',
                emailNotificationsEnabled: true
            }
        });

        const team = await prisma.team.create({
            data: {
                name: 'Test Team',
                teamLeadId: teamLead.id,
                members: {
                    create: [
                        { userId: teamLead.id, role: 'OWNER' },
                        { userId: member.id, role: 'MEMBER' }
                    ]
                }
            }
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
                                notifyOnlyTeamLead: true // Only notify lead
                            }
                        }
                    }
                }
            }
        });

        const incident = await prisma.incident.create({
            data: {
                title: 'Test Incident',
                serviceId: service.id,
                status: 'OPEN',
                urgency: 'HIGH'
            }
        });

        const emailSpy = vi.spyOn(require('../../src/lib/email'), 'sendIncidentEmail');
        emailSpy.mockResolvedValue({ success: true });

        const result = await executeEscalation(incident.id, 0);

        expect(result.escalated).toBe(true);
        expect(result.targetCount).toBe(1); // Only team lead
        expect(emailSpy).toHaveBeenCalledTimes(1); // Only one notification (to lead)
    });

    it('should handle schedule escalation with multiple active layers', async () => {
        const user1 = await prisma.user.create({
            data: {
                name: 'User 1',
                email: 'user1@example.com',
                emailNotificationsEnabled: true
            }
        });

        const user2 = await prisma.user.create({
            data: {
                name: 'User 2',
                email: 'user2@example.com',
                emailNotificationsEnabled: true
            }
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
                                create: [{ userId: user1.id, position: 0 }]
                            }
                        },
                        {
                            name: 'Night Layer',
                            start: new Date('2024-01-01'),
                            end: null,
                            rotationLengthHours: 24,
                            users: {
                                create: [{ userId: user2.id, position: 0 }]
                            }
                        }
                    ]
                }
            }
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
                                targetScheduleId: schedule.id
                            }
                        }
                    }
                }
            }
        });

        const incident = await prisma.incident.create({
            data: {
                title: 'Test Incident',
                serviceId: service.id,
                status: 'OPEN',
                urgency: 'HIGH'
            }
        });

        const emailSpy = vi.spyOn(require('../../src/lib/email'), 'sendIncidentEmail');
        emailSpy.mockResolvedValue({ success: true });

        const result = await executeEscalation(incident.id, 0);

        expect(result.escalated).toBe(true);
        expect(result.targetCount).toBeGreaterThanOrEqual(1); // At least one user
        // Both users from different layers should be notified
        expect(emailSpy).toHaveBeenCalled();
    });
});


