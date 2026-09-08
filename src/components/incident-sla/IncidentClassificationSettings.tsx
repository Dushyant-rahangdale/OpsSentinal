'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { notify } from '@/lib/toast';
import { saveWorkspaceClassificationPolicyAction } from '@/app/(app)/settings/incident-sla/actions';
import { INCIDENT_PRIORITIES, INCIDENT_PRIORITY_DEFINITIONS } from '@/lib/incidents/priority';

type Severity = 'critical' | 'error' | 'warning' | 'info';
type Priority = (typeof INCIDENT_PRIORITIES)[number];
type Urgency = 'HIGH' | 'MEDIUM' | 'LOW';
type Rule = { matchValue: Severity; priority: Priority; urgency: Urgency };

const severities: Severity[] = ['critical', 'error', 'warning', 'info'];
const defaults: Record<Severity, Omit<Rule, 'matchValue'>> = {
  critical: { priority: 'P1', urgency: 'HIGH' },
  error: { priority: 'P2', urgency: 'MEDIUM' },
  warning: { priority: 'P3', urgency: 'MEDIUM' },
  info: { priority: 'P5', urgency: 'LOW' },
};

export default function IncidentClassificationSettings({
  policy,
}: {
  policy: { version: number; derivePriorityFromUrgency: boolean; rules: Rule[] } | null;
}) {
  const [derive, setDerive] = useState(policy?.derivePriorityFromUrgency ?? false);
  const [rules, setRules] = useState<Rule[]>(() =>
    severities.map(matchValue => ({
      matchValue,
      ...(policy?.rules.find(rule => rule.matchValue === matchValue) ?? defaults[matchValue]),
    }))
  );
  const [pending, startTransition] = useTransition();
  const update = (matchValue: Severity, patch: Partial<Rule>) =>
    setRules(current =>
      current.map(rule => (rule.matchValue === matchValue ? { ...rule, ...patch } : rule))
    );
  const save = () =>
    startTransition(async () => {
      try {
        await saveWorkspaceClassificationPolicyAction({
          expectedVersion: policy?.version ?? 0,
          derivePriorityFromUrgency: derive,
          rules,
        });
        notify.success('Classification policy saved for future incidents.');
      } catch (error) {
        notify.error(
          error instanceof Error ? error.message : 'Unable to save classification policy'
        );
      }
    });

  return (
    <Card>
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm">Alert classification</CardTitle>
            <CardDescription>
              Map normalized provider severity to response priority and notification urgency.
            </CardDescription>
          </div>
          <Badge variant="outline">v{policy?.version ?? 0}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-xs font-semibold text-muted-foreground">
          <span>Incoming severity</span>
          <span>Priority</span>
          <span>Urgency</span>
        </div>
        {rules.map(rule => (
          <div key={rule.matchValue} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2">
            <span className="capitalize text-sm font-medium">{rule.matchValue}</span>
            <Select
              value={rule.priority}
              disabled={pending}
              onValueChange={value => update(rule.matchValue, { priority: value as Priority })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_PRIORITIES.map(priority => (
                  <SelectItem key={priority} value={priority}>
                    {priority} {INCIDENT_PRIORITY_DEFINITIONS[priority].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={rule.urgency}
              disabled={pending}
              onValueChange={value => update(rule.matchValue, { urgency: value as Urgency })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['HIGH', 'MEDIUM', 'LOW'] as const).map(urgency => (
                  <SelectItem key={urgency} value={urgency}>
                    {urgency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <label className="flex items-start gap-2 rounded-md border p-3 text-xs">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={derive}
            disabled={pending}
            onChange={event => setDerive(event.target.checked)}
          />
          <span>
            <strong>
              Derive priority from urgency when no priority or severity mapping exists
            </strong>
            <br />
            <span className="text-muted-foreground">
              HIGH → P1, MEDIUM → P3, LOW → P5. Disabled by default to keep priority and
              notification urgency independent.
            </span>
          </span>
        </label>
        <div className="flex justify-end">
          <Button size="sm" disabled={pending} onClick={save}>
            {pending ? 'Saving…' : 'Save classification policy'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
