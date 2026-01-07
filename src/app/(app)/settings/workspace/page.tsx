'use client'

import { SettingsPageHeader } from '@/components/settings/layout/SettingsPageHeader'
import { SettingsSection } from '@/components/settings/layout/SettingsSection'
import { EmptyState } from '@/components/settings/feedback/EmptyState'
import { Button } from '@/components/ui/shadcn/button'
import { Building2, Users, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/shadcn/alert'

export default function WorkspaceSettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Workspace"
        description="Manage organization details and team access."
        backHref="/settings"
        backLabel="Back to Settings"
      />

      <SettingsSection
        title="Workspace Profile"
        description="Organization name, branding, and defaults"
      >
        <EmptyState
          icon={Building2}
          title="Workspace profile coming soon"
          description="This section will surface organization details once configured."
        />
      </SettingsSection>

      <SettingsSection
        title="Members"
        description="Invite and manage workspace members"
      >
        <EmptyState
          icon={Users}
          title="Members are managed elsewhere"
          description="Use the Users or Teams pages to manage access."
        />
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection
        title="Danger Zone"
        description="Destructive actions that cannot be undone"
      >
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            These actions are permanent and cannot be undone. Proceed with extreme caution.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Button variant="destructive" disabled>
              Delete Workspace
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Contact support to delete this workspace
            </p>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}
