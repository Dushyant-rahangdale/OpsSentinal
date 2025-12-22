'use client';

import { useState, useTransition } from 'react';
import { Card, Button, FormField, Switch, Checkbox } from '@/components/ui';
import { useRouter } from 'next/navigation';

type StatusPageConfigProps = {
    statusPage: {
        id: string;
        name: string;
        subdomain?: string | null;
        customDomain?: string | null;
        enabled: boolean;
        showServices: boolean;
        showIncidents: boolean;
        showMetrics: boolean;
        footerText?: string | null;
        contactEmail?: string | null;
        contactUrl?: string | null;
        services: Array<{
            id: string;
            serviceId: string;
            displayName?: string | null;
            showOnPage: boolean;
            order: number;
            service: {
                id: string;
                name: string;
            };
        }>;
    };
    allServices: Array<{
        id: string;
        name: string;
    }>;
};

export default function StatusPageConfig({ statusPage, allServices }: StatusPageConfigProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: statusPage.name,
        subdomain: statusPage.subdomain || '',
        customDomain: statusPage.customDomain || '',
        enabled: statusPage.enabled,
        showServices: statusPage.showServices,
        showIncidents: statusPage.showIncidents,
        showMetrics: statusPage.showMetrics,
        footerText: statusPage.footerText || '',
        contactEmail: statusPage.contactEmail || '',
        contactUrl: statusPage.contactUrl || '',
    });

    const [selectedServices, setSelectedServices] = useState<Set<string>>(
        new Set(statusPage.services.map(s => s.serviceId))
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        startTransition(async () => {
            try {
                const response = await fetch('/api/settings/status-page', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        serviceIds: Array.from(selectedServices),
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to save status page settings');
                }

                router.refresh();
            } catch (err: any) {
                setError(err.message || 'Failed to save settings');
            }
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                {/* Basic Settings */}
                <Card>
                    <div style={{ padding: 'var(--spacing-5)' }}>
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-4)' }}>
                            Basic Settings
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                            <FormField
                                label="Status Page Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />

                            <FormField
                                label="Subdomain"
                                value={formData.subdomain}
                                onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                                helperText="e.g., status (for status.yourcompany.com)"
                            />

                            <FormField
                                label="Custom Domain"
                                value={formData.customDomain}
                                onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                                helperText="e.g., status.yourcompany.com"
                            />

                            <Switch
                                checked={formData.enabled}
                                onChange={(checked) => setFormData({ ...formData, enabled: checked })}
                                label="Enable Status Page"
                            />
                        </div>
                    </div>
                </Card>

                {/* Display Options */}
                <Card>
                    <div style={{ padding: 'var(--spacing-5)' }}>
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-4)' }}>
                            Display Options
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                            <Switch
                                checked={formData.showServices}
                                onChange={(checked) => setFormData({ ...formData, showServices: checked })}
                                label="Show Services"
                            />
                            <Switch
                                checked={formData.showIncidents}
                                onChange={(checked) => setFormData({ ...formData, showIncidents: checked })}
                                label="Show Recent Incidents"
                            />
                            <Switch
                                checked={formData.showMetrics}
                                onChange={(checked) => setFormData({ ...formData, showMetrics: checked })}
                                label="Show Metrics"
                            />
                        </div>
                    </div>
                </Card>

                {/* Services */}
                <Card>
                    <div style={{ padding: 'var(--spacing-5)' }}>
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-4)' }}>
                            Services to Display
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                            {allServices.map((service) => (
                                <label
                                    key={service.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-2)',
                                        padding: 'var(--spacing-2)',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--color-neutral-50)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <Checkbox
                                        checked={selectedServices.has(service.id)}
                                        onChange={(e) => {
                                            const newSet = new Set(selectedServices);
                                            if (e.target.checked) {
                                                newSet.add(service.id);
                                            } else {
                                                newSet.delete(service.id);
                                            }
                                            setSelectedServices(newSet);
                                        }}
                                    />
                                    <span>{service.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Contact & Footer */}
                <Card>
                    <div style={{ padding: 'var(--spacing-5)' }}>
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-4)' }}>
                            Contact & Footer
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                            <FormField
                                label="Contact Email"
                                type="email"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            />

                            <FormField
                                label="Contact URL"
                                type="url"
                                value={formData.contactUrl}
                                onChange={(e) => setFormData({ ...formData, contactUrl: e.target.value })}
                            />

                            <FormField
                                label="Footer Text"
                                type="textarea"
                                rows={3}
                                value={formData.footerText}
                                onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                                helperText="Text to display at the bottom of the status page"
                            />
                        </div>
                    </div>
                </Card>

                {/* Preview Link */}
                <Card>
                    <div style={{ padding: 'var(--spacing-5)' }}>
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-4)' }}>
                            Preview
                        </h2>
                        <a
                            href="/status"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-block',
                                padding: 'var(--spacing-2) var(--spacing-4)',
                                background: 'var(--primary)',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                            }}
                        >
                            View Status Page →
                        </a>
                    </div>
                </Card>

                {error && (
                    <div style={{ padding: 'var(--spacing-3)', background: 'var(--color-error-light)', borderRadius: 'var(--radius-md)', color: 'var(--color-error-dark)' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'flex-end' }}>
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={isPending}
                    >
                        Save Settings
                    </Button>
                </div>
            </div>
        </form>
    );
}

