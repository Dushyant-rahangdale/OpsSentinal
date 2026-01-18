'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { CheckCircle, RefreshCw, Slack } from 'lucide-react';

interface SlackWorkspaceHeaderProps {
  workspaceName: string;
  installerName: string;
  updatedAt: Date;
  enabled: boolean;
  isAdmin: boolean;
  onReconnect?: () => void;
  onReplaceWorkspace?: () => void;
}

export function SlackWorkspaceHeader({
  workspaceName,
  installerName,
  updatedAt,
  enabled,
  isAdmin,
  onReconnect,
  onReplaceWorkspace,
}: SlackWorkspaceHeaderProps) {
  return (
    <Card className="border-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Logo and Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-white/10 backdrop-blur-sm">
              <Slack className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">
                {workspaceName || 'Slack Workspace'}
              </h3>
              <p className="text-sm text-slate-300">
                Connected by {installerName} on{' '}
                {new Date(updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Last updated {new Date(updatedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Right: Status and Actions */}
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                'px-3 py-1 text-sm font-medium border-2',
                enabled
                  ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300'
                  : 'border-slate-500 bg-slate-500/20 text-slate-400'
              )}
            >
              {enabled ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Active
                </>
              ) : (
                'Disabled'
              )}
            </Badge>

            {isAdmin && (
              <div className="flex items-center gap-2">
                {onReconnect && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReconnect}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                  >
                    <RefreshCw className="h-4 w-4 mr-1.5" />
                    Reconnect
                  </Button>
                )}
                {onReplaceWorkspace && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReplaceWorkspace}
                    className="bg-red-500/20 border-red-400/50 text-red-300 hover:bg-red-500/30 hover:text-red-200"
                  >
                    Replace Workspace
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SlackWorkspaceHeader;
