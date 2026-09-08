'use server';

import { saveIncidentSlaPolicy } from '@/lib/incident-sla/policy-config';

export async function saveIncidentSlaPolicyAction(input: unknown) {
  return saveIncidentSlaPolicy(input);
}
