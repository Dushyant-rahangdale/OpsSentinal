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
        branding?: any;
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
    const [activeTab, setActiveTab] = useState('general');

    // Parse branding JSON
    const branding = statusPage.branding && typeof statusPage.branding === 'object' 
        ? statusPage.branding 
        : {};

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
        // Branding
        logoUrl: branding.logoUrl || '',
        faviconUrl: branding.faviconUrl || '',
        primaryColor: branding.primaryColor || '#667eea',
        backgroundColor: branding.backgroundColor || '#ffffff',
        textColor: branding.textColor || '#111827',
        // Custom CSS
        customCss: branding.customCss || '',
        // Layout
        layout: branding.layout || 'default', // default, compact, wide
        showHeader: branding.showHeader !== false,
        showFooter: branding.showFooter !== false,
        // Subscription
        enableSubscriptions: branding.enableSubscriptions !== false,
        subscriptionText: branding.subscriptionText || 'Subscribe to Updates',
        // SEO
        metaTitle: branding.metaTitle || statusPage.name,
        metaDescription: branding.metaDescription || `Status page for ${statusPage.name}`,
        // Advanced
        autoRefresh: branding.autoRefresh !== false,
        refreshInterval: branding.refreshInterval || 60,
        showRssLink: branding.showRssLink !== false,
        showApiLink: branding.showApiLink !== false,
    });

    const [selectedServices, setSelectedServices] = useState<Set<string>>(
        new Set(statusPage.services.map(s => s.serviceId))
    );

    const [serviceConfigs, setServiceConfigs] = useState<Record<string, { displayName: string; order: number; showOnPage: boolean }>>(
        statusPage.services.reduce((acc, sp) => {
            acc[sp.serviceId] = {
                displayName: sp.displayName || '',
                order: sp.order,
                showOnPage: sp.showOnPage,
            };
            return acc;
        }, {} as Record<string, { displayName: string; order: number; showOnPage: boolean }>)
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        startTransition(async () => {
            try {
                const brandingData = {
                    logoUrl: formData.logoUrl,
                    faviconUrl: formData.faviconUrl,
                    primaryColor: formData.primaryColor,
                    backgroundColor: formData.backgroundColor,
                    textColor: formData.textColor,
                    customCss: formData.customCss,
                    layout: formData.layout,
                    showHeader: formData.showHeader,
                    showFooter: formData.showFooter,
                    enableSubscriptions: formData.enableSubscriptions,
                    subscriptionText: formData.subscriptionText,
                    metaTitle: formData.metaTitle,
                    metaDescription: formData.metaDescription,
                    autoRefresh: formData.autoRefresh,
                    refreshInterval: formData.refreshInterval,
                    showRssLink: formData.showRssLink,
                    showApiLink: formData.showApiLink,
                };

                const response = await fetch('/api/settings/status-page', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        branding: brandingData,
                        serviceIds: Array.from(selectedServices),
                        serviceConfigs: serviceConfigs,
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

    const updateServiceConfig = (serviceId: string, updates: Partial<{ displayName: string; order: number; showOnPage: boolean }>) => {
        setServiceConfigs(prev => ({
            ...prev,
            [serviceId]: {
                ...prev[serviceId],
                ...updates,
            },
        }));
    };

    return (
        <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                {/* Tabs Navigation */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    borderBottom: '2px solid #e5e7eb',
                    marginBottom: 'var(--spacing-6)',
                }}>
                    {[
                        { id: 'general', label: 'General' },
                        { id: 'appearance', label: 'Appearance' },
                        { id: 'services', label: 'Services' },
                        { id: 'content', label: 'Content' },
                        { id: 'customization', label: 'Custom CSS' },
                        { id: 'advanced', label: 'Advanced' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: 'var(--spacing-3) var(--spacing-5)',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                                fontWeight: activeTab === tab.id ? '600' : '500',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-sm)',
                                transition: 'all 0.2s ease',
                                marginBottom: '-2px',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* General Settings */}
                {activeTab === 'general' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    Basic Settings
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                    <FormField
                                        type="input"
                                        label="Status Page Name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        helperText="The name displayed at the top of your status page"
                                    />

                                    <Switch
                                        checked={formData.enabled}
                                        onChange={(checked) => setFormData({ ...formData, enabled: checked })}
                                        label="Enable Status Page"
                                        helperText="When disabled, the status page will not be publicly accessible"
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    Domain Configuration
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                    <FormField
                                        type="input"
                                        label="Subdomain"
                                        value={formData.subdomain}
                                        onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                                        placeholder="status"
                                        helperText="e.g., status (for status.yourcompany.com). Requires DNS configuration."
                                    />

                                    <FormField
                                        type="input"
                                        label="Custom Domain"
                                        value={formData.customDomain}
                                        onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                                        placeholder="status.yourcompany.com"
                                        helperText="Full custom domain. Requires DNS CNAME record pointing to your status page."
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    Contact Information
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                    <FormField
                                        type="email"
                                        label="Contact Email"
                                        value={formData.contactEmail}
                                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                        placeholder="support@yourcompany.com"
                                        helperText="Email address for users to contact you"
                                    />

                                    <FormField
                                        type="url"
                                        label="Contact URL"
                                        value={formData.contactUrl}
                                        onChange={(e) => setFormData({ ...formData, contactUrl: e.target.value })}
                                        placeholder="https://yourcompany.com/contact"
                                        helperText="URL for contact page or support portal"
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Appearance Settings */}
                {activeTab === 'appearance' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    Branding
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                    <FormField
                                        type="url"
                                        label="Logo URL"
                                        value={formData.logoUrl}
                                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                        placeholder="https://yourcompany.com/logo.png"
                                        helperText="URL to your logo image (recommended: 200x50px, PNG or SVG)"
                                    />

                                    <FormField
                                        type="url"
                                        label="Favicon URL"
                                        value={formData.faviconUrl}
                                        onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
                                        placeholder="https://yourcompany.com/favicon.ico"
                                        helperText="URL to your favicon (16x16 or 32x32px, ICO or PNG)"
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    Color Scheme
                                </h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-4)' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', fontWeight: '500' }}>
                                            Primary Color
                                        </label>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                            <input
                                                type="color"
                                                value={formData.primaryColor}
                                                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                                style={{ width: '60px', height: '40px', border: '1px solid #e5e7eb', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                                            />
                                            <FormField
                                                type="input"
                                                value={formData.primaryColor}
                                                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                                placeholder="#667eea"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', fontWeight: '500' }}>
                                            Background Color
                                        </label>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                            <input
                                                type="color"
                                                value={formData.backgroundColor}
                                                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                                style={{ width: '60px', height: '40px', border: '1px solid #e5e7eb', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                                            />
                                            <FormField
                                                type="input"
                                                value={formData.backgroundColor}
                                                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                                placeholder="#ffffff"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', fontWeight: '500' }}>
                                            Text Color
                                        </label>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                            <input
                                                type="color"
                                                value={formData.textColor}
                                                onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                                                style={{ width: '60px', height: '40px', border: '1px solid #e5e7eb', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                                            />
                                            <FormField
                                                type="input"
                                                value={formData.textColor}
                                                onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                                                placeholder="#111827"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    Layout Options
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                                    <FormField
                                        type="select"
                                        label="Layout Style"
                                        value={formData.layout}
                                        onChange={(e) => setFormData({ ...formData, layout: e.target.value })}
                                        options={[
                                            { value: 'default', label: 'Default' },
                                            { value: 'compact', label: 'Compact' },
                                            { value: 'wide', label: 'Wide' },
                                        ]}
                                    />
                                    <Switch
                                        checked={formData.showHeader}
                                        onChange={(checked) => setFormData({ ...formData, showHeader: checked })}
                                        label="Show Header"
                                    />
                                    <Switch
                                        checked={formData.showFooter}
                                        onChange={(checked) => setFormData({ ...formData, showFooter: checked })}
                                        label="Show Footer"
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Services Configuration */}
                {activeTab === 'services' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    Services to Display
                                </h2>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 'var(--spacing-4)' }}>
                                    Select which services to show on your status page and configure their display settings.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                                    {allServices.map((service) => {
                                        const isSelected = selectedServices.has(service.id);
                                        const config = serviceConfigs[service.id] || { displayName: '', order: 0, showOnPage: true };

                                        return (
                                            <div
                                                key={service.id}
                                                style={{
                                                    padding: 'var(--spacing-4)',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: 'var(--radius-md)',
                                                    background: isSelected ? '#f9fafb' : 'white',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: isSelected ? 'var(--spacing-3)' : '0' }}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            const newSet = new Set(selectedServices);
                                                            if (e.target.checked) {
                                                                newSet.add(service.id);
                                                                if (!serviceConfigs[service.id]) {
                                                                    updateServiceConfig(service.id, { displayName: '', order: 0, showOnPage: true });
                                                                }
                                                            } else {
                                                                newSet.delete(service.id);
                                                            }
                                                            setSelectedServices(newSet);
                                                        }}
                                                    />
                                                    <span style={{ fontWeight: '600', flex: 1 }}>{service.name}</span>
                                                </div>
                                                {isSelected && (
                                                    <div style={{ 
                                                        display: 'grid', 
                                                        gridTemplateColumns: '2fr 1fr 1fr', 
                                                        gap: 'var(--spacing-3)',
                                                        marginTop: 'var(--spacing-3)',
                                                        paddingTop: 'var(--spacing-3)',
                                                        borderTop: '1px solid #e5e7eb',
                                                    }}>
                                                        <FormField
                                                            type="input"
                                                            label="Display Name"
                                                            value={config.displayName}
                                                            onChange={(e) => updateServiceConfig(service.id, { displayName: e.target.value })}
                                                            placeholder={service.name}
                                                            helperText="Override service name on status page"
                                                        />
                                                        <FormField
                                                            type="input"
                                                            label="Order"
                                                            value={config.order.toString()}
                                                            onChange={(e) => updateServiceConfig(service.id, { order: parseInt(e.target.value) || 0 })}
                                                            placeholder="0"
                                                            helperText="Display order (lower = first)"
                                                        />
                                                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                            <Switch
                                                                checked={config.showOnPage}
                                                                onChange={(checked) => updateServiceConfig(service.id, { showOnPage: checked })}
                                                                label="Show on Page"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Content Settings */}
                {activeTab === 'content' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    Display Options
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                                    <Switch
                                        checked={formData.showServices}
                                        onChange={(checked) => setFormData({ ...formData, showServices: checked })}
                                        label="Show Services"
                                        helperText="Display service status list"
                                    />
                                    <Switch
                                        checked={formData.showIncidents}
                                        onChange={(checked) => setFormData({ ...formData, showIncidents: checked })}
                                        label="Show Recent Incidents"
                                        helperText="Display recent incidents and their timeline"
                                    />
                                    <Switch
                                        checked={formData.showMetrics}
                                        onChange={(checked) => setFormData({ ...formData, showMetrics: checked })}
                                        label="Show Uptime Metrics"
                                        helperText="Display 30-day and 90-day uptime statistics"
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    Subscription Settings
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                    <Switch
                                        checked={formData.enableSubscriptions}
                                        onChange={(checked) => setFormData({ ...formData, enableSubscriptions: checked })}
                                        label="Enable Email Subscriptions"
                                        helperText="Allow users to subscribe to status updates via email"
                                    />
                                    {formData.enableSubscriptions && (
                                        <FormField
                                            type="input"
                                            label="Subscription Text"
                                            value={formData.subscriptionText}
                                            onChange={(e) => setFormData({ ...formData, subscriptionText: e.target.value })}
                                            placeholder="Subscribe to Updates"
                                            helperText="Text displayed on the subscription form"
                                        />
                                    )}
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    Footer
                                </h2>
                                <FormField
                                    type="textarea"
                                    label="Footer Text"
                                    rows={3}
                                    value={formData.footerText}
                                    onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                                    placeholder="© 2024 Your Company. All rights reserved."
                                    helperText="Text to display at the bottom of the status page"
                                />
                            </div>
                        </Card>

                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    SEO Settings
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                    <FormField
                                        type="input"
                                        label="Meta Title"
                                        value={formData.metaTitle}
                                        onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                                        placeholder={statusPage.name}
                                        helperText="Page title for search engines (50-60 characters recommended)"
                                    />
                                    <FormField
                                        type="textarea"
                                        label="Meta Description"
                                        rows={2}
                                        value={formData.metaDescription}
                                        onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                                        placeholder={`Status page for ${statusPage.name}`}
                                        helperText="Page description for search engines (150-160 characters recommended)"
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Custom CSS */}
                {activeTab === 'customization' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    Custom CSS
                                </h2>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 'var(--spacing-4)' }}>
                                    Add custom CSS to fully customize your status page appearance. This CSS will be injected into the status page.
                                </p>
                                <div style={{ marginBottom: 'var(--spacing-4)' }}>
                                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', fontWeight: '500' }}>
                                        Custom CSS Code
                                    </label>
                                    <textarea
                                        value={formData.customCss}
                                        onChange={(e) => setFormData({ ...formData, customCss: e.target.value })}
                                        placeholder="/* Your custom CSS here */&#10;.status-page-header {&#10;  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);&#10;}"
                                        rows={15}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-3)',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: 'var(--radius-md)',
                                            fontFamily: 'monospace',
                                            fontSize: '0.875rem',
                                            lineHeight: '1.6',
                                            resize: 'vertical',
                                        }}
                                    />
                                </div>
                                <div style={{
                                    padding: 'var(--spacing-3)',
                                    background: '#fef3c7',
                                    border: '1px solid #fde68a',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                }}>
                                    <strong>💡 Tips:</strong>
                                    <ul style={{ marginTop: 'var(--spacing-2)', paddingLeft: 'var(--spacing-5)' }}>
                                        <li>Use <code>.status-page-header</code> to style the header</li>
                                        <li>Use <code>.status-service-card</code> to style service cards</li>
                                        <li>Use <code>.status-incident-card</code> to style incident cards</li>
                                        <li>Test your CSS on the preview before publishing</li>
                                    </ul>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    Preview
                                </h2>
                                <a
                                    href="/status"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-block',
                                        padding: 'var(--spacing-3) var(--spacing-5)',
                                        background: 'var(--primary)',
                                        color: 'white',
                                        textDecoration: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--primary-hover)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--primary)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    View Status Page →
                                </a>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--spacing-2)' }}>
                                    Open in a new tab to preview your changes
                                </p>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Advanced Settings */}
                {activeTab === 'advanced' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    Auto-Refresh
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                    <Switch
                                        checked={formData.autoRefresh}
                                        onChange={(checked) => setFormData({ ...formData, autoRefresh: checked })}
                                        label="Enable Auto-Refresh"
                                        helperText="Automatically refresh the status page at regular intervals"
                                    />
                                    {formData.autoRefresh && (
                                        <FormField
                                            type="input"
                                            label="Refresh Interval (seconds)"
                                            value={formData.refreshInterval.toString()}
                                            onChange={(e) => setFormData({ ...formData, refreshInterval: parseInt(e.target.value) || 60 })}
                                            placeholder="60"
                                            helperText="How often to refresh the page (minimum: 30 seconds)"
                                        />
                                    )}
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    API & Feeds
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                                    <Switch
                                        checked={formData.showRssLink}
                                        onChange={(checked) => setFormData({ ...formData, showRssLink: checked })}
                                        label="Show RSS Feed Link"
                                        helperText="Display link to RSS feed in footer"
                                    />
                                    <Switch
                                        checked={formData.showApiLink}
                                        onChange={(checked) => setFormData({ ...formData, showApiLink: checked })}
                                        label="Show JSON API Link"
                                        helperText="Display link to JSON API in footer"
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div style={{ padding: 'var(--spacing-6)' }}>
                                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                    API Endpoints
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                                    <div style={{
                                        padding: 'var(--spacing-3)',
                                        background: '#f9fafb',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 'var(--radius-md)',
                                    }}>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 'var(--spacing-1)' }}>
                                            JSON API
                                        </div>
                                        <code style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                                            {typeof window !== 'undefined' ? window.location.origin : ''}/api/status
                                        </code>
                                    </div>
                                    <div style={{
                                        padding: 'var(--spacing-3)',
                                        background: '#f9fafb',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 'var(--radius-md)',
                                    }}>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 'var(--spacing-1)' }}>
                                            RSS Feed
                                        </div>
                                        <code style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                                            {typeof window !== 'undefined' ? window.location.origin : ''}/api/status/rss
                                        </code>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {error && (
                    <div style={{ padding: 'var(--spacing-3)', background: 'var(--color-error-light)', borderRadius: 'var(--radius-md)', color: 'var(--color-error-dark)' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'flex-end', paddingTop: 'var(--spacing-4)', borderTop: '1px solid #e5e7eb' }}>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => router.refresh()}
                    >
                        Cancel
                    </Button>
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
