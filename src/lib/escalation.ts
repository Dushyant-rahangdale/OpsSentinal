import { Prisma } from '@prisma/client';
import type { NotificationChannel } from './notifications';
import prisma from './prisma';
import { runSerializableTransaction } from './db-utils';
// import { sendNotification, NotificationChannel } from './notifications'; // Unused
import { buildScheduleBlocks } from './oncall';
import { logger } from './logger';
import { ESCALATION_LOCK_TIMEOUT_MS } from './config';
// import { formatDateTime } from './timezone'; // Unused

/**
 * Get all active on-call users for a schedule at a given time
 * Returns array of all users who are on-call across all active layers
 */
async function getOnCallUsersForSchedule(scheduleId: string, atTime: Date): Promise<string[]> {
  const schedule = await prisma.onCallSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      layers: {
        include: {
          users: {
            include: { user: true },
            orderBy: { position: 'asc' },
          },
        },
      },
      overrides: {
        where: {
          start: { lte: atTime },
          end: { gt: atTime },
        },
        include: {
          user: true,
        },
      },
    },
  });

  if (!schedule || schedule.layers.length === 0) {
    return [];
  }

  // Build schedule blocks to find who's on-call
  const windowStart = new Date(atTime);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(atTime);
  windowEnd.setHours(23, 59, 59, 999);

  const blocks = buildScheduleBlocks(
    schedule.layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      start: layer.start,
      end: layer.end,
      rotationLengthHours: layer.rotationLengthHours,
      users: layer.users.map(lu => ({
        userId: lu.userId,
        user: { name: lu.user.name },
        position: lu.position,
      })),
    })),
    schedule.overrides.map(override => ({
      id: override.id,
      userId: override.userId,
      user: { name: override.user.name },
      start: override.start,
      end: override.end,
      replacesUserId: override.replacesUserId,
    })),
    windowStart,
    windowEnd
  );

  // Find all blocks that are active at the current time
  // Multiple layers can be active simultaneously (e.g., "day" and "night" layers)
  const activeBlocks = blocks.filter(
    block => block.start.getTime() <= atTime.getTime() && block.end.getTime() > atTime.getTime()
  );

  // Extract unique user IDs from all active blocks
  const userIds = new Set<string>();
  for (const block of activeBlocks) {
    if (block.userId) {
      userIds.add(block.userId);
    }
  }

  return Array.from(userIds);
}

/**
 * Get all users in a team
 * If notifyOnlyTeamLead is true, returns only the team lead
 */
async function getTeamUsers(
  teamId: string,
  notifyOnlyTeamLead: boolean = false
): Promise<string[]> {
  if (notifyOnlyTeamLead) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { teamLeadId: true },
    });

    if (team?.teamLeadId) {
      const leadMembership = await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: team.teamLeadId,
          receiveTeamNotifications: true,
        },
        select: { userId: true },
      });

      if (leadMembership) {
        return [team.teamLeadId];
      }
    }
    // If team has no lead but notifyOnlyTeamLead is true, return empty array
    return [];
  }

  const members = await prisma.teamMember.findMany({
    where: {
      teamId,
      receiveTeamNotifications: true,
    },
    select: { userId: true },
  });
  return members.map(m => m.userId);
}

/**
 * Resolve escalation target to a list of user IDs
 * Supports: User (direct), Team (all members or only lead), Schedule (all active on-call users)
 */
export async function resolveEscalationTarget(
  targetType: 'USER' | 'TEAM' | 'SCHEDULE',
  targetId: string,
  atTime: Date = new Date(),
  notifyOnlyTeamLead: boolean = false
): Promise<string[]> {
  switch (targetType) {
    case 'USER':
      return [targetId];

    case 'TEAM':
      return await getTeamUsers(targetId, notifyOnlyTeamLead);

    case 'SCHEDULE':
      return await getOnCallUsersForSchedule(targetId, atTime);

    default:
      return [];
  }
}

/**
 * Execute escalation policy for an incident.
 * Handles multiple steps with delays and different target types.
 */
export async function executeEscalation(incidentId: string, stepIndex?: number) {
  const lockTimeoutMs = ESCALATION_LOCK_TIMEOUT_MS;
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      service: {
        include: {
          policy: {
            include: {
              steps: {
                include: {
                  targetUser: true,
                  targetTeam: true,
                  targetSchedule: true,
                },
                orderBy: { stepOrder: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  if (!incident || !incident.service.policy?.steps?.length) {
    // Clear escalation status if no policy
    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        escalationStatus: null,
        nextEscalationAt: null,
        currentEscalationStep: null,
        escalationProcessingAt: null,
      },
    });
    return { escalated: false, reason: 'No escalation policy configured' };
  }

  const policy = incident.service.policy;
  const policySteps = policy.steps;

  // Use provided stepIndex, or currentEscalationStep from DB, or default to 0
  const currentStepIndex = stepIndex ?? incident.currentEscalationStep ?? 0;

  if (currentStepIndex >= policySteps.length) {
    // Mark escalation as completed
    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        escalationStatus: 'COMPLETED',
        nextEscalationAt: null,
        currentEscalationStep: null,
        escalationProcessingAt: null,
      },
    });
    return { escalated: false, reason: 'All escalation steps exhausted' };
  }

  const now = new Date();
  const step = policySteps.find((_, index) => index === currentStepIndex);
  if (!step) {
    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        escalationStatus: 'COMPLETED',
        nextEscalationAt: null,
        currentEscalationStep: null,
        escalationProcessingAt: null,
      },
    });
    return { escalated: false, reason: 'Escalation step not found' };
  }

  const stepDelayMs = (step.delayMinutes || 0) * 60 * 1000;
  if (stepDelayMs > 0) {
    if (incident.nextEscalationAt && incident.nextEscalationAt.getTime() > now.getTime()) {
      return { escalated: false, reason: 'Escalation scheduled' };
    }

    const scheduledAt = new Date(now.getTime() + stepDelayMs);
    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        escalationStatus: 'ESCALATING',
        currentEscalationStep: currentStepIndex,
        nextEscalationAt: scheduledAt,
        escalationProcessingAt: null,
      },
    });

    await prisma.incidentEvent.create({
      data: {
        incidentId,
        message: `Escalation scheduled for [[scheduledAt=${scheduledAt.toISOString()}]] (${step.delayMinutes} minute delay)`,
      },
    });

    try {
      const { scheduleEscalation } = await import('./jobs/queue');
      await scheduleEscalation(incidentId, currentStepIndex, stepDelayMs);
    } catch (error) {
      logger.error('Failed to schedule initial escalation job', {
        incidentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return { escalated: false, reason: 'Escalation scheduled' };
  }

  const lockCutoff = new Date(now.getTime() - lockTimeoutMs);
  const stepMatch =
    currentStepIndex === 0
      ? { OR: [{ currentEscalationStep: null }, { currentEscalationStep: 0 }] }
      : { currentEscalationStep: currentStepIndex };
  const statusMatch =
    currentStepIndex === 0
      ? { OR: [{ escalationStatus: null }, { escalationStatus: 'ESCALATING' }] }
      : { escalationStatus: 'ESCALATING' };

  const claim = await prisma.incident.updateMany({
    where: {
      id: incidentId,
      AND: [
        stepMatch,
        statusMatch,
        {
          OR: [{ escalationProcessingAt: null }, { escalationProcessingAt: { lt: lockCutoff } }],
        },
      ],
    },
    data: {
      escalationStatus: 'ESCALATING',
      currentEscalationStep: currentStepIndex,
      escalationProcessingAt: now,
    },
  });

  if (claim.count === 0) {
    return { escalated: false, reason: 'Escalation already in progress' };
  }

  // Resolve target based on target type
  let targetId: string | null = null;
  let targetName: string = 'Unknown';

  switch (step.targetType) {
    case 'USER':
      targetId = step.targetUserId || null;
      targetName = step.targetUser?.name || 'Unknown User';
      break;
    case 'TEAM':
      targetId = step.targetTeamId || null;
      targetName = step.targetTeam?.name || 'Unknown Team';
      break;
    case 'SCHEDULE':
      targetId = step.targetScheduleId || null;
      targetName = step.targetSchedule?.name || 'Unknown Schedule';
      break;
  }

  if (!targetId) {
    const errorMessage = `Escalation step ${currentStepIndex + 1} has invalid target configuration (${step.targetType} with no target ID).`;
    logger.error('Escalation step has invalid target', {
      incidentId,
      stepIndex: currentStepIndex,
      targetType: step.targetType,
      targetUserId: step.targetUserId,
      targetTeamId: step.targetTeamId,
      targetScheduleId: step.targetScheduleId,
    });

    const isLastStep = currentStepIndex >= policySteps.length - 1;

    await runSerializableTransaction(async tx => {
      await tx.incidentEvent.create({
        data: {
          incidentId,
          message:
            errorMessage + (isLastStep ? ' Escalation complete.' : ' Skipping to next step.'),
        },
      });

      if (isLastStep) {
        await tx.incident.update({
          where: { id: incidentId },
          data: {
            escalationStatus: 'COMPLETED',
            nextEscalationAt: null,
            escalationProcessingAt: null,
            currentEscalationStep: null,
          },
        });
      } else {
        await tx.incident.update({
          where: { id: incidentId },
          data: {
            currentEscalationStep: currentStepIndex + 1,
            escalationProcessingAt: null,
          },
        });
      }
    });

    // Try next step
    if (!isLastStep) {
      return executeEscalation(incidentId, currentStepIndex + 1);
    }
    return { escalated: false, reason: 'Invalid target configuration' };
  }

  // Resolve to user IDs using resolveEscalationTarget
  const notifyOnlyTeamLead = step.notifyOnlyTeamLead || false;
  const targetUserIds = await resolveEscalationTarget(
    step.targetType,
    targetId,
    new Date(),
    notifyOnlyTeamLead
  );

  // Assign the incident immediately when the escalation step runs (before notifications)
  // Assign the incident immediately when the escalation step runs (before notifications)
  await runSerializableTransaction(async tx => {
    const currentIncident = await tx.incident.findUnique({
      where: { id: incidentId },
      select: { assigneeId: true, teamId: true },
    });

    if (currentIncident?.assigneeId || currentIncident?.teamId) {
      return;
    }

    if (step.targetType === 'TEAM' && targetId) {
      await tx.incident.update({
        where: { id: incidentId },
        data: {
          team: { connect: { id: targetId } },
          assignee: { disconnect: true },
        },
      });
      return;
    }

    if (targetUserIds.length > 0) {
      await tx.incident.update({
        where: { id: incidentId },
        data: {
          assignee: { connect: { id: targetUserIds[0] } },
          team: { disconnect: true },
        },
      });
    }
  });

  if (targetUserIds.length === 0) {
    const errorMessage = `Escalation step ${currentStepIndex + 1} (${step.targetType}: ${targetName}) resolved to no users.`;
    logger.warn('Escalation target resolved to no users', {
      incidentId,
      stepIndex: currentStepIndex,
      targetType: step.targetType,
      targetId,
      targetName,
    });

    const isLastStep = currentStepIndex >= policySteps.length - 1;

    await runSerializableTransaction(async tx => {
      await tx.incidentEvent.create({
        data: {
          incidentId,
          message:
            errorMessage + (isLastStep ? ' Escalation complete.' : ' Skipping to next step.'),
        },
      });

      if (isLastStep) {
        await tx.incident.update({
          where: { id: incidentId },
          data: {
            escalationStatus: 'COMPLETED',
            nextEscalationAt: null,
            escalationProcessingAt: null,
            currentEscalationStep: null,
          },
        });
      } else {
        await tx.incident.update({
          where: { id: incidentId },
          data: {
            currentEscalationStep: currentStepIndex + 1,
            escalationProcessingAt: null,
          },
        });
      }
    });

    // Try next step
    if (!isLastStep) {
      return executeEscalation(incidentId, currentStepIndex + 1);
    }
    return { escalated: false, reason: 'No users to notify' };
  }

  // Send notifications to all resolved users
  // Use escalation step channels if specified, otherwise use user preferences
  const { sendUserNotification } = await import('./user-notifications');
  const notificationsSent = [];
  const escalationChannels: NotificationChannel[] | undefined =
    step.notificationChannels.length > 0 ? step.notificationChannels : undefined;

  for (const userId of targetUserIds) {
    const message = `[OpsKnight] Incident: ${incident.title}${currentStepIndex > 0 ? ` (Escalation Level ${currentStepIndex + 1})` : ''}`;
    const result = await sendUserNotification(incidentId, userId, message, escalationChannels);
    notificationsSent.push({ userId, result });
  }

  // Create event message
  const targetDescription =
    step.targetType === 'USER'
      ? targetName
      : `${step.targetType}: ${targetName} (${targetUserIds.length} user${targetUserIds.length !== 1 ? 's' : ''})`;

  // Determine next escalation step and schedule it
  const nextStepIndex = currentStepIndex + 1;
  const nextStep =
    nextStepIndex < policySteps.length
      ? (policySteps.find((_, index) => index === nextStepIndex) ?? null)
      : null;
  let nextEscalationAt: Date | null = null;
  let escalationStatus: string = nextStep ? 'ESCALATING' : 'COMPLETED';
  let nextStepMessage: string | null = null;

  if (nextStep) {
    const delayMs = nextStep.delayMinutes * 60 * 1000;
    nextEscalationAt = new Date(Date.now() + delayMs);
    escalationStatus = 'ESCALATING';
    nextStepMessage = `Next escalation step scheduled for [[scheduledAt=${nextEscalationAt.toISOString()}]] (${nextStep.delayMinutes} minute delay)`;
  }

  await runSerializableTransaction(async tx => {
    // Check current assignee/team state from database to avoid race conditions
    const currentIncident = await tx.incident.findUnique({
      where: { id: incidentId },
      select: { assigneeId: true, teamId: true },
    });

    const updateData: Prisma.IncidentUpdateInput = {
      currentEscalationStep: nextStepIndex < policySteps.length ? nextStepIndex : null,
      nextEscalationAt,
      escalationStatus,
      escalationProcessingAt: null,
    };

    // Assign based on target type
    // Only assign if the incident doesn't already have an assignee or team
    if (!currentIncident?.assigneeId && !currentIncident?.teamId && targetUserIds.length > 0) {
      if (step.targetType === 'TEAM' && targetId) {
        // Assign to team
        updateData.team = { connect: { id: targetId } };
        // Clear any user assignment
        updateData.assignee = { disconnect: true };
      } else {
        // Assign to first user (for USER or SCHEDULE target types)
        updateData.assignee = { connect: { id: targetUserIds[0] } };
        // Clear any team assignment
        updateData.team = { disconnect: true };
      }
    }

    await tx.incident.update({
      where: { id: incidentId },
      data: updateData,
    });

    await tx.incidentEvent.create({
      data: {
        incidentId,
        message: `Escalated to ${targetDescription} (Level ${currentStepIndex + 1}${step.delayMinutes > 0 ? `, after ${step.delayMinutes} minute delay` : ''})`,
      },
    });

    if (nextStepMessage) {
      await tx.incidentEvent.create({
        data: {
          incidentId,
          message: nextStepMessage,
        },
      });
    }
  });

  // Schedule next escalation step using PostgreSQL job queue
  if (nextStep && nextEscalationAt) {
    try {
      const { scheduleEscalation } = await import('./jobs/queue');
      const delayMs = nextStep.delayMinutes * 60 * 1000;
      await scheduleEscalation(incidentId, nextStepIndex, delayMs);
    } catch (error) {
      logger.error('Failed to schedule escalation job', {
        incidentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue anyway - internal worker will pick it up via nextEscalationAt
    }
  }

  return {
    escalated: true,
    targetName,
    targetType: step.targetType,
    targetCount: targetUserIds.length,
    stepIndex: currentStepIndex,
    notifications: notificationsSent,
    nextStepScheduled: nextStepIndex < policySteps.length,
  };
}

/**
 * Check and execute pending escalations
 * This should be called periodically (e.g., via cron job) to process delayed escalations
 */
export async function processPendingEscalations(
  executor: (
    incidentId: string,
    stepIndex?: number
  ) => Promise<{ escalated: boolean; reason?: string }> = executeEscalation
) {
  const now = new Date();
  const lockCutoff = new Date(now.getTime() - ESCALATION_LOCK_TIMEOUT_MS);

  // Find incidents that need escalation (nextEscalationAt is in the past, still open/unacknowledged)
  const incidentsToEscalate = await prisma.incident.findMany({
    where: {
      nextEscalationAt: {
        lte: now,
      },
      escalationStatus: 'ESCALATING',
      OR: [{ escalationProcessingAt: null }, { escalationProcessingAt: { lt: lockCutoff } }],
      status: {
        in: ['OPEN', 'SNOOZED'], // Only escalate if still open or snoozed
      },
    },
    take: 50, // Process in batches to avoid OOM
    orderBy: { nextEscalationAt: 'asc' }, // Process oldest due first
    select: {
      id: true,
      currentEscalationStep: true,
      escalationStatus: true,
    },
  });

  let processed = 0;
  const errors: string[] = [];

  for (const incident of incidentsToEscalate) {
    try {
      // Get the current step index (default to 0 if not set)
      const currentStepIndex = incident.currentEscalationStep ?? 0;

      // Execute the next escalation step
      const result = await executor(incident.id, currentStepIndex);

      if (result.escalated) {
        processed++;
      } else {
        // If escalation failed or completed, update status
        await prisma.incident.update({
          where: { id: incident.id },
          data: {
            escalationStatus:
              result.reason?.includes('exhausted') || result.reason?.includes('completed')
                ? 'COMPLETED'
                : 'ESCALATING',
            nextEscalationAt: null,
            escalationProcessingAt: null,
          },
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const isRetryable =
        errorMessage.includes('Serialization') ||
        errorMessage.includes('deadlock') ||
        errorMessage.includes('Connection');

      logger.error('Error processing escalation', {
        incidentId: incident.id,
        error: errorMessage,
        stack: errorStack,
        currentStep: incident.currentEscalationStep,
        escalationStatus: incident.escalationStatus,
        isRetryable,
      });
      errors.push(`Incident ${incident.id}: ${errorMessage}`);

      // Update incident to prevent infinite retries on same error
      try {
        if (!isRetryable) {
          // Only stop escalation for non-retryable errors
          await prisma.incident.update({
            where: { id: incident.id },
            data: {
              escalationStatus: 'COMPLETED',
              nextEscalationAt: null,
              escalationProcessingAt: null,
            },
          });

          // Log error event
          await prisma.incidentEvent
            .create({
              data: {
                incidentId: incident.id,
                message: `Escalation processing failed (FATAL): ${errorMessage}`,
              },
            })
            .catch(() => {
              // Ignore event creation errors
            });
        } else {
          // For retryable errors, just clear the processing lock so it picks up again
          await prisma.incident.update({
            where: { id: incident.id },
            data: {
              escalationProcessingAt: null, // Release lock
              // We don't change nextEscalationAt, so it will be picked up immediately in next run
            },
          });
          logger.warn('Escalation failed with retryable error, releasing lock', {
            incidentId: incident.id,
          });
        }
      } catch (updateError) {
        logger.error('Failed to update incident after escalation error', {
          incidentId: incident.id,
          updateError: updateError instanceof Error ? updateError.message : 'Unknown error',
        });
      }
    }
  }

  return {
    processed,
    total: incidentsToEscalate.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}
