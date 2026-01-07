'use client'

import { useActionState, useState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { signOut } from 'next-auth/react'
import { updatePassword } from '@/app/(app)/settings/actions'
import PasswordStrength from './PasswordStrength'
import { SettingsRow } from '@/components/settings/layout/SettingsRow'
import { Input } from '@/components/ui/shadcn/input'
import { Button } from '@/components/ui/shadcn/button'
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

type Props = {
  hasPassword: boolean
}

type State = {
  error?: string | null
  success?: boolean
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Updating...' : 'Update Password'}
    </Button>
  )
}

export default function SecurityForm({ hasPassword }: Props) {
  const [state, formAction] = useActionState<State, FormData>(updatePassword, {
    error: null,
    success: false,
  })
  const [newPassword, setNewPassword] = useState('')

  // Clear form and sign out after successful update
  useEffect(() => {
    if (state?.success) {
      setNewPassword('') // eslint-disable-line react-hooks/set-state-in-effect
      const timer = setTimeout(async () => {
        await signOut({ callbackUrl: '/login' })
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [state?.success])

  return (
    <form action={formAction} className="space-y-6">
      <div className="divide-y">
        {hasPassword && (
          <SettingsRow
            label="Current Password"
            description="Confirm your current password to proceed"
            htmlFor="currentPassword"
            required
          >
            <Input
              type="password"
              id="currentPassword"
              name="currentPassword"
              autoComplete="current-password"
              required
              placeholder="Enter your current password"
              className="max-w-md"
            />
          </SettingsRow>
        )}

        <SettingsRow
          label="New Password"
          description="Use a strong password with letters, numbers, and symbols"
          htmlFor="newPassword"
          required
          tooltip="Must be at least 8 characters long"
        >
          <div className="max-w-md space-y-3">
            <Input
              type="password"
              id="newPassword"
              name="newPassword"
              autoComplete="new-password"
              required
              placeholder="Enter your new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordStrength password={newPassword} />
          </div>
        </SettingsRow>

        <SettingsRow
          label="Confirm New Password"
          description="Re-enter the new password to confirm"
          htmlFor="confirmPassword"
          required
        >
          <Input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            placeholder="Re-enter your new password"
            className="max-w-md"
          />
        </SettingsRow>
      </div>

      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state?.success && (
        <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Password updated successfully. You will be signed out in a moment...
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <SubmitButton />
      </div>
    </form>
  )
}
