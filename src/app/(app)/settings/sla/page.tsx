'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import {
    Shield, Plus, Settings, Activity, Clock, AlertCircle,
    Trash2, Edit2, ChevronRight, TrendingUp
} from 'lucide-react';

interface SLADefinition {
    id: string;
    serviceId: string;
    name: string;
    version: number;
    target: number;
    window: string;
    metricType: string;
    activeFrom: string;
    activeTo: string | null;
    service: { id: string; name: string };
}

interface Service {
    id: string;
    name: string;
}

const metricTypeLabels: Record<string, string> = {
    'UPTIME': 'Uptime',
    'AVAILABILITY': 'Availability',
    'LATENCY_P99': 'Latency (P99)',
    'MTTA': 'MTTA',
    'MTTR': 'MTTR'
};

const windowLabels: Record<string, string> = {
    '7d': '7 Days',
    '30d': '30 Days',
    '90d': '90 Days',
    'quarterly': 'Quarterly',
    'yearly': 'Yearly'
};

export default function SLASettingsPage() {
    const router = useRouter();
    const [definitions, setDefinitions] = useState<SLADefinition[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        serviceId: '',
        name: 'Standard SLA',
        target: 99.9,
        window: '30d',
        metricType: 'UPTIME'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [defsRes, servicesRes] = await Promise.all([
                fetch('/api/sla-definitions'),
                fetch('/api/services')
            ]);
            const defs = await defsRes.json();
            const srvs = await servicesRes.json();
            setDefinitions(Array.isArray(defs) ? defs : []);
            setServices(Array.isArray(srvs) ? srvs : []);
        } catch (error) {
            logger.error('Failed to fetch SLA data', { error });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch('/api/sla-definitions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    target: parseFloat(formData.target.toString())
                })
            });
            if (res.ok) {
                setShowCreateModal(false);
                fetchData();
                setFormData({ serviceId: '', name: 'Standard SLA', target: 99.9, window: '30d', metricType: 'UPTIME' });
            }
        } catch (error) {
            logger.error('Failed to create SLA definition', { error });
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to deactivate this SLA definition?')) return;
        try {
            await fetch(`/api/sla-definitions/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            logger.error('Failed to delete SLA definition', { error });
        }
    };

    const getMetricIcon = (type: string) => {
        switch (type) {
            case 'UPTIME':
            case 'AVAILABILITY':
                return <Shield className="w-4 h-4" />;
            case 'LATENCY_P99':
                return <Clock className="w-4 h-4" />;
            case 'MTTA':
            case 'MTTR':
                return <Activity className="w-4 h-4" />;
            default:
                return <TrendingUp className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="settings-page-container">
                <div className="settings-loading">Loading SLA definitions...</div>
            </div>
        );
    }

    return (
        <div className="settings-page-container">
            <div className="settings-header">
                <div className="settings-header-content">
                    <div className="settings-header-icon">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="settings-title">SLA Definitions</h1>
                        <p className="settings-description">
                            Manage Service Level Agreement targets for your services
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus className="w-4 h-4" />
                    New SLA
                </button>
            </div>

            {definitions.length === 0 ? (
                <div className="settings-empty-state">
                    <Shield className="w-12 h-12" style={{ opacity: 0.5 }} />
                    <h3>No SLA Definitions</h3>
                    <p>Create your first SLA definition to start tracking service level agreements.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary"
                    >
                        Create SLA Definition
                    </button>
                </div>
            ) : (
                <div className="settings-card-grid">
                    {definitions.map((def) => (
                        <div key={def.id} className="settings-card">
                            <div className="settings-card-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div className="settings-card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                                        {getMetricIcon(def.metricType)}
                                    </div>
                                    <div>
                                        <h3 className="settings-card-title">{def.name}</h3>
                                        <p className="settings-card-subtitle">{def.service.name}</p>
                                    </div>
                                </div>
                                <span className="settings-badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                                    v{def.version}
                                </span>
                            </div>
                            <div className="settings-card-body">
                                <div className="settings-metric-row">
                                    <span className="settings-metric-label">Target</span>
                                    <span className="settings-metric-value" style={{ color: '#22c55e', fontWeight: 700 }}>
                                        {def.target}%
                                    </span>
                                </div>
                                <div className="settings-metric-row">
                                    <span className="settings-metric-label">Type</span>
                                    <span className="settings-metric-value">{metricTypeLabels[def.metricType] || def.metricType}</span>
                                </div>
                                <div className="settings-metric-row">
                                    <span className="settings-metric-label">Window</span>
                                    <span className="settings-metric-value">{windowLabels[def.window] || def.window}</span>
                                </div>
                            </div>
                            <div className="settings-card-footer">
                                <button
                                    onClick={() => handleDelete(def.id)}
                                    className="btn-ghost btn-sm"
                                    style={{ color: '#ef4444' }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <Link href={`/settings/sla/${def.id}`} className="btn-ghost btn-sm">
                                    <Edit2 className="w-4 h-4" />
                                    Edit
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Create SLA Definition</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Service</label>
                                <select
                                    value={formData.serviceId}
                                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                                    className="form-select"
                                    required
                                >
                                    <option value="">Select a service</option>
                                    {services.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Target (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={formData.target}
                                        onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) })}
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Window</label>
                                    <select
                                        value={formData.window}
                                        onChange={(e) => setFormData({ ...formData, window: e.target.value })}
                                        className="form-select"
                                    >
                                        <option value="7d">7 Days</option>
                                        <option value="30d">30 Days</option>
                                        <option value="90d">90 Days</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Metric Type</label>
                                <select
                                    value={formData.metricType}
                                    onChange={(e) => setFormData({ ...formData, metricType: e.target.value })}
                                    className="form-select"
                                >
                                    <option value="UPTIME">Uptime</option>
                                    <option value="AVAILABILITY">Availability</option>
                                    <option value="LATENCY_P99">Latency (P99)</option>
                                    <option value="MTTA">MTTA</option>
                                    <option value="MTTR">MTTR</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-ghost">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={creating}>
                                    {creating ? 'Creating...' : 'Create SLA'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
