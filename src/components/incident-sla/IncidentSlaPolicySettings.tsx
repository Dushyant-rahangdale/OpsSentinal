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
import { INCIDENT_PRIORITY_DEFINITIONS } from '@/lib/incidents/priority';

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
type Priority = (typeof priorities)[number];
type EditableRule = { priority: Priority; enabled: boolean; ack: string; resolve: string };
const minutes = (ms: number | null | undefined) =>
  ms == null ? '' : String(Math.round(ms / 60000));

export default function IncidentSlaPolicySettings({
  scopeKey,
  policy,
  workspacePolicy = null,
  canManage,
}: {
  scopeKey: string;
  policy: Policy;
  workspacePolicy?: Policy;
  canManage: boolean;
}) {
  const isService = scopeKey.startsWith('service:');
  const [inherit, setInherit] = useState(isService && (policy?.inheritWorkspace ?? true));
  const [ack, setAck] = useState(minutes(policy?.baseAckTargetMs));
  const [resolve, setResolve] = useState(minutes(policy?.baseResolveTargetMs));
  const [rules, setRules] = useState<EditableRule[]>(() =>
    priorities.map(priority => {
      const rule = policy?.rules.find(candidate => candidate.priority === priority);
      return {
        priority,
        enabled: Boolean(rule),
        ack: minutes(rule?.ackTargetMs),
        resolve: minutes(rule?.resolveTargetMs),
      };
    })
  );
  const [pending, startTransition] = useTransition();
  const effectiveBase = inherit ? workspacePolicy : policy;
  const effectiveSource = inherit ? 'Workspace defaults' : 'Service policy';
  const updateRule = (
    priority: Priority,
    field: 'enabled' | 'ack' | 'resolve',
    value: boolean | string
  ) =>
    setRules(current =>
      current.map(rule => {
        if (rule.priority !== priority) return rule;
        if (field === 'enabled') return { ...rule, enabled: Boolean(value) };
        if (field === 'ack') return { ...rule, ack: String(value) };
        return { ...rule, resolve: String(value) };
      })
    );
  const submit = () => {
    startTransition(async () => {
      try {
        await saveIncidentSlaPolicyAction({
          scopeKey,
          expectedVersion: policy?.version ?? 0,
          inheritWorkspace: inherit,
          baseAckTargetMs: inherit ? null : Number(ack) * 60000,
          baseResolveTargetMs: inherit ? null : Number(resolve) * 60000,
          rules: rules.flatMap(rule => {
            return rule.enabled
              ? [
                  {
                    priority: rule.priority,
                    ackTargetMs: Number(rule.ack) * 60000,
                    resolveTargetMs: Number(rule.resolve) * 60000,
                    label: `${rule.priority} ${INCIDENT_PRIORITY_DEFINITIONS[rule.priority].label}`,
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
        {isService && (
          <div className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Effective source
              </p>
              <p className="text-xs font-medium">
                {effectiveBase
                  ? `${effectiveSource} · v${effectiveBase.version}`
                  : 'Not configured'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Effective acknowledgement
              </p>
              <p className="text-xs font-medium">
                {effectiveBase?.baseAckTargetMs == null
                  ? 'Unavailable'
                  : `${minutes(effectiveBase.baseAckTargetMs)} minutes`}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Effective resolution
              </p>
              <p className="text-xs font-medium">
                {effectiveBase?.baseResolveTargetMs == null
                  ? 'Unavailable'
                  : `${minutes(effectiveBase.baseResolveTargetMs)} minutes`}
              </p>
            </div>
          </div>
        )}
        {isService && (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={inherit}
              disabled={!canManage || pending}
              onChange={e => setInherit(e.target.checked)}
            />{' '}
            Inherit workspace defaults{' '}
            <span className="text-muted-foreground">
              (base targets inherit; optional priority overrides remain available)
            </span>
          </label>
        )}
        <>
          {!inherit && (
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
          )}
          {(isService || scopeKey === 'workspace') && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">
                Priority overrides{' '}
                <span className="font-normal text-muted-foreground">
                  (optional; unselected priorities use base targets)
                </span>
              </p>
              {rules.map(rule => (
                <div
                  key={rule.priority}
                  className="grid grid-cols-[auto_1fr_1fr] items-end gap-2 rounded-md border p-2"
                >
                  <label className="flex items-center gap-1.5 pb-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      disabled={!canManage || pending}
                      onChange={e => updateRule(rule.priority, 'enabled', e.target.checked)}
                    />
                    {rule.priority} {INCIDENT_PRIORITY_DEFINITIONS[rule.priority].label}
                  </label>
                  <div>
                    <Label className="text-[10px]">Ack minutes</Label>
                    <Input
                      type="number"
                      min="1"
                      value={rule.ack}
                      disabled={!canManage || pending || !rule.enabled}
                      onChange={e => updateRule(rule.priority, 'ack', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Resolve minutes</Label>
                    <Input
                      type="number"
                      min="1"
                      value={rule.resolve}
                      disabled={!canManage || pending || !rule.enabled}
                      onChange={e => updateRule(rule.priority, 'resolve', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
