'use client';

import { useState, useTransition } from 'react';
import { signOut } from 'next-auth/react';
import { revokeAllSessions } from '@/app/(app)/settings/security/actions';
import { Button } from '@/components/ui/shadcn/button';
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/shadcn/alert-dialog';
import { AlertCircle, CheckCircle2, LogOut, Shield } from 'lucide-react';

export default function ActiveSessionsSection() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRevokeAll = () => {
    setError(null);
    startTransition(async () => {
      const result = await revokeAllSessions();
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setSuccess(true);
        // Sign out after a brief delay to show success message
        setTimeout(async () => {
          await signOut({ callbackUrl: '/login' });
        }, 1500);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-muted/30">
        <div className="p-2 rounded-full bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium">Current Session</p>
          <p className="text-sm text-muted-foreground mt-1">
            You are currently signed in. Revoking all sessions will sign you out from all devices.
          </p>
        </div>
        <div className="shrink-0">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Active
          </span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>All sessions revoked successfully. Signing you out...</AlertDescription>
        </Alert>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isPending || success}>
            <LogOut className="h-4 w-4 mr-2" />
            {isPending ? 'Revoking...' : 'Revoke All Sessions'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke All Sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately sign you out from all devices, including this one. You will need
              to sign in again to continue using OpsKnight.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke All Sessions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
