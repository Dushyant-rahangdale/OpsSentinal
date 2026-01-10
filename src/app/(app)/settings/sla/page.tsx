'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { Badge } from '@/components/ui/shadcn/badge';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/shadcn/dialog';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/shadcn/select';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import {
    Shield, Plus, Settings, Activity, Clock, AlertCircle,
    Trash2, Edit2, ChevronRight, TrendingUp, BarChart3, Target
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
                return <Shield className="w-5 h-5 text-emerald-600" />;
            case 'LATENCY_P99':
                return <Clock className="w-5 h-5 text-blue-600" />;
            case 'MTTA':
            case 'MTTR':
                return <Activity className="w-5 h-5 text-amber-600" />;
            default:
                return <TrendingUp className="w-5 h-5 text-purple-600" />;
        }
    };

    const getMetricBg = (type: string) => {
        switch (type) {
            case 'UPTIME':
            case 'AVAILABILITY':
                return 'bg-emerald-50 border-emerald-100';
            case 'LATENCY_P99':
                return 'bg-blue-50 border-blue-100';
            case 'MTTA':
            case 'MTTR':
                return 'bg-amber-50 border-amber-100';
            default:
                return 'bg-purple-50 border-purple-100';
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                            <div className="flex justify-between">
                                <Skeleton className="h-12 w-12 rounded-lg" />
                                <Skeleton className="h-6 w-16 rounded-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-xl">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-600" />
                <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100">
                                <Shield className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                                SLA Definitions
                            </h1>
                        </div>
                        <p className="text-slate-500 pl-[52px]">
                            Define and monitor service level targets and breach thresholds.
                        </p>
                    </div>

                    <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                        <DialogTrigger asChild>
                            <Button className="pl-[52px] md:pl-4 bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all">
                                <Plus className="w-4 h-4 mr-2" />
                                Create SLA
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <form onSubmit={handleCreate}>
                                <DialogHeader>
                                    <DialogTitle>Create New SLA</DialogTitle>
                                    <DialogDescription>
                                        Set up a new Service Level Agreement target.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-6 py-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="service">Service</Label>
                                        <Select
                                            value={formData.serviceId}
                                            onValueChange={(val) => setFormData({ ...formData, serviceId: val })}
                                            required
                                        >
                                            <SelectTrigger id="service">
                                                <SelectValue placeholder="Select a service" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {services.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="name">SLA Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. Core API Availability"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="target">Target (%)</Label>
                                            <div className="relative">
                                                <Input
                                                    id="target"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    value={formData.target}
                                                    onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) })}
                                                    className="pr-8 font-mono"
                                                    required
                                                />
                                                <span className="absolute right-3 top-2.5 text-slate-400 text-sm font-medium">%</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="window">Time Window</Label>
                                            <Select
                                                value={formData.window}
                                                onValueChange={(val) => setFormData({ ...formData, window: val })}
                                            >
                                                <SelectTrigger id="window">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="7d">7 Days</SelectItem>
                                                    <SelectItem value="30d">30 Days</SelectItem>
                                                    <SelectItem value="90d">90 Days</SelectItem>
                                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                                    <SelectItem value="yearly">Yearly</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="metric">Metric Type</Label>
                                        <Select
                                            value={formData.metricType}
                                            onValueChange={(val) => setFormData({ ...formData, metricType: val })}
                                        >
                                            <SelectTrigger id="metric">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="UPTIME">Uptime</SelectItem>
                                                <SelectItem value="AVAILABILITY">Availability</SelectItem>
                                                <SelectItem value="LATENCY_P99">Latency (P99)</SelectItem>
                                                <SelectItem value="MTTA">MTTA (Mean Time To Ack)</SelectItem>
                                                <SelectItem value="MTTR">MTTR (Mean Time To Resolve)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={creating} className="bg-indigo-600 hover:bg-indigo-700">
                                        {creating ? 'Creating...' : 'Create SLA'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Content Grid */}
            {definitions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <div className="p-4 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/50 mb-4">
                        <Target className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">No Definitions Found</h3>
                    <p className="text-slate-500 max-w-sm mb-6">
                        Create your first SLA definition to start tracking service performance and reliability targets.
                    </p>
                    <Button onClick={() => setShowCreateModal(true)} variant="outline">
                        Create First SLA
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {definitions.map((def) => (
                        <Card key={def.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200 overflow-hidden relative">
                            <div className={`absolute top-0 w-full h-1 ${def.target > 99 ? 'bg-emerald-500' : 'bg-amber-500'} opacity-0 group-hover:opacity-100 transition-opacity`} />

                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className={`p-2.5 rounded-xl border ${getMetricBg(def.metricType)}`}>
                                    {getMetricIcon(def.metricType)}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-900 line-clamp-1">{def.name}</h3>
                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono text-slate-500">v{def.version}</Badge>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">{def.service.name}</p>
                                </div>
                            </CardHeader>

                            <CardContent className="py-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target</span>
                                        <span className="text-xl font-bold text-slate-900 font-mono tracking-tight">
                                            {def.target}%
                                        </span>
                                    </div>
                                    <div className="h-8 w-px bg-slate-200 mx-2" />
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Window</span>
                                        <span className="text-sm font-medium text-slate-700">
                                            {windowLabels[def.window] || def.window}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                                    <Activity className="w-3.5 h-3.5" />
                                    <span>Metric: </span>
                                    <span className="font-medium text-slate-700">{metricTypeLabels[def.metricType] || def.metricType}</span>
                                </div>
                            </CardContent>

                            <CardFooter className="pt-2 flex items-center justify-between border-t border-slate-100/50 bg-slate-50/30">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDelete(def.id)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/settings/sla/${def.id}`}>
                                        Edit
                                        <ChevronRight className="w-4 h-4 ml-1.5 opacity-50" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
