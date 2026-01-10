'use client';

import { useMemo } from 'react';
import { formatDateTime } from '@/lib/timezone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { AlertCircle, Calendar } from 'lucide-react';

type PreviewLayer = {
  id: string;
  name: string;
  start: Date;
  end: Date | null;
  rotationLengthHours: number;
  users: Array<{ userId: string; position: number; user: { name: string } }>;
};

type SchedulePreviewProps = {
  layers: PreviewLayer[];
  timeZone: string;
  startDate: Date;
  endDate: Date;
};

export default function SchedulePreview({
  layers,
  timeZone,
  startDate,
  endDate,
}: SchedulePreviewProps) {
  const previewBlocks = useMemo(() => {
    // Generate preview blocks for the next 7 days
    const blocks: Array<{
      layerName: string;
      userName: string;
      start: Date;
      end: Date;
    }> = [];

    layers.forEach(layer => {
      if (layer.users.length === 0) return;

      const rotationMs = layer.rotationLengthHours * 60 * 60 * 1000;
      const layerStart = new Date(layer.start);
      const layerEnd = layer.end || null;

      let blockStart = new Date(Math.max(layerStart.getTime(), startDate.getTime()));
      let index = 0;

      while (blockStart < endDate) {
        if (layerEnd && blockStart >= layerEnd) break;

        const blockEnd = new Date(blockStart.getTime() + rotationMs);
        const finalEnd = layerEnd && blockEnd > layerEnd ? layerEnd : blockEnd;

        if (finalEnd > startDate) {
          const user = layer.users[index % layer.users.length];
          blocks.push({
            layerName: layer.name,
            userName: user.user.name,
            start: new Date(blockStart),
            end: new Date(finalEnd),
          });
        }

        blockStart = finalEnd;
        index++;
        if (index > 100) break; // Safety limit
      }
    });

    return blocks.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [layers, startDate, endDate]);

  const formatDateTimeLocal = (date: Date) => {
    return formatDateTime(date, timeZone, { format: 'short' });
  };

  if (previewBlocks.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No shifts generated for the preview period. Check layer start times and rotation
            settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Preview (Next 7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {previewBlocks.slice(0, 10).map((block, idx) => (
            <div
              key={idx}
              className="p-3 bg-muted/50 rounded-lg border flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="secondary" size="xs" className="shrink-0">
                  {block.layerName}
                </Badge>
                <span className="text-sm font-medium truncate">{block.userName}</span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDateTimeLocal(block.start)} - {formatDateTimeLocal(block.end)}
              </span>
            </div>
          ))}
          {previewBlocks.length > 10 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{previewBlocks.length - 10} more shifts...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
