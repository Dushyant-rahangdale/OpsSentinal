'use client';

import { useState, useTransition } from 'react';
import { Card, Button, FormField, Switch, Checkbox } from '@/components/ui';
import StatusPageLivePreview from '@/components/status-page/StatusPageLivePreview';
import { useRouter } from 'next/navigation';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import StatusPageHeader from '@/components/status-page/StatusPageHeader';
import StatusPageServices from '@/components/status-page/StatusPageServices';
import StatusPageIncidents from '@/components/status-page/StatusPageIncidents';
import StatusPageAnnouncements from '@/components/status-page/StatusPageAnnouncements';
import StatusPagePrivacySettings from '@/components/status-page/StatusPagePrivacySettings';
import StatusPageWebhooksSettings from '@/components/status-page/StatusPageWebhooksSettings';

type StatusPageConfigProps = {
    statusPage: {
        id: string;
        name: string;
        organizationName?: string | null;
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
        announcements: Array<{
            id: string;
            title: string;
            message: string;
            type: string;
            startDate: string;
            endDate?: string | null;
            isActive: boolean;
        }>;
    };
    allServices: Array<{
        id: string;
        name: string;
    }>;
};

const ANNOUNCEMENT_TYPES = [
    { value: 'INCIDENT', label: 'Incident', color: '#ef4444', background: '#fee2e2' },
    { value: 'MAINTENANCE', label: 'Maintenance', color: '#2563eb', background: '#dbeafe' },
    { value: 'UPDATE', label: 'Update', color: '#10b981', background: '#dcfce7' },
    { value: 'WARNING', label: 'Warning', color: '#f59e0b', background: '#fef3c7' },
    { value: 'INFO', label: 'Information', color: '#64748b', background: '#f1f5f9' },
];

export default function StatusPageConfig({ statusPage, allServices }: StatusPageConfigProps) {
    const { browserTimeZone } = useTimezone();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState('general');
    const [showPreview, setShowPreview] = useState(false);
    const [announcementError, setAnnouncementError] = useState<string | null>(null);
    const [isAnnouncementPending, startAnnouncementTransition] = useTransition();
    const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

    // Parse branding JSON
    const branding = statusPage.branding && typeof statusPage.branding === 'object'
        ? statusPage.branding
        : {};

    const [formData, setFormData] = useState({
        name: statusPage.name,
        organizationName: statusPage.organizationName || '',
        subdomain: statusPage.subdomain || '',
        customDomain: statusPage.customDomain || '',
        enabled: statusPage.enabled,
        showServices: statusPage.showServices,
        showIncidents: statusPage.showIncidents,
        showMetrics: statusPage.showMetrics,
        uptimeExcellentThreshold: (statusPage as any).uptimeExcellentThreshold ?? 99.9,
        uptimeGoodThreshold: (statusPage as any).uptimeGoodThreshold ?? 99.0,
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
        // SEO
        metaTitle: branding.metaTitle || statusPage.name,
        metaDescription: branding.metaDescription || `Status page for ${statusPage.name}`,
        // Advanced
        autoRefresh: branding.autoRefresh !== false,
        refreshInterval: branding.refreshInterval || 60,
        showRssLink: branding.showRssLink !== false,
        showApiLink: branding.showApiLink !== false,
    });

    const [announcementForm, setAnnouncementForm] = useState({
        title: '',
        message: '',
        type: 'INFO',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        isActive: true,
        notifySubscribers: true,
    });
    const [announcements, setAnnouncements] = useState(statusPage.announcements);

    // Sidebar items - defined after announcements state
    const sidebarItems = [
        // ... (skipping unchanged lines) ...
        // NOTE: I cannot use skip notation in replacement content accurately if not careful.
        // I should split this into multiple edits or handle the state init and UI render separately.
        // Let's do state init first.

        { id: 'general', label: 'General' },
        { id: 'appearance', label: 'Appearance' },
        { id: 'services', label: 'Services' },
        { id: 'privacy', label: 'Privacy & Data' },
        { id: 'content', label: 'Content' },
        { id: 'announcements', label: 'Announcements', badge: announcements.length },
        { id: 'integrations', label: 'Integrations' },
        { id: 'subscribers', label: 'Subscribers', link: '/settings/status-page/subscribers' },
        { id: 'customization', label: 'Custom CSS' },
        { id: 'advanced', label: 'Advanced' },
    ];

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

    // Privacy settings - with defaults if not in statusPage
    const [privacySettings, setPrivacySettings] = useState({
        privacyMode: (statusPage as any).privacyMode || 'PUBLIC',
        showIncidentDetails: (statusPage as any).showIncidentDetails !== false,
        showIncidentTitles: (statusPage as any).showIncidentTitles !== false,
        showIncidentDescriptions: (statusPage as any).showIncidentDescriptions !== false,
        showAffectedServices: (statusPage as any).showAffectedServices !== false,
        showIncidentTimestamps: (statusPage as any).showIncidentTimestamps !== false,
        showServiceMetrics: (statusPage as any).showServiceMetrics !== false,
        showServiceDescriptions: (statusPage as any).showServiceDescriptions !== false,
        showTeamInformation: (statusPage as any).showTeamInformation || false,
        showCustomFields: (statusPage as any).showCustomFields || false,
        showIncidentAssignees: (statusPage as any).showIncidentAssignees || false,
        showIncidentUrgency: (statusPage as any).showIncidentUrgency !== false,
        showUptimeHistory: (statusPage as any).showUptimeHistory !== false,
        showRecentIncidents: (statusPage as any).showRecentIncidents !== false,
        maxIncidentsToShow: (statusPage as any).maxIncidentsToShow || 50,
        incidentHistoryDays: (statusPage as any).incidentHistoryDays || 90,
        allowedCustomFields: (statusPage as any).allowedCustomFields || [],
        dataRetentionDays: (statusPage as any).dataRetentionDays || null,
        requireAuth: (statusPage as any).requireAuth || false,
        authProvider: (statusPage as any).authProvider || null,
    });

    const selectedServiceIds = Array.from(selectedServices);
    const previewServiceIds = selectedServiceIds.length > 0 ? selectedServiceIds : allServices.map((service) => service.id);
    const previewServices = allServices
        .filter((service) => previewServiceIds.includes(service.id))
        .map((service) => ({
            id: service.id,
            name: service.name,
            status: 'OPERATIONAL',
            _count: { incidents: 0 },
        }));

    const previewStatusPageServices = selectedServiceIds.length > 0
        ? selectedServiceIds
            .map((serviceId, index) => {
                const config = serviceConfigs[serviceId] || { displayName: '', order: index, showOnPage: true };
                return {
                    id: `preview-${serviceId}`,
                    serviceId,
                    displayName: config.displayName || null,
                    showOnPage: config.showOnPage !== false,
                    order: config.order ?? index,
                };
            })
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : [];

    const previewUptime90 = previewServices.reduce<Record<string, number>>((acc, service) => {
        acc[service.id] = 100;
        return acc;
    }, {});

    const today = new Date();
    const previewAnnouncements = announcements
        .map((announcement) => ({
            ...announcement,
            startDate: new Date(announcement.startDate),
            endDate: announcement.endDate ? new Date(announcement.endDate) : null,
        }))
        .filter((announcement) => {
            if (!announcement.isActive) {
                return false;
            }
            if (!announcement.endDate) {
                return true;
            }
            return announcement.endDate >= today;
        });

    const previewBranding = {
        logoUrl: formData.logoUrl,
        faviconUrl: formData.faviconUrl,
        primaryColor: formData.primaryColor,
        backgroundColor: formData.backgroundColor,
        textColor: formData.textColor,
        customCss: formData.customCss,
        layout: formData.layout,
        showHeader: formData.showHeader,
        showFooter: formData.showFooter,
        showRssLink: formData.showRssLink,
        showApiLink: formData.showApiLink,
        uptimeExcellentThreshold: formData.uptimeExcellentThreshold,
        uptimeGoodThreshold: formData.uptimeGoodThreshold,
    };
    const previewMaxWidth = formData.layout === 'wide'
        ? '1600px'
        : formData.layout === 'compact'
            ? '900px'
            : '1280px';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

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
                        name: formData.name,
                        organizationName: formData.organizationName || null,
                        subdomain: formData.subdomain || null,
                        customDomain: formData.customDomain || null,
                        enabled: formData.enabled,
                        showServices: formData.showServices,
                        showIncidents: formData.showIncidents,
                        showMetrics: formData.showMetrics,
                        uptimeExcellentThreshold: formData.uptimeExcellentThreshold,
                        uptimeGoodThreshold: formData.uptimeGoodThreshold,
                        footerText: formData.footerText || null,
                        contactEmail: formData.contactEmail || null,
                        contactUrl: formData.contactUrl || null,
                        branding: brandingData,
                        serviceIds: Array.from(selectedServices),
                        serviceConfigs: serviceConfigs,
                        // Privacy settings
                        privacyMode: privacySettings.privacyMode,
                        showIncidentDetails: privacySettings.showIncidentDetails,
                        showIncidentTitles: privacySettings.showIncidentTitles,
                        showIncidentDescriptions: privacySettings.showIncidentDescriptions,
                        showAffectedServices: privacySettings.showAffectedServices,
                        showIncidentTimestamps: privacySettings.showIncidentTimestamps,
                        showServiceMetrics: privacySettings.showServiceMetrics,
                        showServiceDescriptions: privacySettings.showServiceDescriptions,
                        showTeamInformation: privacySettings.showTeamInformation,
                        showCustomFields: privacySettings.showCustomFields,
                        showIncidentAssignees: privacySettings.showIncidentAssignees,
                        showIncidentUrgency: privacySettings.showIncidentUrgency,
                        showUptimeHistory: privacySettings.showUptimeHistory,
                        showRecentIncidents: privacySettings.showRecentIncidents,
                        maxIncidentsToShow: privacySettings.maxIncidentsToShow,
                        incidentHistoryDays: privacySettings.incidentHistoryDays,
                        allowedCustomFields: privacySettings.allowedCustomFields,
                        dataRetentionDays: privacySettings.dataRetentionDays,
                        requireAuth: privacySettings.requireAuth,
                        authProvider: privacySettings.authProvider,
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to save status page settings');
                }

                setSuccessMessage('Settings saved successfully!');
                // Clear success message after 3 seconds
                setTimeout(() => setSuccessMessage(null), 3000);
                router.refresh();
            } catch (err: any) {
                const { getUserFriendlyError } = await import('@/lib/user-friendly-errors');
                setError(getUserFriendlyError(err) || 'Failed to save settings');
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

    const handleLogoUpload = (file: File | null) => {
        if (!file) {
            return;
        }
        setLogoUploadError(null);

        const maxSizeBytes = 1 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            setLogoUploadError('Logo file must be under 1MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            if (!result.startsWith('data:image/')) {
                setLogoUploadError('Unsupported image type.');
                return;
            }
            setFormData({ ...formData, logoUrl: result });
        };
        reader.onerror = () => {
            setLogoUploadError('Failed to read logo file.');
        };
        reader.readAsDataURL(file);
    };

    const handleAnnouncementCreate = async (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();
        setAnnouncementError(null);

        const title = announcementForm.title.trim();
        const message = announcementForm.message.trim();
        if (!title || !message) {
            setAnnouncementError('Title and message are required.');
            return;
        }

        startAnnouncementTransition(async () => {
            try {
                const response = await fetch('/api/settings/status-page/announcements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        statusPageId: statusPage.id,
                        title,
                        message,
                        type: announcementForm.type,
                        startDate: announcementForm.startDate,
                        endDate: announcementForm.endDate || null,
                        isActive: announcementForm.isActive,
                        notifySubscribers: announcementForm.notifySubscribers,
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to create announcement');
                }

                const data = await response.json();
                if (data?.announcement) {
                    setAnnouncements((current) => {
                        const next = [data.announcement, ...current];
                        return next.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
                    });
                }

                setAnnouncementForm({
                    title: '',
                    message: '',
                    type: 'INFO',
                    startDate: new Date().toISOString().slice(0, 10),
                    endDate: '',
                    isActive: true,
                    notifySubscribers: true,
                });

            } catch (err: any) {
                const { getUserFriendlyError } = await import('@/lib/user-friendly-errors');
                setAnnouncementError(getUserFriendlyError(err) || 'Failed to create announcement');
            }
        });
    };

    const handleAnnouncementDelete = (id: string) => {
        setAnnouncementError(null);

        startAnnouncementTransition(async () => {
            try {
                const response = await fetch('/api/settings/status-page/announcements', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to delete announcement');
                }

                setAnnouncements((current) => current.filter((announcement) => announcement.id !== id));
            } catch (err: any) {
                const { getUserFriendlyError } = await import('@/lib/user-friendly-errors');
                setAnnouncementError(getUserFriendlyError(err) || 'Failed to delete announcement');
            }
        });
    };

    // Prepare privacy settings for preview
    const previewPrivacySettings = {
        privacyMode: privacySettings.privacyMode || 'PUBLIC',
        showIncidentDetails: privacySettings.showIncidentDetails !== false,
        showIncidentTitles: privacySettings.showIncidentTitles !== false,
        showIncidentDescriptions: privacySettings.showIncidentDescriptions !== false,
        showAffectedServices: privacySettings.showAffectedServices !== false,
        showIncidentTimestamps: privacySettings.showIncidentTimestamps !== false,
        showServiceMetrics: privacySettings.showServiceMetrics !== false,
        showServiceDescriptions: privacySettings.showServiceDescriptions !== false,
        showTeamInformation: privacySettings.showTeamInformation || false,
        showCustomFields: privacySettings.showCustomFields || false,
        showIncidentAssignees: privacySettings.showIncidentAssignees || false,
        showIncidentUrgency: privacySettings.showIncidentUrgency !== false,
        showUptimeHistory: privacySettings.showUptimeHistory !== false,
        showRecentIncidents: privacySettings.showRecentIncidents !== false,
        maxIncidentsToShow: privacySettings.maxIncidentsToShow || 50,
        incidentHistoryDays: privacySettings.incidentHistoryDays || 90,
        allowedCustomFields: privacySettings.allowedCustomFields || [],
        dataRetentionDays: privacySettings.dataRetentionDays || null,
        requireAuth: privacySettings.requireAuth !== false,
        authProvider: privacySettings.authProvider || null,
    };

    const previewData = {
        statusPage: {
            name: formData.name,
            contactEmail: formData.contactEmail || null,
            contactUrl: formData.contactUrl || null,
        },
        branding: previewBranding,
        services: previewServices,
        statusPageServices: previewStatusPageServices,
        announcements: previewAnnouncements.map((a: any) => ({
            ...a,
            startDate: a.startDate.toISOString(),
            endDate: a.endDate ? a.endDate.toISOString() : null,
        })),
        uptime90: previewUptime90,
        incidents: [],
        showServices: formData.showServices,
        showIncidents: formData.showIncidents,
        showHeader: formData.showHeader,
        showFooter: formData.showFooter,
        footerText: formData.footerText || null,
        showRssLink: formData.showRssLink,
        showApiLink: formData.showApiLink,
        layout: formData.layout,
        privacySettings: previewPrivacySettings,
    };

    return (
        <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', gap: 0, overflow: 'hidden' }}>
                {/* Header with Preview Toggle */}
                <div style={{
                    padding: 'var(--spacing-4) var(--spacing-6)',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'white',
                    flexShrink: 0,
                }}>
                    <div>
                        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700', margin: 0 }}>
                            Status Page Settings
                        </h1>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', margin: 'var(--spacing-1) 0 0 0' }}>
                            Configure your public status page
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant={showPreview ? 'primary' : 'secondary'}
                        onClick={() => setShowPreview(!showPreview)}
                    >
                        {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </Button>
                </div>

                {/* Top Navigation */}
                <div style={{
                    borderBottom: '1px solid #e5e7eb',
                    background: 'white',
                    padding: '0 var(--spacing-6)',
                    display: 'flex',
                    gap: 'var(--spacing-6)',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    flexShrink: 0,
                }}>
                    {sidebarItems.map((item) => {
                        const ItemComponent = (item as any).link ? 'a' : 'button';
                        return (
                            <ItemComponent
                                key={item.id}
                                type={!(item as any).link ? "button" : undefined}
                                href={(item as any).link}
                                onClick={() => !(item as any).link && setActiveSection(item.id)}
                                style={{
                                    appearance: 'none',
                                    background: 'transparent',
                                    border: 'none',
                                    padding: 'var(--spacing-3) 0',
                                    borderBottom: activeSection === item.id ? '2px solid var(--primary)' : '2px solid transparent',
                                    color: activeSection === item.id ? 'var(--primary)' : 'var(--text-muted)',
                                    fontWeight: activeSection === item.id ? '600' : '500',
                                    fontSize: 'var(--font-size-sm)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-2)',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap',
                                    textDecoration: 'none',
                                }}
                            >
                                {item.label}
                                {item.badge ? (
                                    <span style={{
                                        background: activeSection === item.id ? 'var(--primary)' : '#e5e7eb',
                                        color: activeSection === item.id ? 'white' : 'var(--text-muted)',
                                        fontSize: 'var(--font-size-xs)',
                                        padding: '0.125rem 0.5rem',
                                        borderRadius: '999px',
                                        fontWeight: '600',
                                    }}>
                                        {item.badge}
                                    </span>
                                ) : null}
                            </ItemComponent>
                        );
                    })}
                </div>

                {/* Content Area with Optional Preview */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Settings Content */}
                    <div style={{
                        flex: showPreview ? '0 0 50%' : '1',
                        overflowY: 'auto',
                        padding: 'var(--spacing-6)',
                        background: '#f9fafb',
                        transition: 'flex 0.3s ease',
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)', maxWidth: '900px' }}>
                            {/* General Settings */}
                            {activeSection === 'general' && (
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

                                                <FormField
                                                    type="input"
                                                    label="Organization Name"
                                                    value={formData.organizationName}
                                                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                                                    helperText="Used in email headers (e.g., 'OpsSure'). Overrides Status Page Name if set."
                                                    placeholder="e.g. OpsSure"
                                                />

                                                <Switch
                                                    checked={formData.enabled}
                                                    onChange={(checked) => setFormData({ ...formData, enabled: checked })}
                                                    label="Enable Status Page"
                                                    helperText="When disabled, the status page will not be accessible. Note: By default, authentication is required. To make the status page public, disable 'Require Authentication' in Privacy & Data settings."
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
                                                    type="input"
                                                    inputType="email"
                                                    label="Contact Email"
                                                    value={formData.contactEmail}
                                                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                                    placeholder="support@yourcompany.com"
                                                    helperText="Email address for users to contact you"
                                                />

                                                <FormField
                                                    type="input"
                                                    inputType="url"
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
                            {activeSection === 'appearance' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                                    <Card>
                                        <div style={{ padding: 'var(--spacing-6)' }}>
                                            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                                Branding & Logo
                                            </h2>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                                                <div>
                                                    <FormField
                                                        type="input"
                                                        inputType="url"
                                                        label="Logo URL"
                                                        value={formData.logoUrl}
                                                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                                        placeholder="https://yourcompany.com/logo.png"
                                                        helperText="Full URL to your logo image. Recommended: 200x50px, PNG or SVG format. The logo will appear in the status page header."
                                                        required={false}
                                                    />
                                                    <div style={{ marginTop: 'var(--spacing-3)' }}>
                                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--spacing-2)' }}>
                                                            Upload Logo
                                                        </label>
                                                        <input
                                                            type="file"
                                                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                                            onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.4rem 0',
                                                                fontSize: 'var(--font-size-sm)',
                                                            }}
                                                        />
                                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--spacing-1)' }}>
                                                            Uploads are stored as data URLs. Max size 1MB.
                                                        </div>
                                                        {logoUploadError && (
                                                            <div style={{ color: 'var(--color-error-dark)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-1)' }}>
                                                                {logoUploadError}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {formData.logoUrl && (
                                                        <div style={{
                                                            marginTop: 'var(--spacing-3)',
                                                            padding: 'var(--spacing-4)',
                                                            background: '#f9fafb',
                                                            border: '1px solid #e5e7eb',
                                                            borderRadius: 'var(--radius-md)',
                                                        }}>
                                                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--spacing-2)', color: '#374151' }}>
                                                                Logo Preview:
                                                            </div>
                                                            <div style={{
                                                                padding: 'var(--spacing-3)',
                                                                background: 'white',
                                                                border: '1px solid #e5e7eb',
                                                                borderRadius: 'var(--radius-md)',
                                                                display: 'inline-block',
                                                            }}>
                                                                <img
                                                                    src={formData.logoUrl}
                                                                    alt="Logo preview"
                                                                    style={{
                                                                        height: '50px',
                                                                        maxWidth: '200px',
                                                                        objectFit: 'contain',
                                                                    }}
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                        const parent = (e.target as HTMLImageElement).parentElement;
                                                                        if (parent) {
                                                                            parent.innerHTML = '<div style="padding: 1rem; color: #ef4444; font-size: 0.875rem;">Failed to load image. Please check the URL.</div>';
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <FormField
                                                        type="input"
                                                        inputType="url"
                                                        label="Favicon URL"
                                                        value={formData.faviconUrl}
                                                        onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
                                                        placeholder="https://yourcompany.com/favicon.ico"
                                                        helperText="Full URL to your favicon. Recommended: 16x16 or 32x32px, ICO or PNG format. This appears in browser tabs."
                                                    />
                                                    {formData.faviconUrl && (
                                                        <div style={{
                                                            marginTop: 'var(--spacing-3)',
                                                            padding: 'var(--spacing-4)',
                                                            background: '#f9fafb',
                                                            border: '1px solid #e5e7eb',
                                                            borderRadius: 'var(--radius-md)',
                                                        }}>
                                                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--spacing-2)', color: '#374151' }}>
                                                                Favicon Preview:
                                                            </div>
                                                            <div style={{
                                                                padding: 'var(--spacing-3)',
                                                                background: 'white',
                                                                border: '1px solid #e5e7eb',
                                                                borderRadius: 'var(--radius-md)',
                                                                display: 'inline-block',
                                                            }}>
                                                                <img
                                                                    src={formData.faviconUrl}
                                                                    alt="Favicon preview"
                                                                    style={{
                                                                        width: '32px',
                                                                        height: '32px',
                                                                        objectFit: 'contain',
                                                                    }}
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                        const parent = (e.target as HTMLImageElement).parentElement;
                                                                        if (parent) {
                                                                            parent.innerHTML = '<div style="padding: 0.5rem; color: #ef4444; font-size: 0.875rem;">Failed to load favicon. Please check the URL.</div>';
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
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
                                                            inputType="text"
                                                            label="Primary Color"
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
                                                            inputType="text"
                                                            label="Background Color"
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
                                                            inputType="text"
                                                            label="Text Color"
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

                                    <Card>
                                        <div style={{ padding: 'var(--spacing-6)' }}>
                                            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-4)' }}>
                                                Preview
                                            </h2>
                                            <div style={{
                                                padding: 'var(--spacing-6)',
                                                background: '#f0f9ff',
                                                border: '1px solid #bae6fd',
                                                borderRadius: 'var(--radius-md)',
                                                textAlign: 'center',
                                            }}>
                                                <p style={{ fontSize: 'var(--font-size-sm)', color: '#0369a1', margin: 0 }}>
                                                    Use the <strong>"Show Preview"</strong> button in the top right to see a live preview of your status page.
                                                    The preview updates in real-time as you make changes.
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* Services Configuration */}
                            {activeSection === 'services' && (
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

                            {/* Privacy Settings */}
                            {activeSection === 'privacy' && (
                                <StatusPagePrivacySettings
                                    settings={privacySettings}
                                    onChange={(settings) => setPrivacySettings(settings as any)}
                                />
                            )}

                            {/* Content Settings */}
                            {activeSection === 'content' && (
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
                                                    label="Show Metrics"
                                                    helperText="Display uptime and performance metrics"
                                                />

                                                {formData.showMetrics && (
                                                    <div style={{
                                                        marginTop: 'var(--spacing-4)',
                                                        padding: 'var(--spacing-4)',
                                                        background: '#f9fafb',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid #e5e7eb',
                                                    }}>
                                                        <h4 style={{
                                                            fontSize: 'var(--font-size-sm)',
                                                            fontWeight: '600',
                                                            marginBottom: 'var(--spacing-3)',
                                                            color: '#374151',
                                                        }}>
                                                            Uptime Thresholds
                                                        </h4>
                                                        <p style={{
                                                            fontSize: 'var(--font-size-xs)',
                                                            color: '#6b7280',
                                                            marginBottom: 'var(--spacing-3)',
                                                        }}>
                                                            Configure SLA thresholds for color-coding uptime metrics
                                                        </p>
                                                        <div style={{ display: 'grid', gap: 'var(--spacing-3)', gridTemplateColumns: '1fr 1fr' }}>
                                                            <FormField
                                                                type="input"
                                                                label="Excellent Threshold (%)"
                                                                value={formData.uptimeExcellentThreshold}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    if (!isNaN(val) && val >= 0 && val <= 100) {
                                                                        setFormData({ ...formData, uptimeExcellentThreshold: val });
                                                                    }
                                                                }}
                                                                helperText="Green: uptime ≥ this value (default: 99.9%)"
                                                            />
                                                            <FormField
                                                                type="input"
                                                                label="Good Threshold (%)"
                                                                value={formData.uptimeGoodThreshold}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    if (!isNaN(val) && val >= 0 && val <= 100) {
                                                                        setFormData({ ...formData, uptimeGoodThreshold: val });
                                                                    }
                                                                }}
                                                                helperText="Yellow: uptime ≥ this value (default: 99.0%)"
                                                            />
                                                        </div>
                                                        {formData.uptimeGoodThreshold > formData.uptimeExcellentThreshold && (
                                                            <div style={{
                                                                marginTop: 'var(--spacing-3)',
                                                                padding: 'var(--spacing-2) var(--spacing-3)',
                                                                background: '#fef2f2',
                                                                border: '1px solid #fecaca',
                                                                borderRadius: 'var(--radius-sm)',
                                                                fontSize: 'var(--font-size-xs)',
                                                                color: '#dc2626',
                                                            }}>
                                                                ⚠️ Good threshold must be less than or equal to Excellent threshold
                                                            </div>
                                                        )}
                                                    </div>
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
                                                placeholder="(c) 2024 Your Company. All rights reserved."
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

                            {/* Announcements */}
                            {activeSection === 'announcements' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                                    <Card>
                                        <div style={{ padding: 'var(--spacing-6)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
                                                <div>
                                                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--spacing-2)' }}>
                                                        Announcements
                                                    </h2>
                                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                                                        Publish maintenance, incident, and update notices on the status page.
                                                    </p>
                                                </div>
                                                <a
                                                    href="/status"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        fontSize: 'var(--font-size-sm)',
                                                        color: 'var(--primary)',
                                                        textDecoration: 'none',
                                                        fontWeight: '600',
                                                    }}
                                                >
                                                    View status page
                                                </a>
                                            </div>
                                        </div>
                                    </Card>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                                        gap: 'var(--spacing-6)',
                                    }}>
                                        <Card>
                                            <div style={{ padding: 'var(--spacing-6)' }}>
                                                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', marginBottom: 'var(--spacing-4)' }}>
                                                    Create announcement
                                                </h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                                    <FormField
                                                        type="input"
                                                        label="Title"
                                                        value={announcementForm.title}
                                                        onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                                                        required
                                                    />
                                                    <FormField
                                                        type="textarea"
                                                        label="Message"
                                                        rows={4}
                                                        value={announcementForm.message}
                                                        onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                                                        required
                                                    />

                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                        gap: 'var(--spacing-4)',
                                                    }}>
                                                        <div>
                                                            <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', fontWeight: '500' }}>
                                                                Type
                                                            </label>
                                                            <select
                                                                value={announcementForm.type}
                                                                onChange={(e) => setAnnouncementForm({ ...announcementForm, type: e.target.value })}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: 'var(--spacing-3)',
                                                                    border: '1px solid #e5e7eb',
                                                                    borderRadius: 'var(--radius-md)',
                                                                    fontSize: 'var(--font-size-sm)',
                                                                    background: 'white',
                                                                }}
                                                            >
                                                                {ANNOUNCEMENT_TYPES.map((type) => (
                                                                    <option key={type.value} value={type.value}>
                                                                        {type.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', fontWeight: '500' }}>
                                                                Start Date
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={announcementForm.startDate}
                                                                onChange={(e) => setAnnouncementForm({ ...announcementForm, startDate: e.target.value })}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: 'var(--spacing-3)',
                                                                    border: '1px solid #e5e7eb',
                                                                    borderRadius: 'var(--radius-md)',
                                                                    fontSize: 'var(--font-size-sm)',
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', fontWeight: '500' }}>
                                                                End Date (optional)
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={announcementForm.endDate}
                                                                onChange={(e) => setAnnouncementForm({ ...announcementForm, endDate: e.target.value })}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: 'var(--spacing-3)',
                                                                    border: '1px solid #e5e7eb',
                                                                    borderRadius: 'var(--radius-md)',
                                                                    fontSize: 'var(--font-size-sm)',
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginTop: 'var(--spacing-2)' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', fontWeight: '500' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={announcementForm.isActive}
                                                                onChange={(e) => setAnnouncementForm({ ...announcementForm, isActive: e.target.checked })}
                                                            />
                                                            Active
                                                        </label>

                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)', fontWeight: '500' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={announcementForm.notifySubscribers}
                                                                onChange={(e) => setAnnouncementForm({ ...announcementForm, notifySubscribers: e.target.checked })}
                                                            />
                                                            Email Subscribers
                                                        </label>
                                                    </div>

                                                    {announcementError && (
                                                        <div style={{ color: 'var(--color-error-dark)', fontSize: 'var(--font-size-sm)' }}>
                                                            {announcementError}
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                        <Button
                                                            type="button"
                                                            variant="primary"
                                                            isLoading={isAnnouncementPending}
                                                            onClick={handleAnnouncementCreate}
                                                        >
                                                            Add Announcement
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>

                                        <Card>
                                            <div style={{ padding: 'var(--spacing-6)' }}>
                                                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', marginBottom: 'var(--spacing-4)' }}>
                                                    Recent announcements
                                                </h3>
                                                {announcements.length === 0 ? (
                                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                                                        No announcements yet.
                                                    </p>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                                                        {announcements.map((announcement) => {
                                                            const typeConfig = ANNOUNCEMENT_TYPES.find((type) => type.value === announcement.type) || ANNOUNCEMENT_TYPES[4];
                                                            return (
                                                                <div
                                                                    key={announcement.id}
                                                                    style={{
                                                                        padding: 'var(--spacing-4)',
                                                                        border: '1px solid #e5e7eb',
                                                                        borderRadius: 'var(--radius-md)',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: 'var(--spacing-2)',
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                                                        <span style={{
                                                                            padding: '0.2rem 0.6rem',
                                                                            borderRadius: '999px',
                                                                            fontSize: 'var(--font-size-xs)',
                                                                            fontWeight: '600',
                                                                            background: typeConfig.background,
                                                                            color: typeConfig.color,
                                                                        }}>
                                                                            {typeConfig.label}
                                                                        </span>
                                                                        {!announcement.isActive && (
                                                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                                                                Inactive
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ fontWeight: '600' }}>
                                                                        {announcement.title}
                                                                    </div>
                                                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                                                                        {announcement.message}
                                                                    </div>
                                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
                                                                        <span>
                                                                            {formatDateTime(announcement.startDate, browserTimeZone, { format: 'date' })} {announcement.endDate ? `- ${formatDateTime(announcement.endDate, browserTimeZone, { format: 'date' })}` : ''}
                                                                        </span>
                                                                        <Button
                                                                            type="button"
                                                                            variant="secondary"
                                                                            onClick={() => handleAnnouncementDelete(announcement.id)}
                                                                            isLoading={isAnnouncementPending}
                                                                        >
                                                                            Delete
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {/* Custom CSS */}
                            {activeSection === 'customization' && (
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
                                                <strong>Tips:</strong>
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
                                                View Status Page
                                            </a>
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--spacing-2)' }}>
                                                Open in a new tab to preview your changes
                                            </p>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* Integrations */}
                            {activeSection === 'integrations' && (
                                <StatusPageWebhooksSettings statusPageId={statusPage.id} />
                            )}

                            {/* Advanced Settings */}
                            {activeSection === 'advanced' && (
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

                            {/* Error and Success Messages */}
                            {(error || successMessage) && (
                                <div style={{
                                    marginBottom: 'var(--spacing-4)',
                                    padding: 'var(--spacing-3)',
                                    borderRadius: 'var(--radius-md)',
                                    background: error ? '#fee2e2' : '#d1fae5',
                                    border: `1px solid ${error ? '#fecaca' : '#a7f3d0'}`,
                                    color: error ? '#991b1b' : '#065f46',
                                }}>
                                    {error ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                            <span>{error}</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                            <span style={{ fontSize: '1.2rem' }}>✓</span>
                                            <span>{successMessage}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Save Button */}
                            <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'flex-end', paddingTop: 'var(--spacing-4)', borderTop: '1px solid #e5e7eb', background: 'white', padding: 'var(--spacing-4)', marginTop: 'var(--spacing-4)', borderRadius: 'var(--radius-md)' }}>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => router.refresh()}
                                    disabled={isPending}
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
                    </div>

                    {/* Preview Panel */}
                    {showPreview && (
                        <div style={{
                            flex: '0 0 50%',
                            borderLeft: '1px solid #e5e7eb',
                            background: 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            minWidth: 0, // Allow flex item to shrink below content size
                        }}>
                            <StatusPageLivePreview previewData={previewData} maxWidth={previewMaxWidth} />
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
}

