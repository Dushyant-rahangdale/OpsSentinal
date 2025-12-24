'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import SchedulePreview from './SchedulePreview';
import { DateTimeInput } from '@/components/ui';

type LayerCreateFormProps = {
    scheduleId: string;
    canManageSchedules: boolean;
    createLayer: (scheduleId: string, formData: FormData) => Promise<{ error?: string } | undefined>;
    defaultStartDate: string;
    users?: Array<{ id: string; name: string }>;
    timeZone?: string;
};

export default function LayerCreateForm({
    scheduleId,
    canManageSchedules,
    createLayer,
    defaultStartDate,
    users = [],
    timeZone = 'UTC'
}: LayerCreateFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<{
        name: string;
        start: string;
        end: string;
        rotationLengthHours: number;
        users: string[];
    } | null>(null);

    const handlePreview = (formData: FormData) => {
        const name = formData.get('name') as string;
        const start = formData.get('start') as string;
        const end = formData.get('end') as string;
        const rotationLengthHours = Number(formData.get('rotationLengthHours'));
        
        if (name && start && rotationLengthHours && !isNaN(rotationLengthHours) && rotationLengthHours > 0) {
            setPreviewData({
                name,
                start,
                end: end || '',
                rotationLengthHours,
                users: [] // Preview doesn't need actual users, just the structure
            });
            setShowPreview(true);
        } else {
            setShowPreview(false);
            setPreviewData(null);
        }
    };

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            const result = await createLayer(scheduleId, formData);
            if (result?.error) {
                showToast(result.error, 'error');
            } else {
                showToast('Layer created successfully', 'success');
                router.refresh();
            }
        });
    };

    if (!canManageSchedules) {
        return (
            <div className="glass-panel" style={{
                padding: '1.5rem',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                opacity: 0.7
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: 'var(--text-secondary)' }}>
                        Add Layer
                    </h4>
                    <span 
                        title="Layers allow you to run multiple rotation patterns simultaneously. For example, you can have a 'day' layer (6 AM - 6 PM) and a 'night' layer (6 PM - 6 AM) to provide 24/7 coverage with different teams."
                        style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: '#e0f2fe',
                            color: '#0c4a6e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            cursor: 'help',
                            border: '1px solid #bae6fd'
                        }}
                    >
                        ?
                    </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    ⚠️ You don't have access to create layers. Admin or Responder role required.
                </p>
                <div style={{ opacity: 0.5, pointerEvents: 'none' }}>
                    <form style={{ display: 'grid', gap: '0.75rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                Layer name
                            </label>
                            <input name="name" placeholder="Primary rotation" disabled style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                Rotation length (hours)
                            </label>
                            <input name="rotationLengthHours" type="number" min="1" defaultValue="24" disabled style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                    Start
                                </label>
                                <input type="datetime-local" name="start" defaultValue={defaultStartDate} disabled style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                    End (optional)
                                </label>
                                <input type="datetime-local" name="end" disabled style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            </div>
                        </div>
                        <button type="button" disabled className="glass-button primary" style={{ opacity: 0.5 }}>
                            Create layer
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            marginTop: '1.5rem'
        }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>
                        Add Layer
                    </h4>
                    <span 
                        title="Layers allow you to run multiple rotation patterns simultaneously. For example, you can have a 'day' layer (6 AM - 6 PM) and a 'night' layer (6 PM - 6 AM) to provide 24/7 coverage with different teams."
                        style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: '#e0f2fe',
                            color: '#0c4a6e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            cursor: 'help',
                            border: '1px solid #bae6fd'
                        }}
                    >
                        ?
                    </span>
                </div>
            <form 
                action={handleSubmit} 
                style={{ display: 'grid', gap: '0.75rem' }}
                onChange={(e) => {
                    const form = e.currentTarget;
                    const formData = new FormData(form);
                    handlePreview(formData);
                }}
            >
                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                        Layer name
                    </label>
                    <input
                        name="name"
                        placeholder="Primary rotation"
                        required
                        disabled={isPending}
                        style={{
                            width: '100%',
                            padding: '0.6rem',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            background: 'white'
                        }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                        Rotation length (hours)
                    </label>
                    <input
                        name="rotationLengthHours"
                        type="number"
                        min="1"
                        defaultValue="24"
                        required
                        disabled={isPending}
                        style={{
                            width: '100%',
                            padding: '0.6rem',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            background: 'white'
                        }}
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                            Start
                        </label>
                        <DateTimeInput
                            name="start"
                            value={defaultStartDate}
                            required
                            fullWidth
                            disabled={isPending}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                            End (optional)
                        </label>
                        <DateTimeInput
                            name="end"
                            fullWidth
                            disabled={isPending}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget.closest('form');
                            if (form) {
                                const formData = new FormData(form);
                                handlePreview(formData);
                            }
                        }}
                        className="glass-button"
                        style={{ flex: 1 }}
                    >
                        Preview
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="glass-button primary"
                        style={{ flex: 1 }}
                    >
                        {isPending ? 'Creating...' : 'Create Layer'}
                    </button>
                </div>
            </form>
            
            {showPreview && previewData && (
                <SchedulePreview
                    layers={[{
                        id: 'preview',
                        name: previewData.name,
                        start: new Date(previewData.start),
                        end: previewData.end ? new Date(previewData.end) : null,
                        rotationLengthHours: previewData.rotationLengthHours,
                        users: previewData.users.map((userId, idx) => ({
                            userId,
                            position: idx + 1,
                            user: { name: users.find(u => u.id === userId)?.name || 'User' }
                        }))
                    }]}
                    timeZone={timeZone}
                    startDate={new Date()}
                    endDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
                />
            )}
        </div>
    );
}

