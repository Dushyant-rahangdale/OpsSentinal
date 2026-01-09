'use client';

import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

type IncidentResolutionProps = {
  incidentId: string;
  canManage: boolean;
  onResolve: (formData: FormData) => void;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full font-semibold shadow-md hover:shadow-lg transition-all"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Resolving...
        </>
      ) : (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Resolve with Note
        </>
      )}
    </Button>
  );
}

export default function IncidentResolution({
  incidentId: _incidentId,
  canManage,
  onResolve,
}: IncidentResolutionProps) {
  if (!canManage) {
    return (
      <Card className="shadow-xl border-border/40 overflow-hidden bg-neutral-50 opacity-70">
        <CardHeader className="bg-gradient-to-r from-neutral-400 via-neutral-300 to-neutral-400 text-neutral-700 pb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <h4 className="font-bold text-lg">Resolution</h4>
            </div>
            <Badge className="bg-white/30 text-neutral-700 border-white/40 text-xs uppercase tracking-wider">
              Required
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-amber-800">
                You don't have access to resolve incidents. Responder role or above required.
              </p>
            </div>
          </div>

          <div className="space-y-3 opacity-50 pointer-events-none">
            <textarea
              name="resolution"
              disabled
              rows={4}
              placeholder="Root cause, fix applied, or summary..."
              className="w-full px-4 py-3 rounded-lg border-2 border-neutral-200 bg-neutral-100 text-sm resize-vertical"
            />
            <p className="text-xs text-muted-foreground">
              10-1000 chars. Supports **bold**, *italic*, `code`, links.
            </p>
            <Button disabled className="w-full">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Resolve with Note
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-border/40 overflow-hidden bg-gradient-to-br from-card to-card/95">
      <CardHeader className="bg-gradient-to-r from-green-600 via-green-500 to-green-600 text-white pb-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xl font-bold">Resolution</h4>
              <p className="text-sm text-white/90">Mark this incident as resolved</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm text-xs uppercase tracking-wider">
            Required
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <form action={onResolve} className="space-y-4">
          <div className="space-y-2">
            <textarea
              name="resolution"
              required
              minLength={10}
              maxLength={1000}
              rows={5}
              placeholder="Root cause, fix applied, or summary..."
              className="w-full px-4 py-3 rounded-lg border-2 border-border bg-white text-sm font-normal resize-vertical outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              10-1000 chars. Supports **bold**, *italic*, `code`, links.
            </p>
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
