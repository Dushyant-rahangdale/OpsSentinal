'use client';

import { useEffect, useRef, useState } from 'react';
import type { PublicStatusHistoryDay, PublicStatusService } from '@/lib/status-pages/public-contract';
import { statusPresentation } from '@/lib/status-pages/status-presentation';

function historyLabel(service: PublicStatusService, day: PublicStatusHistoryDay) {
  const presentation = statusPresentation(day.status);
  const availability = day.availabilityPercent == null
    ? 'availability unavailable'
    : `${day.availabilityPercent.toFixed(2)}% availability`;
  return `${day.date}, ${service.name}, ${presentation.label}, ${availability}, ${day.incidentCount} incidents`;
}

export default function PublicStatusServices({
  services,
  groupByRegion = false,
}: {
  services: PublicStatusService[];
  groupByRegion?: boolean;
}) {
  const [open, setOpen] = useState<{ serviceId: string; date: string } | null>(null);
  const pointerSelection = useRef<{
    serviceId: string;
    date: string;
    wasSelected: boolean;
  } | null>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const renderServices = (items: PublicStatusService[]) => items.map(service => {
        const current = statusPresentation(service.status);
        return (
          <article key={service.id} className="public-service-card">
            <header className="public-service-card__header">
              <div>
                <h3>{service.name}</h3>
                {service.description && <p>{service.description}</p>}
                {service.regions?.length ? <p>{service.regions.join(' · ')}</p> : null}
                {service.slaTier && <p>Service tier: {service.slaTier}</p>}
                {service.team && <p>Owned by {service.team.name}</p>}
              </div>
              <span className={`status-badge status-${current.token}`}>
                <span aria-hidden="true">{current.icon}</span> {current.label}
              </span>
            </header>
            {service.uptime && (
              <dl className="public-service-metrics">
                {(['days30', 'days90'] as const).map(window => {
                  const value = window === 'days30' ? service.uptime?.days30 : service.uptime?.days90;
                  const label = window === 'days30' ? '30-day uptime' : '90-day uptime';
                  return <div key={window}><dt>{label}</dt><dd>{value?.percentage == null
                    ? `Unavailable (${Math.floor(value?.measuredDays ?? 0)} days retained)`
                    : `${value.percentage.toFixed(3)}% (${value.incidentCount} incidents)`}</dd></div>;
                })}
              </dl>
            )}
            {service.history?.length ? (
              <div className="public-history" aria-label={`${service.name} status history`}>
                {service.history.map(day => {
                  const presentation = statusPresentation(day.status);
                  const selected = open?.serviceId === service.id && open.date === day.date;
                  const tooltipId = `status-history-${service.id}-${day.date}`;
                  return (
                    <div key={day.date} className="public-history__item">
                      <button
                        type="button"
                        className={`public-history__cell status-${presentation.token}`}
                        aria-label={historyLabel(service, day)}
                        aria-expanded={selected}
                        aria-describedby={selected ? tooltipId : undefined}
                        onPointerDown={() => {
                          pointerSelection.current = {
                            serviceId: service.id,
                            date: day.date,
                            wasSelected: selected,
                          };
                        }}
                        onClick={() => {
                          const pointer = pointerSelection.current;
                          pointerSelection.current = null;
                          const wasSelected = pointer?.serviceId === service.id && pointer.date === day.date
                            ? pointer.wasSelected
                            : selected;
                          setOpen(wasSelected ? null : { serviceId: service.id, date: day.date });
                        }}
                        onFocus={() => {
                          const pointer = pointerSelection.current;
                          if (pointer?.serviceId !== service.id || pointer.date !== day.date) {
                            setOpen({ serviceId: service.id, date: day.date });
                          }
                        }}
                      ><span className="sr-only">{presentation.label}</span></button>
                      {selected && <div id={tooltipId} role="tooltip" className="public-history__tooltip">
                        <strong>{day.date}: {presentation.label}</strong>
                        <span>{day.availabilityPercent == null ? 'Availability unavailable' : `${day.availabilityPercent.toFixed(2)}% availability`}</span>
                        <span>{day.incidentCount} incidents</span>
                        {day.timeline && <div className="public-history__timeline" aria-label="Intraday status timeline">
                          {day.timeline.map(slice => <span
                            key={`${slice.startMinute}-${slice.endMinute}-${slice.status}`}
                            className={`status-${statusPresentation(slice.status).token}`}
                            style={{ flexGrow: slice.endMinute - slice.startMinute }}
                            title={`${slice.startMinute}-${slice.endMinute}: ${statusPresentation(slice.status).label}`}
                          />)}
                        </div>}
                      </div>}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </article>
        );
      });
  if (services.length === 0) return null;
  const regions = [...new Set(services.flatMap(service => service.regions ?? []))].sort();
  return (
    <section aria-labelledby="service-health-heading" className="public-service-health">
      <h2 id="service-health-heading">Services</h2>
      {groupByRegion && regions.length > 0
        ? regions.map(region => (
          <section key={region} aria-label={`${region} services`} className="public-service-region">
            <h3>{region}</h3>
            {renderServices(services.filter(service => service.regions?.includes(region)))}
          </section>
        ))
        : renderServices(services)}
    </section>
  );
}
