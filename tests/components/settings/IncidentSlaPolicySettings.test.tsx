import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import IncidentSlaPolicySettings from '@/components/incident-sla/IncidentSlaPolicySettings';

vi.mock('@/app/(app)/settings/incident-sla/actions', () => ({
  saveIncidentSlaPolicyAction: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

describe('IncidentSlaPolicySettings', () => {
  it('shows the effective workspace policy when a service has no override', () => {
    render(
      <IncidentSlaPolicySettings
        scopeKey="service:payments"
        policy={null}
        workspacePolicy={{
          version: 5,
          inheritWorkspace: false,
          baseAckTargetMs: 15 * 60_000,
          baseResolveTargetMs: 120 * 60_000,
          rules: [],
        }}
        canManage={false}
      />
    );

    expect(screen.getByText('Workspace defaults · v5')).toBeInTheDocument();
    expect(screen.getByText('15 minutes')).toBeInTheDocument();
    expect(screen.getByText('120 minutes')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /inherit workspace defaults/i })).toBeChecked();
  });
});
