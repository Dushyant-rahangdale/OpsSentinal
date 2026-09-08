'use server';

import { ZodError } from 'zod';
import { saveIncidentSlaPolicy } from '@/lib/incident-sla/policy-config';
import { saveWorkspaceClassificationPolicy } from '@/lib/incidents/classification-policy';
import { logger } from '@/lib/logger';

export type IncidentResponsePolicySaveResult =
  | { ok: true; version: number }
  | {
      ok: false;
      code: 'VALIDATION' | 'CONFLICT' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'UNEXPECTED';
      message: string;
    };

function policySaveError(error: unknown, fallbackMessage: string): IncidentResponsePolicySaveResult {
  if (error instanceof ZodError) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: error.issues[0]?.message ?? 'Check the policy values and try again.',
    };
  }
  if (error instanceof Error) {
    if (error.message.includes('changed. Reload settings before saving.')) {
      return {
        ok: false,
        code: 'CONFLICT',
        message: 'This policy changed in another session. Reload the page and review the latest version.',
      };
    }
    if (error.message.startsWith('Unauthorized')) {
      return {
        ok: false,
        code: 'UNAUTHORIZED',
        message: 'You no longer have permission to change this policy.',
      };
    }
    if (error.message.endsWith('not found')) {
      return { ok: false, code: 'NOT_FOUND', message: error.message };
    }
  }

  logger.error('[IncidentResponsePolicy] Save failed', { error });
  return { ok: false, code: 'UNEXPECTED', message: fallbackMessage };
}

export async function saveIncidentSlaPolicyAction(
  input: unknown
): Promise<IncidentResponsePolicySaveResult> {
  try {
    const policy = await saveIncidentSlaPolicy(input);
    return { ok: true, version: policy.version };
  } catch (error) {
    return policySaveError(error, 'Unable to save the incident response SLA policy. Try again.');
  }
}

export async function saveWorkspaceClassificationPolicyAction(
  input: unknown
): Promise<IncidentResponsePolicySaveResult> {
  try {
    const policy = await saveWorkspaceClassificationPolicy(input);
    return { ok: true, version: policy.version };
  } catch (error) {
    return policySaveError(error, 'Unable to save the alert classification policy. Try again.');
  }
}
