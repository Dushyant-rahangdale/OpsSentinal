'use client'

import { AutosaveForm } from '@/components/settings/forms/AutosaveForm'
import { SettingsRow } from '@/components/settings/layout/SettingsRow'
import { Switch } from '@/components/ui/shadcn/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select'
import { Label } from '@/components/ui/shadcn/label'
import TimeZoneSelect from '@/components/TimeZoneSelect'
import { z } from 'zod'
import { updatePreferences } from '@/app/(app)/settings/actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  timeZone: string
  dailySummary: boolean
  incidentDigest: string
}

// Schema for preferences
const preferencesSchema = z.object({
  timeZone: z.string(),
  dailySummary: z.boolean(),
  incidentDigest: z.enum(['HIGH', 'ALL', 'NONE']),
})

type PreferencesFormData = z.infer<typeof preferencesSchema>

export default function PreferencesForm({ timeZone, dailySummary, incidentDigest }: Props) {
  const router = useRouter()
  const [dailySummaryState, setDailySummaryState] = useState(dailySummary)
  const [incidentDigestState, setIncidentDigestState] = useState(incidentDigest)

  const defaultValues: PreferencesFormData = {
    timeZone,
    dailySummary,
    incidentDigest: incidentDigest as 'HIGH' | 'ALL' | 'NONE',
  }

  const handleSave = async (data: PreferencesFormData) => {
    // Convert to FormData to call the server action
    const formData = new FormData()
    formData.append('timeZone', data.timeZone)
    formData.append('dailySummary', data.dailySummary ? 'on' : 'off')
    formData.append('incidentDigest', data.incidentDigest)

    const result = await updatePreferences({ error: null, success: false }, formData)

    // Refresh the page after successful update
    if (result.success) {
      setTimeout(() => {
        router.refresh()
      }, 1000)
    }

    return {
      success: result.success ?? false,
      error: result.error ?? undefined,
    }
  }

  return (
    <AutosaveForm
      defaultValues={defaultValues}
      schema={preferencesSchema}
      onSave={handleSave}
      showSaveIndicator={true}
      saveIndicatorPosition="top-right"
      delay={500}
    >
      {(form) => (
        <div className="divide-y">
          <SettingsRow
            label="Timezone"
            description="All times are displayed in your selected timezone"
            htmlFor="timeZone"
          >
            {/* TimeZoneSelect is a custom component - wrap it to work with the form */}
            <div className="max-w-md">
              <TimeZoneSelect
                name="timeZone"
                defaultValue={form.watch('timeZone')}
                onChange={(value) => form.setValue('timeZone', value)}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Daily Summary"
            description="Receive a daily email summary of incidents"
            tooltip="Get a consolidated email with all incidents from the past 24 hours"
          >
            <div className="flex items-center gap-3">
              <Switch
                id="dailySummary"
                checked={form.watch('dailySummary')}
                onCheckedChange={(checked) => {
                  form.setValue('dailySummary', checked)
                  setDailySummaryState(checked)
                }}
              />
              <Label htmlFor="dailySummary" className="text-sm cursor-pointer">
                {dailySummaryState ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
          </SettingsRow>

          <SettingsRow
            label="Incident Digest"
            description="Choose which incidents to include in digest emails"
            htmlFor="incidentDigest"
          >
            <Select
              value={form.watch('incidentDigest')}
              onValueChange={(value) => {
                form.setValue('incidentDigest', value as 'HIGH' | 'ALL' | 'NONE')
                setIncidentDigestState(value)
              }}
            >
              <SelectTrigger className="max-w-md" id="incidentDigest">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HIGH">High priority only</SelectItem>
                <SelectItem value="ALL">All incidents</SelectItem>
                <SelectItem value="NONE">None</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
        </div>
      )}
    </AutosaveForm>
  )
}
