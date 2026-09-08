'use server';

import { saveIncidentSlaPolicy } from '@/lib/incident-sla/policy-config';
import { saveWorkspaceClassificationPolicy } from '@/lib/incidents/classification-policy';

export async function saveIncidentSlaPolicyAction(input: unknown) {
  return saveIncidentSlaPolicy(input);
}

export async function saveWorkspaceClassificationPolicyAction(input: unknown) {
  return saveWorkspaceClassificationPolicy(input);
}
