'use client'

import { AutosaveForm } from '@/components/settings/forms/AutosaveForm'
import { SettingsSection } from '@/components/settings/layout/SettingsSection'
import { SettingsRow } from '@/components/settings/layout/SettingsRow'
import { Input } from '@/components/ui/shadcn/input'
import { Badge } from '@/components/ui/shadcn/badge'
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar'
import { Lock, RefreshCw, Info } from 'lucide-react'
import { z } from 'zod'
import { updateProfile } from '@/app/(app)/settings/actions'
import { useRouter } from 'next/navigation'

type Props = {
  name: string
  email: string | null
  role: string
  memberSince: string
  department?: string | null
  jobTitle?: string | null
  avatarUrl?: string | null
  lastOidcSync?: string | null
}

// Schema for the editable fields (only name is editable)
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfileForm({
  name,
  email,
  role,
  memberSince,
  department,
  jobTitle,
  avatarUrl,
  lastOidcSync,
}: Props) {
  const router = useRouter()

  const defaultValues: ProfileFormData = {
    name,
  }

  const handleSave = async (data: ProfileFormData) => {
    // Convert to FormData to call the server action
    const formData = new FormData()
    formData.append('name', data.name)

    const result = await updateProfile({ error: null, success: false }, formData)

    // Refresh the page after successful update to show the new name everywhere
    if (result.success) {
      setTimeout(() => {
        router.refresh()
      }, 1500)
    }

    return {
      success: result.success ?? false,
      error: result.error ?? undefined,
    }
  }

  // Get initials from name for fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex justify-center py-4">
        <div className="relative group">
          <Avatar className="h-28 w-28 border-4 border-border shadow-lg ring-4 ring-background">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={name} />
            ) : null}
            <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Editable Section with Auto-save */}
      <AutosaveForm
        defaultValues={defaultValues}
        schema={profileSchema}
        onSave={handleSave}
        showSaveIndicator={true}
        saveIndicatorPosition="top-right"
        delay={500}
      >
        {(form) => (
          <SettingsSection
            title="Account Details"
            description="Keep your profile up to date across the workspace"
          >
            <div className="divide-y">
              <SettingsRow
                label="Display Name"
                description="This is how your name appears across the workspace"
                required
                htmlFor="name"
                tooltip="Changes update your display name everywhere after you save"
              >
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Enter your display name"
                  className="max-w-md"
                />
              </SettingsRow>

              <SettingsRow
                label="Email Address"
                description="Email is managed by your identity provider"
              >
                <div className="relative max-w-md">
                  <Input
                    value={email ?? 'Not available'}
                    readOnly
                    disabled
                    className="pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </SettingsRow>

              <SettingsRow
                label="Role"
                description="Your workspace role determines permissions"
              >
                <div className="relative max-w-md">
                  <Input value={role} readOnly disabled className="pr-10" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </SettingsRow>

              <SettingsRow
                label="Member Since"
                description="Date you joined this workspace"
              >
                <div className="relative max-w-md">
                  <Input value={memberSince} readOnly disabled className="pr-10" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </SettingsRow>
            </div>
          </SettingsSection>
        )}
      </AutosaveForm>

      {/* Organization Info Section (Read-only) */}
      {(department || jobTitle) && (
        <SettingsSection
          title="Organization Info"
          description={
            lastOidcSync
              ? `Synced from your identity provider (last updated: ${lastOidcSync})`
              : 'Synced from your identity provider'
          }
          action={<Badge variant="secondary">Synced from IdP</Badge>}
        >
          <div className="divide-y">
            {department && (
              <SettingsRow
                label="Department"
                description="Your department from identity provider"
              >
                <div className="relative max-w-md">
                  <Input value={department} readOnly disabled className="pr-10" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </SettingsRow>
            )}

            {jobTitle && (
              <SettingsRow
                label="Job Title"
                description="Your job title from identity provider"
              >
                <div className="relative max-w-md">
                  <Input value={jobTitle} readOnly disabled className="pr-10" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </SettingsRow>
            )}
          </div>
        </SettingsSection>
      )}

      {/* Info Note */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Most profile updates are managed by your identity provider or an OpsSentinal administrator. Only your display name can be changed here.
        </AlertDescription>
      </Alert>
    </div>
  )
}
