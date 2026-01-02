export type ServiceDynamicStatus = 'OPERATIONAL' | 'DEGRADED' | 'CRITICAL';

export function getServiceDynamicStatus({
  openIncidentCount,
  hasCritical,
}: {
  openIncidentCount: number;
  hasCritical: boolean;
}): ServiceDynamicStatus {
  if (hasCritical) {
    return 'CRITICAL';
  }

  if (openIncidentCount > 0) {
    return 'DEGRADED';
  }

  return 'OPERATIONAL';
}
