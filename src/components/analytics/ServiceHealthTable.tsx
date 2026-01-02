import React from 'react';
import { SLAMetrics } from '@/lib/sla';
import { formatTimeMinutesMs } from '@/lib/time-format';

export default function ServiceHealthTable({ services }: { services: SLAMetrics['serviceMetrics'] }) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Healthy': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'Degraded': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'Critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-500';
        }
    };

    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                        <th className="px-4 py-3 font-medium">Service</th>
                        <th className="px-4 py-3 font-medium text-right">Incidents</th>
                        <th className="px-4 py-3 font-medium text-right">MTTA (Avg)</th>
                        <th className="px-4 py-3 font-medium text-right">MTTR (Avg)</th>
                        <th className="px-4 py-3 font-medium text-center">Health</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {services.map((service) => (
                        <tr key={service.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">{service.name}</td>
                            <td className="px-4 py-3 text-right">{service.count}</td>
                            <td className="px-4 py-3 text-right">{formatTimeMinutesMs(service.mtta * 60000)}</td>
                            <td className="px-4 py-3 text-right">{formatTimeMinutesMs(service.mttr * 60000)}</td>
                            <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(service.status)}`}>
                                    {service.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {services.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                No services found
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
