'use client';

import { useState, useEffect, useRef } from 'react';
import StatusPageHeader from '@/components/status-page/StatusPageHeader';
import StatusPageServices from '@/components/status-page/StatusPageServices';
import StatusPageIncidents from '@/components/status-page/StatusPageIncidents';
import StatusPageAnnouncements from '@/components/status-page/StatusPageAnnouncements';

interface StatusPageLivePreviewProps {
    previewData: {
        statusPage: {
            name: string;
            contactEmail?: string | null;
            contactUrl?: string | null;
        };
        branding: any;
        services: any[];
        statusPageServices: any[];
        announcements: any[];
        uptime90: Record<string, number>;
        incidents: any[];
        showServices: boolean;
        showIncidents: boolean;
        showSubscribe?: boolean;
        showServicesByRegion?: boolean;
        showServiceOwners?: boolean;
        showServiceSlaTier?: boolean;
        showChangelog?: boolean;
        showRegionHeatmap?: boolean;
        showPostIncidentReview?: boolean;
        showHeader: boolean;
        showFooter: boolean;
        footerText?: string | null;
        showRssLink: boolean;
        showApiLink: boolean;
        layout: string;
        privacySettings?: any;
    };
    maxWidth?: string;
}

type DeviceView = 'desktop' | 'tablet' | 'mobile';

export default function StatusPageLivePreview({ previewData, maxWidth = '1280px' }: StatusPageLivePreviewProps) {
    const [deviceView, setDeviceView] = useState<DeviceView>('desktop');
    const [overallStatus, setOverallStatus] = useState<'operational' | 'degraded' | 'outage'>('operational');
    const [scale, setScale] = useState(1);
    const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
    const containerRef = useRef<HTMLDivElement>(null);
    const [frameHeight, setFrameHeight] = useState('100%');

    useEffect(() => {
        // Calculate overall status based on services
        const hasOutage = previewData.services.some((s: any) => s.status === 'MAJOR_OUTAGE');
        const hasDegraded = previewData.services.some((s: any) => s.status === 'PARTIAL_OUTAGE');
        setOverallStatus(hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational');
    }, [previewData.services]);

    // Use the maxWidth prop if provided, otherwise calculate from layout
    // Parse maxWidth to get numeric value for calculations
    const contentMaxWidthStr = maxWidth || (previewData.layout === 'wide'
        ? '1600px'
        : previewData.layout === 'compact'
            ? '900px'
            : '1280px');

    // Extract numeric value from string like "1600px" or "900px"
    const contentMaxWidthNum = parseInt(contentMaxWidthStr.replace(/px$/, '')) || 1280;

    // Device frame dimensions
    const deviceDimensions: Record<DeviceView, { width: number; height: number | null }> = {
        desktop: { width: Math.max(1280, contentMaxWidthNum), height: null },
        tablet: { width: 768, height: 1024 },
        mobile: { width: 375, height: 812 },
    };

    const targetWidth = deviceDimensions[deviceView].width;
    const targetHeight = deviceDimensions[deviceView].height;

    // Calculate scale based on container size
    useEffect(() => {
        if (!containerRef.current) return;

        const updateScale = () => {
            if (zoomMode === 'fit' && containerRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = containerRef.current.clientHeight;

                // Add some padding
                const availableWidth = containerWidth - 48;
                const availableHeight = containerHeight - 48;

                // Calculate width scale
                let newScale = availableWidth / targetWidth;

                // For mobile/tablet, also constrain by height to maintain aspect ratio within view
                if (targetHeight) {
                    const heightScale = availableHeight / targetHeight;
                    newScale = Math.min(newScale, heightScale);
                }

                // Don't scale up beyond 1.0 for "fit" mode
                if (newScale > 1) newScale = 1;

                setScale(newScale);

                // Set frame height
                if (targetHeight) {
                    setFrameHeight(`${targetHeight}px`);
                } else {
                    const safeHeight = Math.max(containerHeight, 1);
                    setFrameHeight(`${Math.ceil(safeHeight / newScale)}px`);
                }
            } else if (zoomMode === 'manual' && containerRef.current) {
                if (targetHeight) {
                    setFrameHeight(`${targetHeight}px`);
                } else {
                    const containerHeight = containerRef.current.clientHeight;
                    const safeHeight = Math.max(containerHeight, 1);
                    setFrameHeight(`${Math.ceil(safeHeight / scale)}px`);
                }
            }
        };

        // Update initial
        updateScale();

        const observer = new ResizeObserver(updateScale);
        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [zoomMode, targetWidth, deviceView]);

    const handleZoom = (delta: number) => {
        setZoomMode('manual');
        setScale(prev => Math.min(Math.max(prev + delta, 0.25), 1.5)); // Limit zoom 0.25x to 1.5x
    };

    const deviceLabels: Record<DeviceView, string> = {
        desktop: `Desktop (${deviceDimensions.desktop.width}px)`,
        tablet: 'Tablet (768x1024)',
        mobile: 'Mobile (375x812)',
    };

    // For the inner content max-width (inside the scaled container)
    // Always use 100% for tablet and mobile, use contentMaxWidthStr for desktop
    const contentMaxWidth = deviceView === 'desktop' ? contentMaxWidthStr : '100%';
    const previewPrimaryColor = previewData.branding?.primaryColor || 'var(--status-primary, #667eea)';
    const previewTextColor = previewData.branding?.textColor || 'var(--status-text, #111827)';
    const frameHeightNumber = Number.parseFloat(frameHeight);
    const scaledFrameHeightStyle = Number.isFinite(frameHeightNumber)
        ? `${Math.round(frameHeightNumber * scale)}px`
        : 'auto';

    const renderStatusPageContent = (contentMaxWidthValue: string) => (
        <>
            {previewData.showHeader && (
                <StatusPageHeader
                    statusPage={previewData.statusPage}
                    overallStatus={overallStatus}
                    branding={previewData.branding}
                    lastUpdated={new Date().toISOString()}
                />
            )}
            <main
                style={{
                    width: '100%',
                    maxWidth: contentMaxWidthValue,
                    margin: '0 auto',
                    padding: previewData.layout === 'compact' ? '1.5rem' : '2rem',
                    boxSizing: 'border-box',
                    flex: 1,
                }}
            >
                {previewData.announcements.length > 0 && (
                    <StatusPageAnnouncements
                        announcements={previewData.announcements}
                        showServiceRegions={previewData.privacySettings?.showServiceRegions !== false}
                    />
                )}

                {previewData.showServices && previewData.services.length > 0 && (
                    <StatusPageServices
                        services={previewData.services}
                        statusPageServices={previewData.statusPageServices}
                        uptime90={previewData.uptime90}
                        incidents={previewData.incidents}
                        privacySettings={previewData.privacySettings}
                        groupByRegionDefault={previewData.showServicesByRegion}
                        showServiceOwners={previewData.showServiceOwners}
                        showServiceSlaTier={previewData.showServiceSlaTier}
                    />
                )}

                {previewData.showIncidents && (
                    <StatusPageIncidents
                        incidents={previewData.incidents}
                        privacySettings={previewData.privacySettings}
                    />
                )}

                {previewData.showSubscribe !== false && (
                    <section style={{ marginBottom: 'clamp(2.5rem, 7vw, 5rem)' }}>
                        <div style={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: '1rem',
                            border: '1px solid var(--status-panel-border, #e5e7eb)',
                            background: 'var(--status-panel-bg, #ffffff)',
                            padding: 'clamp(1.5rem, 4vw, 2.5rem)',
                            boxShadow: 'var(--status-card-shadow, 0 20px 45px rgba(15, 23, 42, 0.08))',
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-60px',
                                right: '-60px',
                                width: '180px',
                                height: '180px',
                                background: 'radial-gradient(circle, color-mix(in srgb, var(--status-primary, #6366f1) 20%, transparent) 0%, transparent 70%)',
                                pointerEvents: 'none',
                            }} />
                            <div style={{
                                position: 'absolute',
                                bottom: '-80px',
                                left: '-80px',
                                width: '220px',
                                height: '220px',
                                background: 'radial-gradient(circle, color-mix(in srgb, var(--status-primary, #0ea5e9) 18%, transparent) 0%, transparent 70%)',
                                pointerEvents: 'none',
                            }} />
                            <div style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'clamp(1.5rem, 4vw, 2.5rem)',
                                flexWrap: 'wrap',
                            }}>
                                <div style={{
                                    flex: '1 1 260px',
                                    minWidth: '240px',
                                }}>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        color: previewPrimaryColor,
                                        fontWeight: '700',
                                        marginBottom: '0.5rem',
                                    }}>
                                        Stay in the loop
                                    </div>
                                    <h2 style={{
                                        fontSize: 'clamp(1.35rem, 3vw, 1.75rem)',
                                        fontWeight: '700',
                                        marginBottom: '0.75rem',
                                        color: previewTextColor,
                                    }}>
                                        Subscribe to Updates
                                    </h2>
                                    <p style={{
                                        fontSize: 'clamp(0.9rem, 2.2vw, 1rem)',
                                        color: 'var(--status-text-muted, #4b5563)',
                                        marginBottom: '1rem',
                                        lineHeight: 1.6,
                                    }}>
                                        Get incident alerts, maintenance notices, and recovery updates the moment they happen.
                                    </p>
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: '999px',
                                        background: 'var(--status-panel-bg, #ffffff)',
                                        border: '1px solid var(--status-panel-border, #e5e7eb)',
                                        color: 'var(--status-text, #374151)',
                                        fontSize: '0.8125rem',
                                        fontWeight: '600',
                                    }}>
                                        Email notifications only
                                    </div>
                                </div>
                                <div style={{
                                    flex: '1 1 320px',
                                    minWidth: '280px',
                                }}>
                                    <div style={{
                                        padding: 'clamp(1rem, 3vw, 1.5rem)',
                                        background: 'var(--status-panel-bg, #ffffff)',
                                        border: '1px solid var(--status-panel-border, #e5e7eb)',
                                        borderRadius: '0.875rem',
                                        boxShadow: 'var(--status-card-shadow, 0 12px 25px rgba(15, 23, 42, 0.12))',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 'var(--spacing-3)',
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.5rem',
                                        }}>
                                            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: previewTextColor }}>
                                                Subscribe to Updates
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="your@email.com"
                                                disabled
                                                style={{
                                                    width: '100%',
                                                    padding: '0.65rem 0.75rem',
                                                    borderRadius: '0.5rem',
                                                    border: '1px solid var(--status-panel-border, #e5e7eb)',
                                                    background: 'var(--status-panel-muted-bg, #f9fafb)',
                                                    color: 'var(--status-text-subtle, #9ca3af)',
                                                }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            disabled
                                            style={{
                                                width: '100%',
                                                padding: '0.65rem 0.75rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid var(--status-panel-border, #e5e7eb)',
                                                background: 'var(--status-panel-muted-bg, #e5e7eb)',
                                                color: 'var(--status-text-subtle, #9ca3af)',
                                                fontWeight: '600',
                                                cursor: 'not-allowed',
                                            }}
                                        >
                                            Subscribe
                                        </button>
                                    </div>
                                    <p style={{
                                        marginTop: '0.75rem',
                                        fontSize: '0.8125rem',
                                        color: 'var(--status-text-muted, #6b7280)',
                                        textAlign: 'center',
                                    }}>
                                        We'll never share your email. Unsubscribe anytime.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {previewData.showFooter && (
                    <footer
                        style={{
                            marginTop: '4rem',
                            paddingTop: '2rem',
                            borderTop: '1px solid #e5e7eb',
                            textAlign: 'center',
                            color: 'var(--status-text-muted, #6b7280)',
                            fontSize: '0.875rem',
                            paddingBottom: '2rem',
                        }}
                    >
                        {previewData.footerText && (
                            <p style={{ marginBottom: '1rem' }}>{previewData.footerText}</p>
                        )}
                        {(previewData.showRssLink || previewData.showApiLink) && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                {previewData.showRssLink && (
                                    <span style={{ color: 'var(--status-text-muted, #6b7280)' }}>RSS Feed</span>
                                )}
                                {previewData.showRssLink && previewData.showApiLink && <span>|</span>}
                                {previewData.showApiLink && (
                                    <span style={{ color: 'var(--status-text-muted, #6b7280)' }}>JSON API</span>
                                )}
                            </div>
                        )}
                    </footer>
                )}
            </main>
        </>
    );

    return (
        <>
            {/* Custom CSS */}
            {previewData.branding?.customCss && (
                <style dangerouslySetInnerHTML={{ __html: previewData.branding.customCss }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Device & Zoom Controls */}
                <div
                    style={{
                        padding: 'var(--spacing-3)',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#f9fafb',
                        flexWrap: 'wrap',
                        gap: 'var(--spacing-2)',
                    }}
                >
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        {(['desktop', 'tablet', 'mobile'] as DeviceView[]).map((device) => (
                            <button
                                key={device}
                                type="button"
                                onClick={() => {
                                    setDeviceView(device);
                                    setZoomMode('fit'); // Auto-fit on switch
                                }}
                                style={{
                                    padding: 'var(--spacing-2) var(--spacing-3)',
                                    background: deviceView === device ? 'white' : 'transparent',
                                    border: '1px solid',
                                    borderColor: deviceView === device ? '#e5e7eb' : 'transparent',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: deviceView === device ? '600' : '500',
                                    color: deviceView === device ? 'var(--text-primary)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize',
                                    transition: 'all 0.2s ease',
                                }}
                                title={deviceLabels[device]}
                            >
                                {device}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', background: 'white', border: '1px solid #e5e7eb', borderRadius: 'var(--radius-md)', padding: '2px' }}>
                            <button
                                type="button"
                                onClick={() => handleZoom(-0.1)}
                                style={{
                                    padding: '4px 8px',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    fontSize: '14px',
                                }}
                                title="Zoom Out"
                            >
                                âˆ’
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoomMode(zoomMode === 'fit' ? 'manual' : 'fit')}
                                style={{
                                    padding: '4px 8px',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    minWidth: '60px',
                                }}
                                title={zoomMode === 'fit' ? "Disable Fit to Screen" : "Enable Fit to Screen"}
                            >
                                {zoomMode === 'fit' ? 'Fit' : `${Math.round(scale * 100)}%`}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleZoom(0.1)}
                                style={{
                                    padding: '4px 8px',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    fontSize: '14px',
                                }}
                                title="Zoom In"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview Container Wrapper */}
                <div
                    ref={containerRef}
                    style={{
                        flex: 1,
                        overflow: 'hidden',
                        background: '#e2e8f0',
                        display: 'flex',
                        position: 'relative',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        padding: 'var(--spacing-6)',
                    }}
                >
                    <div
                        style={{
                            width: `${Math.round(targetWidth * scale)}px`,
                            minWidth: `${Math.round(targetWidth * scale)}px`,
                            maxWidth: `${Math.round(targetWidth * scale)}px`,
                            height: scaledFrameHeightStyle,
                            overflow: 'hidden',
                            borderRadius: deviceView === 'mobile' ? '28px' : deviceView === 'tablet' ? '16px' : '10px',
                            border: deviceView !== 'desktop' ? '8px solid #1f2937' : '1px solid #cbd5e1',
                            background: previewData.branding?.backgroundColor || '#ffffff',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            boxSizing: 'border-box',
                        }}
                    >
                        <div
                            className="status-page-container"
                            style={{
                                width: `${targetWidth}px`,
                                minWidth: `${targetWidth}px`,
                                maxWidth: `${targetWidth}px`,
                                height: frameHeight,
                                transform: `scale(${scale})`,
                                transformOrigin: 'top left',
                                overflow: 'auto',
                                boxSizing: 'border-box',
                            }}
                        >
                            <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
                                {renderStatusPageContent(contentMaxWidth)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

