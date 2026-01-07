import { getUserPermissions } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import Link from 'next/link'
import AppUrlSettings from '@/components/settings/AppUrlSettings'
import { SettingsPageHeader } from '@/components/settings/layout/SettingsPageHeader'
import { SettingsSection } from '@/components/settings/layout/SettingsSection'
import SsoSettingsForm from '@/components/settings/SsoSettingsForm'
import EncryptionKeyForm from '@/components/settings/EncryptionKeyForm'
import RetentionPolicySettings from '@/components/settings/RetentionPolicySettings'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/shadcn/alert'
import { Badge } from '@/components/ui/shadcn/badge'
import { Button } from '@/components/ui/shadcn/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/shadcn/card'
import { Shield, AlertTriangle, Globe, Key, UserCheck, Database, Activity, Info, ArrowRight } from 'lucide-react'

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SystemSettingsPage() {
  const permissions = await getUserPermissions()

  // Show access denied message for non-admins instead of redirecting
  if (!permissions.isAdmin) {
    return (
      <div className="space-y-6">
        <SettingsPageHeader
          title="System Settings"
          description="Application-wide configuration and defaults."
          backHref="/settings"
          backLabel="Back to Settings"
        />

        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Admin Role Required</AlertTitle>
          <AlertDescription>
            Your current role is <strong>{permissions.role}</strong>. Contact an administrator
            for access to system settings.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Fetch system settings for app URL
  const appUrlData = {
    appUrl: null as string | null,
    fallback: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  }

  // Declare systemSettings outside the try block to be accessible later
  let systemSettings: { appUrl: string | null; encryptionKey: string | null } | null = null
  let oidcConfig: any = null // Declare oidcConfig here

  try {
    // Fetch encryption key (sensitive, only check existence or masked)
    systemSettings = await import('@/lib/prisma').then((m) =>
      m.default.systemSettings.findUnique({
        where: { id: 'default' },
        select: { appUrl: true, encryptionKey: true },
      })
    )

    const rawOidcConfig = await import('@/lib/prisma').then((m) =>
      m.default.oidcConfig.findFirst({
        orderBy: { updatedAt: 'desc' },
      })
    )

    if (rawOidcConfig) {
      oidcConfig = {
        enabled: rawOidcConfig.enabled,
        issuer: rawOidcConfig.issuer,
        clientId: rawOidcConfig.clientId,
        autoProvision: rawOidcConfig.autoProvision,
        allowedDomains: rawOidcConfig.allowedDomains,
        hasClientSecret: !!rawOidcConfig.clientSecret,
      }
    }

    if (systemSettings) {
      appUrlData.appUrl = systemSettings.appUrl
    }
  } catch (error) {
    logger.warn('Failed to fetch app URL settings from DB', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  const encryptionKeySet = Boolean(systemSettings?.encryptionKey)

  // Check for System Lockout (Safe Mode)
  let isSystemLocked = false
  if (systemSettings?.encryptionKey) {
    const { validateCanary } = await import('@/lib/encryption')
    const isSafe = await validateCanary(systemSettings.encryptionKey)
    isSystemLocked = !isSafe
  }

  const integrityCheck = await import('@/lib/oidc-config').then((m) => m.checkOidcIntegrity())
  const encryptionStatus = isSystemLocked
    ? 'Needs attention'
    : encryptionKeySet
      ? 'Configured'
      : 'Missing'
  const ssoStatus = oidcConfig?.enabled ? 'Enabled' : 'Disabled'
  const appUrlStatus = appUrlData.appUrl ? 'Custom' : 'Fallback'

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="System Settings"
        description="Configure core application settings that affect system-wide behavior."
        backHref="/settings"
        backLabel="Back to Settings"
      />

      {/* System Overview Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">High Impact Configuration</CardTitle>
              <CardDescription className="mt-2 text-base">
                Set the global foundation for URLs, encryption, and identity so every workspace
                stays consistent and secure. These settings apply to the entire system.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Scope Card */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Scope</span>
                </div>
                <p className="font-semibold">Admin Only</p>
                <p className="text-sm text-muted-foreground">
                  Changes apply to every project, user, and integration in this workspace.
                </p>
              </div>
            </div>

            {/* Status Card */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Status</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">App URL</span>
                    <Badge variant={appUrlData.appUrl ? 'default' : 'secondary'}>
                      {appUrlStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Encryption</span>
                    <Badge
                      variant={
                        isSystemLocked ? 'destructive' : encryptionKeySet ? 'default' : 'secondary'
                      }
                    >
                      {encryptionStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SSO</span>
                    <Badge variant={oidcConfig?.enabled ? 'default' : 'secondary'}>
                      {ssoStatus}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application URL */}
      <SettingsSection
        title="Application URL"
        description="Used in emails, webhooks, and RSS feeds"
        action={
          <div className="flex gap-2">
            <Badge variant="outline">System-wide</Badge>
            <Badge variant="outline">Notifications</Badge>
          </div>
        }
        footer={
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Why this matters</p>
              <p className="text-sm text-muted-foreground">
                Used for links in notifications, public status pages, and webhook payloads.
              </p>
            </div>
          </div>
        }
      >
        <AppUrlSettings appUrl={appUrlData.appUrl} fallback={appUrlData.fallback} />
      </SettingsSection>

      {/* Encryption Key */}
      <SettingsSection
        title="Encryption Key"
        description="Required for securing sensitive credentials like SSO secrets"
        action={
          <div className="flex gap-2">
            <Badge variant="destructive">Sensitive</Badge>
            <Badge variant="outline">Backups</Badge>
          </div>
        }
        footer={
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Handle with care</AlertTitle>
            <AlertDescription>
              Rotate only when you have the current key and a backup plan.
            </AlertDescription>
          </Alert>
        }
      >
        <EncryptionKeyForm hasKey={encryptionKeySet} isSystemLocked={isSystemLocked} />
      </SettingsSection>

      {/* Single Sign-On */}
      <SettingsSection
        title="Single Sign-On (OIDC)"
        description="Allow users to log in with your identity provider"
        action={
          <div className="flex gap-2">
            <Badge variant="outline">Authentication</Badge>
            <Badge variant="outline">OIDC</Badge>
          </div>
        }
        footer={
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Common pitfall</p>
              <p className="text-sm text-muted-foreground">
                Double-check redirect URLs before enabling SSO for all users.
              </p>
            </div>
          </div>
        }
      >
        <SsoSettingsForm
          initialConfig={oidcConfig}
          callbackUrl={`${appUrlData.appUrl || appUrlData.fallback}/api/auth/callback/oidc`}
          hasEncryptionKey={encryptionKeySet}
          configError={integrityCheck.ok ? undefined : integrityCheck.error}
        />
      </SettingsSection>

      {/* Data Retention */}
      <SettingsSection
        title="Data Retention"
        description="Configure how long to keep historical data"
        action={
          <div className="flex gap-2">
            <Badge variant="outline">Storage</Badge>
            <Badge variant="outline">Performance</Badge>
            <Badge variant="outline">Compliance</Badge>
          </div>
        }
        footer={
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Why this matters</p>
              <p className="text-sm text-muted-foreground">
                Controls "All Time" queries in Command Center. Longer retention means more
                complete historical data but slower queries and more storage.
              </p>
            </div>
          </div>
        }
      >
        <RetentionPolicySettings />
      </SettingsSection>

      {/* Performance Monitoring */}
      <SettingsSection
        title="Performance Monitoring"
        description="Monitor SLA query performance and system metrics"
        action={
          <Link href="/settings/system/performance">
            <Button variant="outline">
              View Metrics
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Track query durations, slow queries, and optimization opportunities.
        </p>
      </SettingsSection>
    </div>
  )
}
