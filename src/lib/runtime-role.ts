export const OPSKNIGHT_PROCESS_ROLES = [
  'integrated',
  'web',
  'scheduler',
  'worker',
  'critical-worker',
  'bulk-worker',
  'status-projector',
] as const;

export type OpsKnightProcessRole = (typeof OPSKNIGHT_PROCESS_ROLES)[number];

export interface RuntimeResponsibilities {
  startScheduler: boolean;
  startJobWorker: boolean;
  workerLane: 'all' | 'critical' | 'bulk' | 'projector' | null;
}

const DEFAULT_PROCESS_ROLE: OpsKnightProcessRole = 'integrated';

/**
 * Resolve the role for this process.
 *
 * The default preserves the single-process self-hosted runtime while also
 * running the durable job worker in-process. This keeps Docker Compose and
 * other integrated installs low-latency without requiring a separate worker
 * container, while split deployments can continue to isolate web, scheduler,
 * and worker responsibilities.
 */
export function getOpsKnightProcessRole(
  value: string | undefined = process.env.OPSKNIGHT_PROCESS_ROLE
): OpsKnightProcessRole {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return DEFAULT_PROCESS_ROLE;

  if ((OPSKNIGHT_PROCESS_ROLES as readonly string[]).includes(normalized)) {
    return normalized as OpsKnightProcessRole;
  }

  throw new Error(
    `Invalid OPSKNIGHT_PROCESS_ROLE "${normalized}". Expected one of: ${OPSKNIGHT_PROCESS_ROLES.join(', ')}.`
  );
}

/**
 * Keep process-role policy in one place so startup code and tests cannot drift.
 */
export function getRuntimeResponsibilities(role: OpsKnightProcessRole): RuntimeResponsibilities {
  switch (role) {
    case 'integrated':
      return { startScheduler: true, startJobWorker: true, workerLane: 'all' };
    case 'web':
      return { startScheduler: false, startJobWorker: false, workerLane: null };
    case 'scheduler':
      return { startScheduler: true, startJobWorker: false, workerLane: null };
    case 'worker':
      return { startScheduler: false, startJobWorker: true, workerLane: 'all' };
    case 'critical-worker':
      return { startScheduler: false, startJobWorker: true, workerLane: 'critical' };
    case 'bulk-worker':
      return { startScheduler: false, startJobWorker: true, workerLane: 'bulk' };
    case 'status-projector':
      return { startScheduler: false, startJobWorker: true, workerLane: 'projector' };
  }
}
