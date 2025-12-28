'use client';

import { useMemo } from 'react';
import { formatDateTime } from '@/lib/timezone';

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

export default function SchedulePreview({ layers, timeZone, startDate, endDate }: SchedulePreviewProps) {
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
                        end: new Date(finalEnd)
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
            <div style={{
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginTop: '1rem'
            }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                    No shifts generated for the preview period. Check layer start times and rotation settings.
                </p>
            </div>
        );
    }

    return (
        <div style={{
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            marginTop: '1rem',
            maxHeight: '300px',
            overflowY: 'auto'
        }}>
            <h5 style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                margin: 0,
                marginBottom: '0.75rem'
            }}>
                Preview (Next 7 Days)
            </h5>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {previewBlocks.slice(0, 10).map((block, idx) => (
                    <div
                        key={idx}
                        style={{
                            padding: '0.5rem 0.75rem',
                            background: 'white',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.8rem'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    background: '#e0f2fe',
                                    color: '#0c4a6e',
                                    marginRight: '0.5rem'
                                }}>
                                    {block.layerName}
                                </span>
                                <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                                    {block.userName}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {formatDateTimeLocal(block.start)} - {formatDateTimeLocal(block.end)}
                            </span>
                        </div>
                    </div>
                ))}
                {previewBlocks.length > 10 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0.5rem 0 0 0' }}>
                        +{previewBlocks.length - 10} more shifts...
                    </p>
                )}
            </div>
        </div>
    );
}




