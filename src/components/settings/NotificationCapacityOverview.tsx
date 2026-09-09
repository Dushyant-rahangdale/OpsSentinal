'use client';

import { useState } from 'react';
import { Gauge, PauseCircle, PlayCircle, ServerCog, Users } from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';

type Capacity = {
  channel: string;
  configuredRatePerSecond: number;
  effectiveRatePerSecond: number;
  bulkRatePerSecond: number;
  maxInFlight: number;
  adaptiveBackpressure: boolean;
};

export default function NotificationCapacityOverview({
  capacities,
  workerCount,
  campaigns,
  initialPaused,
  canManage,
}: {
  capacities: Capacity[];
  workerCount: number;
  campaigns: Array<{
    id: string;
    sourceType: string;
    status: string;
    materializedTargets: number;
    completedTargets: number;
    failedTargets: number;
  }>;
  initialPaused: boolean;
  canManage: boolean;
}) {
  const [paused, setPaused] = useState(initialPaused);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const togglePause = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/notifications/capacity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulkPaused: !paused }),
      });
      if (!response.ok) throw new Error('Capacity update failed');
      setPaused(value => !value);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Capacity update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription>Bulk delivery</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4 text-primary" />
              Capacity control
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Badge variant={paused ? 'destructive' : 'secondary'}>
              {paused ? 'Paused' : 'Running'}
            </Badge>
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void togglePause()}
              >
                {paused ? (
                  <PlayCircle className="mr-1.5 h-4 w-4" />
                ) : (
                  <PauseCircle className="mr-1.5 h-4 w-4" />
                )}
                {paused ? 'Resume bulk' : 'Pause bulk'}
              </Button>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription>Active worker leases</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ServerCog className="h-5 w-5 text-emerald-500" />
              {workerCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Expiring distributed provider reservations
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription>Recent campaigns</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-5 w-5 text-indigo-500" />
              {campaigns.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Resumable status subscriber fanouts
          </CardContent>
        </Card>
      </div>
      <Card className="border-border/80 shadow-xs">
        <CardHeader>
          <CardTitle className="text-sm">Provider capacity</CardTitle>
          <CardDescription>
            Configured ceilings and protected bulk share. Worker metrics report live throttling.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {capacities.map(item => (
            <div key={item.channel} className="rounded-lg border border-border/70 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <strong className="text-sm">{item.channel}</strong>
                <Badge variant="outline">{item.adaptiveBackpressure ? 'Adaptive' : 'Fixed'}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Configured</span>
                  <div className="font-bold">{item.effectiveRatePerSecond}/s</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Bulk max</span>
                  <div className="font-bold">{item.bulkRatePerSecond}/s</div>
                </div>
                <div>
                  <span className="text-muted-foreground">In flight</span>
                  <div className="font-bold">{item.maxInFlight}</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {campaigns.length > 0 && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm">Fanout progress</CardTitle>
            <CardDescription>Latest durable subscriber campaigns.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.map(campaign => {
              const attempted = campaign.materializedTargets + campaign.failedTargets;
              const percent =
                attempted === 0 ? 0 : Math.round((campaign.completedTargets / attempted) * 100);
              return (
                <div key={campaign.id} className="rounded-lg border border-border/70 p-3">
                  <div className="flex justify-between text-sm">
                    <span>{campaign.sourceType.replaceAll('_', ' ')}</span>
                    <Badge variant="outline">{campaign.status}</Badge>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {campaign.materializedTargets} queued · {campaign.completedTargets} delivered ·{' '}
                    {campaign.failedTargets} failed
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
