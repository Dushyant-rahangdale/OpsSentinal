import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusPageServices from '@/components/status-page/StatusPageServices';

describe('status page service publication', () => {
  const services = [
    { id: 'internal', name: 'Internal database', status: 'OPERATIONAL', _count: { incidents: 0 } },
  ];

  it('does not expose internal services when no page mappings exist', () => {
    render(
      <StatusPageServices
        services={services}
        statusPageServices={[]}
        uptime90={{}}
        incidents={[]}
      />
    );
    expect(screen.queryByText('Internal database')).toBeNull();
  });

  it('publishes only explicit visible mappings', () => {
    render(
      <StatusPageServices
        services={services}
        statusPageServices={[
          { id: 'mapping', serviceId: 'internal', showOnPage: true, displayName: 'Public API' },
        ]}
        uptime90={{}}
        incidents={[]}
      />
    );
    expect(screen.getByText('Public API')).toBeDefined();
    expect(screen.queryByText('Internal database')).toBeNull();
  });
});
