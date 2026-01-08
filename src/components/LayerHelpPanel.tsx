'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert';
import { Info, X, HelpCircle } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/shadcn/collapsible';

export default function LayerHelpPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 mb-4">
          <HelpCircle className="h-4 w-4" />
          What are Layers?
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                <Info className="h-4 w-4" />
                Understanding Layers
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0 text-amber-900 hover:bg-amber-100"
                aria-label="Close help panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 text-amber-900">
            <p className="text-sm font-medium">
              <strong>Layers</strong> allow you to run multiple rotation patterns simultaneously.
            </p>

            <div className="space-y-2">
              <p className="text-sm font-medium">Example:</p>
              <ul className="text-sm space-y-1 list-disc list-inside ml-2">
                <li>
                  <strong>Day Layer:</strong> 6 AM - 6 PM, rotates every 12 hours
                </li>
                <li>
                  <strong>Night Layer:</strong> 6 PM - 6 AM, rotates every 12 hours
                </li>
              </ul>
              <p className="text-sm italic text-amber-800 mt-2">
                Together, these provide 24/7 coverage with different teams for day and night shifts.
              </p>
            </div>

            <Alert className="bg-white/50 border-amber-300">
              <Info className="h-4 w-4 text-amber-900" />
              <AlertDescription className="text-sm text-amber-900">
                <p className="font-medium mb-2">Key Points:</p>
                <ul className="space-y-1 list-disc list-inside ml-2">
                  <li>Each layer rotates through its assigned responders</li>
                  <li>Multiple layers can be active at the same time</li>
                  <li>Layers are independent - they don't affect each other</li>
                  <li>
                    Use layers to create complex schedules (follow-the-sun, tiered support, etc.)
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
