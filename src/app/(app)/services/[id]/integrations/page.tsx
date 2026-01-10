import prisma from '@/lib/prisma';
import { deleteIntegration } from '../../actions';
import Link from 'next/link';
import ServiceTabs from '@/components/service/ServiceTabs';
import CopyButton from '@/components/service/CopyButton';
import DeleteIntegrationButton from '@/components/service/DeleteIntegrationButton';
import AddIntegrationGrid from '@/components/service/AddIntegrationGrid';
import { getUserPermissions } from '@/lib/rbac';
import { INTEGRATION_TYPES, IntegrationType } from '@/components/service/integration-types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { ChevronLeft, Key, Terminal, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert';

function getWebhookUrl(integrationType: IntegrationType, integrationId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  switch (integrationType) {
    case 'CLOUDWATCH':
      return `${baseUrl}/api/integrations/cloudwatch?integrationId=${integrationId}`;
    case 'AZURE':
      return `${baseUrl}/api/integrations/azure?integrationId=${integrationId}`;
    case 'DATADOG':
      return `${baseUrl}/api/integrations/datadog?integrationId=${integrationId}`;
    case 'PAGERDUTY':
      return `${baseUrl}/api/integrations/pagerduty?integrationId=${integrationId}`;
    case 'GRAFANA':
      return `${baseUrl}/api/integrations/grafana?integrationId=${integrationId}`;
    case 'PROMETHEUS':
      return `${baseUrl}/api/integrations/prometheus?integrationId=${integrationId}`;
    case 'NEWRELIC':
      return `${baseUrl}/api/integrations/newrelic?integrationId=${integrationId}`;
    case 'SENTRY':
      return `${baseUrl}/api/integrations/sentry?integrationId=${integrationId}`;
    case 'OPSGENIE':
      return `${baseUrl}/api/integrations/opsgenie?integrationId=${integrationId}`;
    case 'GITHUB':
      return `${baseUrl}/api/integrations/github?integrationId=${integrationId}`;
    case 'WEBHOOK':
      return `${baseUrl}/api/integrations/webhook?integrationId=${integrationId}`;
    case 'EVENTS_API_V2':
    default:
      return `${baseUrl}/api/events`;
  }
}

export default async function ServiceIntegrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [service, permissions] = await Promise.all([
    prisma.service.findUnique({
      where: { id },
      include: { integrations: { orderBy: { createdAt: 'desc' } } },
    }),
    getUserPermissions(),
  ]);

  if (!service) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <Card className="text-center py-12">
          <div className="flex flex-col items-center justify-center p-6">
            <h2 className="text-2xl font-semibold mb-2">Service Not Found</h2>
            <p className="text-slate-500 mb-6">The service you're looking for doesn't exist.</p>
            <Button asChild>
              <Link href="/services">Back to Services</Link>
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  const canManageIntegrations = permissions.isAdminOrResponder;

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 md:px-6 2xl:px-8 py-6 space-y-6 [zoom:0.8]">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link
          href="/services"
          className="hover:text-primary transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Services
        </Link>
        <span className="opacity-30">/</span>
        <Link href={`/services/${id}`} className="hover:text-primary transition-colors">
          {service.name}
        </Link>
        <span className="opacity-30">/</span>
        <span className="font-medium text-foreground">Integrations</span>
      </div>

      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg p-4 md:p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Service Integrations</h1>
            <p className="text-xs md:text-sm opacity-90 mt-1">
              Configure alert sources to send incidents to {service.name}
            </p>
          </div>
          <Card className="bg-white/10 border-white/20 backdrop-blur">
            <CardContent className="p-3 md:p-4 text-center">
              <div className="text-xl md:text-2xl font-bold">{service.integrations.length}</div>
              <div className="text-[10px] md:text-xs opacity-90">Active Integrations</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ServiceTabs serviceId={id} />

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Integrations</CardTitle>
                <CardDescription>Endpoints currently connected to this service.</CardDescription>
              </div>
              <Badge
                variant="neutral"
                size="sm"
              >
                {service.integrations.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {service.integrations.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <div className="mx-auto h-12 w-12 text-slate-300 mb-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No Integrations Connected</h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-1">
                  Connect external tools to automatically trigger incidents for this service.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {service.integrations.map(integration => {
                  const integrationType = integration.type as IntegrationType;
                  const typeInfo =
                    INTEGRATION_TYPES.find(t => t.value === integrationType) ||
                    INTEGRATION_TYPES[0];
                  const webhookUrl = getWebhookUrl(integrationType, integration.id);

                  return (
                    <Card
                      key={integration.id}
                      className="overflow-hidden flex flex-col border-slate-200"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 flex items-center justify-center rounded-lg border border-white/30 shadow-sm"
                              style={{ backgroundColor: typeInfo.iconBg }}
                            >
                              {typeInfo.icon}
                            </div>
                            <div>
                              <div
                                className="font-semibold text-sm text-slate-900 truncate max-w-[140px]"
                                title={integration.name}
                              >
                                {integration.name}
                              </div>
                              <Badge
                                variant="neutral"
                                size="xs"
                              >
                                {typeInfo.label}
                              </Badge>
                            </div>
                          </div>
                          {canManageIntegrations && (
                            <DeleteIntegrationButton
                              action={deleteIntegration.bind(null, integration.id, service.id)}
                              integrationName={integration.name}
                            />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[2.5em]">
                          {typeInfo.description}
                        </p>
                        <div className="bg-slate-50 rounded border p-3 space-y-3">
                          {integrationType === 'EVENTS_API_V2' ? (
                            <div className="space-y-3">
                              <div>
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Key className="h-3 w-3" /> API Key
                                </div>
                                <div className="bg-white border rounded px-2 py-1.5 font-mono text-xs break-all shadow-sm">
                                  {integration.key}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Terminal className="h-3 w-3" /> Usage Example
                                </div>
                                <pre className="bg-slate-900 text-slate-50 p-3 rounded-md overflow-x-auto text-[10px] font-mono leading-relaxed">
                                  {`curl -X POST ${webhookUrl} \
  -H "Content-Type: application/json" \
  -H "Authorization: Token token=${integration.key}" \
  -d '{
    "event_action": "trigger",
    "dedup_key": "alert_123",
    "payload": {
      "summary": "High CPU Load",
      "source": "monitoring-tool",
      "severity": "critical"
    }
  }'`}
                                </pre>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div>
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                  Webhook URL
                                </div>
                                <div className="bg-white border rounded px-2 py-1.5 font-mono text-xs flex items-center justify-between gap-2 shadow-sm">
                                  <span className="truncate">{webhookUrl}</span>
                                  <CopyButton text={webhookUrl} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {canManageIntegrations ? (
              <AddIntegrationGrid serviceId={service.id} />
            ) : (
              <Alert>
                <AlertDescription>
                  You don't have permission to manage integrations. Admin or Responder role
                  required.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
