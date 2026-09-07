'use client';

import { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { Badge } from '@/components/ui/shadcn/badge';
import { notify } from '@/lib/toast';
import { saveIncidentSlaPolicyAction } from '@/app/(app)/settings/incident-sla/actions';

type Rule = {
  priority: string;
  ackTargetMs: number;
  resolveTargetMs: number;
  label: string | null;
};
type Policy = {
  version: number;
  inheritWorkspace: boolean;
  baseAckTargetMs: number | null;
  baseResolveTargetMs: number | null;
  rules: Rule[];
} | null;
const priorities = ['P1', 'P2', 'P3', 'P4', 'P5'] as const;
const minutes = (ms: number | null | undefined) =>
  ms == null ? '' : String(Math.round(ms / 60000));

export default function IncidentSlaPolicySettings({
  scopeKey,
  policy,
  canManage,
}: {
  scopeKey: string;
  policy: Policy;
  canManage: boolean;
}) {
  const [inherit, setInherit] = useState(Boolean(policy?.inheritWorkspace));
  const [ack, setAck] = useState(minutes(policy?.baseAckTargetMs));
  const [resolve, setResolve] = useState(minutes(policy?.baseResolveTargetMs));
  const [rules, setRules] = useState<
    Record<string, { enabled: boolean; ack: string; resolve: string }>
  >(() =>
    Object.fromEntries(
      priorities.map(p => {
        const r = policy?.rules.find(x => x.priority === p);
        return [
          p,
          {
            enabled: Boolean(r),
            ack: minutes(r?.ackTargetMs),
            resolve: minutes(r?.resolveTargetMs),
          },
        ];
      })
    )
  );
  const [pending, startTransition] = useTransition();
  const updateRule = (p: string, field: 'enabled' | 'ack' | 'resolve', value: boolean | string) =>
    setRules(current => {
      const existing = current[p];
      if (!existing) return current;
      const next = { ...existing };
      if (field === 'enabled') next.enabled = Boolean(value);
      if (field === 'ack') next.ack = String(value);
      if (field === 'resolve') next.resolve = String(value);
      return { ...current, [p]: next };
    });
  const submit = () => {
    startTransition(async () => {
      try {
        await saveIncidentSlaPolicyAction({
          scopeKey,
          expectedVersion: policy?.version ?? 0,
          inheritWorkspace: inherit,
          baseAckTargetMs: inherit ? null : Number(ack) * 60000,
          baseResolveTargetMs: inherit ? null : Number(resolve) * 60000,
          rules: inherit
            ? []
            : priorities.flatMap(p => {
                const rule = rules[p];
                return rule?.enabled
                  ? [
                      {
                        priority: p,
                        ackTargetMs: Number(rule.ack) * 60000,
                        resolveTargetMs: Number(rule.resolve) * 60000,
                      },
                    ]
                  : [];
              }),
        });
        notify.success('Incident response SLA policy saved for future incidents.');
      } catch (error) {
        notify.error(error instanceof Error ? error.message : 'Unable to save SLA policy');
      }
    });
  };
  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold">Incident Response SLA</CardTitle>
            <CardDescription className="mt-1 text-xs">
              Base acknowledgement and resolution targets, with optional priority overrides. Applies
              to future incidents only.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">
            v{policy?.version ?? 0}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        {scopeKey.startsWith('service:') && (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={inherit}
              disabled={!canManage || pending}
              onChange={e => setInherit(e.target.checked)}
            />{' '}
            Inherit workspace defaults{' '}
            <span className="text-muted-foreground">(priority overrides are disabled)</span>
          </label>
        )}
        {!inherit && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${scopeKey}-ack`} className="text-xs">
                  Base acknowledgement (minutes)
                </Label>
                <Input
                  id={`${scopeKey}-ack`}
                  type="number"
                  min="1"
                  value={ack}
                  disabled={!canManage || pending}
                  onChange={e => setAck(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`${scopeKey}-resolve`} className="text-xs">
                  Base resolution (minutes)
                </Label>
                <Input
                  id={`${scopeKey}-resolve`}
                  type="number"
                  min="1"
                  value={resolve}
                  disabled={!canManage || pending}
                  onChange={e => setResolve(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold">
                Priority overrides{' '}
                <span className="font-normal text-muted-foreground">
                  (optional; unselected priorities use base targets)
                </span>
              </p>
              {priorities.map(p => (
                <div
                  key={p}
                  className="grid grid-cols-[auto_1fr_1fr] items-end gap-2 rounded-md border p-2"
                >
                  <label className="flex items-center gap-1.5 pb-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={rules[p]?.enabled ?? false}
                      disabled={!canManage || pending}
                      onChange={e => updateRule(p, 'enabled', e.target.checked)}
                    />
                    {p}
                  </label>
                  <div>
                    <Label className="text-[10px]">Ack minutes</Label>
                    <Input
                      type="number"
                      min="1"
                      value={rules[p]?.ack ?? ''}
                      disabled={!canManage || pending || !rules[p]?.enabled}
                      onChange={e => updateRule(p, 'ack', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Resolve minutes</Label>
                    <Input
                      type="number"
                      min="1"
                      value={rules[p]?.resolve ?? ''}
                      disabled={!canManage || pending || !rules[p]?.enabled}
                      onChange={e => updateRule(p, 'resolve', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {canManage && (
          <div className="flex justify-end">
            <Button type="button" size="sm" disabled={pending} onClick={submit}>
              {pending ? 'Saving…' : 'Save SLA policy'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
