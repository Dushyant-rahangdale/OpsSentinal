import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsRow } from '@/components/settings/layout/SettingsRow';
import { SettingsSection } from '@/components/settings/layout/SettingsSection';

describe('SettingsRow help tooltip', () => {
  it('uses an accessible, portalled help trigger inside an overflow-hidden settings section', async () => {
    render(
      <SettingsSection title="Preferences">
        <SettingsRow
          label="Timezone"
          tooltip="Used for incident timestamps, on-call schedules, and quiet hours"
        >
          <input aria-label="Timezone value" />
        </SettingsRow>
      </SettingsSection>
    );

    const trigger = screen.getByRole('button', { name: 'More information about Timezone' });
    fireEvent.focus(trigger);

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Used for incident timestamps, on-call schedules, and quiet hours'
    );
  });
});
