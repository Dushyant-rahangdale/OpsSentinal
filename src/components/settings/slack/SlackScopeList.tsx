'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/shadcn/collapsible';
import { CheckCircle, XCircle, ChevronDown, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface SlackScopeListProps {
  presentScopes: string[];
  requiredScopes: string[];
  optionalScopes: string[];
  onReconnect?: () => void;
  isAdmin?: boolean;
}

export function SlackScopeList({
  presentScopes,
  requiredScopes,
  optionalScopes,
  onReconnect,
  isAdmin = false,
}: SlackScopeListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scopeSet = new Set(presentScopes);
  const missingRequired = requiredScopes.filter(scope => !scopeSet.has(scope));
  const allScopes = [...requiredScopes, ...optionalScopes];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-4 py-3 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            {missingRequired.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            )}
            <span className="font-medium">Scope Checklist</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={missingRequired.length > 0 ? 'destructive' : 'default'}
              className={cn(missingRequired.length === 0 && 'bg-emerald-600 hover:bg-emerald-600')}
            >
              {missingRequired.length === 0
                ? 'All required scopes present'
                : `${missingRequired.length} missing`}
            </Badge>
            <ChevronDown
              className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4">
        <div className="mt-2 space-y-2 rounded-lg border p-3 bg-muted/30">
          {allScopes.map(scope => {
            const isRequired = requiredScopes.includes(scope);
            const hasScope = scopeSet.has(scope);

            return (
              <div
                key={scope}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  {hasScope ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <code className="text-sm font-mono">{scope}</code>
                </div>
                <Badge
                  variant={hasScope ? 'default' : isRequired ? 'destructive' : 'outline'}
                  className={cn(
                    'text-xs',
                    hasScope &&
                      'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-200'
                  )}
                >
                  {hasScope ? 'Enabled' : isRequired ? 'Required' : 'Optional'}
                </Badge>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Scope changes only take effect after reconnecting Slack. Private channels require{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">groups:read</code>.
        </p>

        {missingRequired.length > 0 && isAdmin && onReconnect && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onReconnect}>
            Reconnect to refresh scopes
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default SlackScopeList;
