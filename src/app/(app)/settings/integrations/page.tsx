'use client';

import { SettingsPageHeader } from '@/components/settings/layout/SettingsPageHeader';
import { SettingsSection } from '@/components/settings/layout/SettingsSection';
import { EmptyState } from '@/components/settings/feedback/EmptyState';
import { Button } from '@/components/ui/shadcn/button';
import Link from 'next/link';
import { Slack, Puzzle, ArrowRight } from 'lucide-react';

export default function IntegrationsSettingsPage() {
  return (
    <div className="space-y-6 [zoom:0.7]">
      <SettingsPageHeader
        title="Integrations"
        description="Connect OpsKnight with the tools your team relies on."
        backHref="/settings"
        backLabel="Back to Settings"
      />

      <SettingsSection
        title="Available Integrations"
        description="Enable integrations to automate alerts and workflows"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Slack Integration Card */}
          <Link
            href="/settings/integrations/slack"
            className="group relative p-6 rounded-lg border border-border bg-card hover:bg-accent hover:shadow-md hover:border-primary/20 transition-all duration-200"
          >
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[#4A154B]/10 w-fit">
                <Slack className="h-6 w-6 text-[#4A154B]" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                  Slack
                </h3>
                <p className="text-sm text-muted-foreground">
                  Send incident alerts and updates to Slack channels
                </p>
              </div>
            </div>
            <ArrowRight className="absolute top-6 right-6 h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Placeholder for future integrations */}
          <div className="relative p-6 rounded-lg border border-dashed border-border bg-muted/30 opacity-60">
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted w-fit">
                <Puzzle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">More Coming Soon</h3>
                <p className="text-sm text-muted-foreground">
                  Additional integrations will be available soon
                </p>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Custom Webhooks"
        description="Request new integrations or manage custom webhooks"
      >
        <EmptyState
          icon={Puzzle}
          title="No additional integrations yet"
          description="Add a new integration once your workspace connects other tools."
          action={
            <Link href="/settings/notifications">
              <Button variant="outline">Configure Notification Providers</Button>
            </Link>
          }
        />
      </SettingsSection>
    </div>
  );
}
