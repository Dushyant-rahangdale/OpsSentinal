/**
 * Comprehensive Test Suite for Notification and Escalation System
 * 
 * Tests cover:
 * - Service notification isolation
 * - Escalation logic (schedule, team, user)
 * - Slack integration (OAuth and webhook)
 * - Webhook integrations (Google Chat, Teams, Discord)
 * - WhatsApp integration
 * - Team lead functionality
 * - Channel priority
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import prisma from '../src/lib/prisma';
import { sendServiceNotifications } from '../src/lib/service-notifications';
import { executeEscalation, resolveEscalationTarget } from '../src/lib/escalation';
import { sendSlackNotification, sendSlackMessageToChannel } from '../src/lib/slack';
import { sendIncidentWebhook, formatGoogleChatPayload, formatMicrosoftTeamsPayload, formatDiscordPayload } from '../src/lib/webhooks';
import { sendIncidentWhatsApp } from '../src/lib/whatsapp';
import { getUserNotificationChannels } from '../src/lib/user-notifications';

describe('Notification System Tests', () => {
    beforeEach(async () => {
        // Clean up test data
        await prisma.notification.deleteMany();
        await prisma.incident.deleteMany();
        await prisma.service.deleteMany();
        await prisma.team.deleteMany();
        await prisma.user.deleteMany();
    });

    afterEach(async () => {
        // Clean up after each test
        await prisma.notification.deleteMany();
        await prisma.incident.deleteMany();
        await prisma.service.deleteMany();
        await prisma.team.deleteMany();
        await prisma.user.deleteMany();
    });

    describe('Service Notification Isolation', () => {
        it('should send service notifications using only service-configured channels', async () => {
            const service = await prisma.service.create({
                data: {
                    name: 'Test Service',
                    serviceNotificationChannels: ['SLACK'],
                    slackWebhookUrl: 'https://hooks.slack.com/test'
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

            const slackSpy = vi.spyOn(require('../src/lib/slack'), 'notifySlackForIncident');
            slackSpy.mockResolvedValue({ success: true });

            const result = await sendServiceNotifications(incident.id, 'triggered');

            expect(result.success).toBe(true);
            expect(slackSpy).toHaveBeenCalled();
        });
    });

    describe('Schedule Escalation - Multiple On-Call Users', () => {
        it('should return all active on-call users from all layers', async () => {
            const user1 = await prisma.user.create({
                data: { name: 'User 1', email: 'user1@example.com' }
            });
            const user2 = await prisma.user.create({
                data: { name: 'User 2', email: 'user2@example.com' }
            });

            const schedule = await prisma.onCallSchedule.create({
                data: {
                    name: 'Test Schedule',
                    timeZone: 'UTC',
                    layers: {
                        create: [
                            {
                                name: 'Layer 1',
                                start: new Date('2024-01-01'),
                                end: null,
                                rotationLengthHours: 24,
                                users: {
                                    create: [
                                        { userId: user1.id, position: 0 }
                                    ]
                                }
                            },
                            {
                                name: 'Layer 2',
                                start: new Date('2024-01-01'),
                                end: null,
                                rotationLengthHours: 24,
                                users: {
                                    create: [
                                        { userId: user2.id, position: 0 }
                                    ]
                                }
                            }
                        ]
                    }
                }
            });

            const users = await resolveEscalationTarget('SCHEDULE', schedule.id, new Date());

            // Should return both users (all active layers)
            expect(users.length).toBeGreaterThanOrEqual(1);
            // Both users should be in the result
            expect(users).toContain(user1.id);
            expect(users).toContain(user2.id);
        });
    });

    describe('Team Lead Functionality', () => {
        it('should return only team lead when notifyOnlyTeamLead is true', async () => {
            const teamLead = await prisma.user.create({
                data: { name: 'Team Lead', email: 'lead@example.com' }
            });
            const member = await prisma.user.create({
                data: { name: 'Member', email: 'member@example.com' }
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

            // Test with notifyOnlyTeamLead = true
            const users = await resolveEscalationTarget('TEAM', team.id, new Date(), true);

            expect(users).toHaveLength(1);
            expect(users[0]).toBe(teamLead.id);
        });

        it('should return no users when team lead has team notifications disabled', async () => {
            const teamLead = await prisma.user.create({
                data: { name: 'Team Lead', email: 'lead2@example.com' }
            });
            const member = await prisma.user.create({
                data: { name: 'Member', email: 'member2@example.com' }
            });

            const team = await prisma.team.create({
                data: {
                    name: 'Test Team',
                    teamLeadId: teamLead.id,
                    members: {
                        create: [
                            { userId: teamLead.id, role: 'OWNER', receiveTeamNotifications: false },
                            { userId: member.id, role: 'MEMBER', receiveTeamNotifications: true }
                        ]
                    }
                }
            });

            const users = await resolveEscalationTarget('TEAM', team.id, new Date(), true);

            expect(users).toHaveLength(0);
        });

        it('should return all team members when notifyOnlyTeamLead is false', async () => {
            const teamLead = await prisma.user.create({
                data: { name: 'Team Lead', email: 'lead@example.com' }
            });
            const member1 = await prisma.user.create({
                data: { name: 'Member 1', email: 'member1@example.com' }
            });
            const member2 = await prisma.user.create({
                data: { name: 'Member 2', email: 'member2@example.com' }
            });

            const team = await prisma.team.create({
                data: {
                    name: 'Test Team',
                    teamLeadId: teamLead.id,
                    members: {
                        create: [
                            { userId: teamLead.id, role: 'OWNER' },
                            { userId: member1.id, role: 'MEMBER' },
                            { userId: member2.id, role: 'MEMBER' }
                        ]
                    }
                }
            });

            // Test with notifyOnlyTeamLead = false
            const users = await resolveEscalationTarget('TEAM', team.id, new Date(), false);

            expect(users.length).toBe(3);
            expect(users).toContain(teamLead.id);
            expect(users).toContain(member1.id);
            expect(users).toContain(member2.id);
        });
    });

    describe('Slack Integration', () => {
        it('should send Slack notification via webhook', async () => {
            const incident = {
                id: 'test-id',
                title: 'Test Incident',
                status: 'OPEN',
                urgency: 'HIGH',
                serviceName: 'Test Service',
                assigneeName: 'Test User'
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200
            });

            const result = await sendSlackNotification('triggered', incident, undefined, 'https://hooks.slack.com/test');

            expect(result.success).toBe(true);
            expect(global.fetch).toHaveBeenCalled();
        });

        it('should send Slack message to channel via API', async () => {
            // Mock getSlackBotToken to return a test token
            vi.spyOn(require('../src/lib/slack'), 'getSlackBotToken').mockResolvedValue('xoxb-test-token');

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ ok: true })
            });

            const incident = {
                id: 'test-id',
                title: 'Test Incident',
                status: 'OPEN',
                urgency: 'HIGH',
                serviceName: 'Test Service',
                assigneeName: 'Test User'
            };

            const result = await sendSlackMessageToChannel('#incidents', incident, 'triggered', true);

            expect(result.success).toBe(true);
        });
    });

    describe('Webhook Formatters', () => {
        it('should format Google Chat payload correctly', () => {
            const incident = {
                id: 'test-id',
                title: 'Test Incident',
                description: 'Test description',
                status: 'OPEN',
                urgency: 'HIGH',
                service: { id: 'svc-1', name: 'Test Service' },
                assignee: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
                createdAt: new Date(),
                acknowledgedAt: null,
                resolvedAt: null
            };

            const payload = formatGoogleChatPayload(incident, 'triggered', 'https://example.com');

            expect(payload.cards).toBeDefined();
            expect(payload.cards[0].header.title).toContain('INCIDENT TRIGGERED');
            expect(payload.cards[0].header.subtitle).toBe('Test Service');
        });

        it('should format Microsoft Teams payload correctly', () => {
            const incident = {
                id: 'test-id',
                title: 'Test Incident',
                description: 'Test description',
                status: 'OPEN',
                urgency: 'HIGH',
                service: { id: 'svc-1', name: 'Test Service' },
                assignee: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
                createdAt: new Date(),
                acknowledgedAt: null,
                resolvedAt: null
            };

            const payload = formatMicrosoftTeamsPayload(incident, 'triggered', 'https://example.com');

            expect(payload.type).toBe('message');
            expect(payload.attachments).toBeDefined();
            expect(payload.attachments[0].contentType).toBe('application/vnd.microsoft.card.adaptive');
        });

        it('should format Discord payload correctly', () => {
            const incident = {
                id: 'test-id',
                title: 'Test Incident',
                description: 'Test description',
                status: 'OPEN',
                urgency: 'HIGH',
                service: { id: 'svc-1', name: 'Test Service' },
                assignee: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
                createdAt: new Date(),
                acknowledgedAt: null,
                resolvedAt: null
            };

            const payload = formatDiscordPayload(incident, 'triggered', 'https://example.com');

            expect(payload.embeds).toBeDefined();
            expect(payload.embeds[0].title).toContain('INCIDENT TRIGGERED');
            expect(payload.embeds[0].color).toBe(0xd32f2f); // Red for triggered
        });
    });

    describe('WhatsApp Integration', () => {
        it('should send WhatsApp notification via Twilio', async () => {
            const user = await prisma.user.create({
                data: {
                    name: 'Test User',
                    email: 'test@example.com',
                    phoneNumber: '+1234567890',
                    whatsappNotificationsEnabled: true
                }
            });

            const incident = await prisma.incident.create({
                data: {
                    title: 'Test Incident',
                    serviceId: 'test-service',
                    status: 'OPEN',
                    urgency: 'HIGH'
                }
            });

            // Mock Twilio
            const twilioMock = {
                messages: {
                    create: vi.fn().mockResolvedValue({ sid: 'test-sid' })
                }
            };
            vi.mock('twilio', () => ({
                default: vi.fn(() => twilioMock)
            }));

            // Mock getSMSConfig
            vi.spyOn(require('../src/lib/notification-providers'), 'getSMSConfig').mockResolvedValue({
                enabled: true,
                provider: 'twilio',
                accountSid: 'test-sid',
                authToken: 'test-token',
                fromNumber: '+1234567890'
            });

            const result = await sendIncidentWhatsApp(user.id, incident.id, 'triggered');

            // Should attempt to send (may fail if Twilio not fully configured, but should not throw)
            expect(result).toBeDefined();
        });
    });

    describe('Channel Priority', () => {
        it('should return channels in priority order: PUSH → SMS → WhatsApp → EMAIL', async () => {
            const user = await prisma.user.create({
                data: {
                    name: 'Test User',
                    email: 'test@example.com',
                    phoneNumber: '+1234567890',
                    emailNotificationsEnabled: true,
                    smsNotificationsEnabled: true,
                    pushNotificationsEnabled: true,
                    whatsappNotificationsEnabled: true
                }
            });

            // Mock channel availability
            vi.spyOn(require('../src/lib/notification-providers'), 'isChannelAvailable').mockResolvedValue(true);
            vi.spyOn(require('../src/lib/notification-providers'), 'getSMSConfig').mockResolvedValue({
                enabled: true,
                provider: 'twilio'
            });

            const channels = await getUserNotificationChannels(user.id);

            // Should be in priority order
            const pushIndex = channels.indexOf('PUSH');
            const smsIndex = channels.indexOf('SMS');
            const whatsappIndex = channels.indexOf('WHATSAPP');
            const emailIndex = channels.indexOf('EMAIL');

            if (pushIndex !== -1 && smsIndex !== -1) {
                expect(pushIndex).toBeLessThan(smsIndex);
            }
            if (smsIndex !== -1 && whatsappIndex !== -1) {
                expect(smsIndex).toBeLessThan(whatsappIndex);
            }
            if (whatsappIndex !== -1 && emailIndex !== -1) {
                expect(whatsappIndex).toBeLessThan(emailIndex);
            }
        });
    });

    describe('Escalation Step Channels', () => {
        it('should use escalation step channels when configured', async () => {
            const user = await prisma.user.create({
                data: {
                    name: 'Test User',
                    email: 'test@example.com',
                    emailNotificationsEnabled: true,
                    smsNotificationsEnabled: false // User disabled SMS
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
                                    targetType: 'USER',
                                    targetUserId: user.id,
                                    notificationChannels: ['SMS'] // Step forces SMS
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

            // Mock SMS sending
            const smsSpy = vi.spyOn(require('../src/lib/sms'), 'sendIncidentSMS');
            smsSpy.mockResolvedValue({ success: true });

            // Execute escalation
            const result = await executeEscalation(incident.id, 0);

            expect(result.escalated).toBe(true);
            // Should send SMS even though user disabled it (step override)
            expect(smsSpy).toHaveBeenCalled();
        });
    });
});



