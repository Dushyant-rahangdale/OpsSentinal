import type { PublicStatusService } from '@/lib/status-pages/public-contract';
import { statusPresentation } from '@/lib/status-pages/status-presentation';
import StatusBadgeV3 from './StatusBadgeV3';
import ServiceHistoryV3 from './ServiceHistoryV3';

function ServiceRow({ service, timeZone }: { service: PublicStatusService; timeZone: string }) {
  const token = statusPresentation(service.status).token;
  return (
    <li className="status-v3-service" data-status={token}>
      <div className="status-v3-service__head">
        <span className="status-v3-service__lead">
          <span className={`status-v3-dot status-${token}`} aria-hidden="true" />
          <span className="status-v3-service__name">{service.name}</span>
        </span>
        <StatusBadgeV3 status={service.status} size="sm" />
      </div>
      {service.description && <p className="status-v3-service__desc">{service.description}</p>}
      {(service.sla?.tier || (service.regions?.length ?? 0) > 0) && (
        <div className="status-v3-service__meta">
          {service.sla?.tier && <span className="status-v3-chip">{service.sla.tier}</span>}
          {service.regions?.map(region => (
            <span key={region} className="status-v3-chip status-v3-chip--muted">
              {region}
            </span>
          ))}
        </div>
      )}
      {service.uptime && <ServiceHistoryV3 service={service} timeZone={timeZone} />}
    </li>
  );
}

/** One bucket per distinct region; services with none fall under "Global". Grouping is layout only. */
function groupByRegionName(
  services: PublicStatusService[]
): Array<[string, PublicStatusService[]]> {
  const groups = new Map<string, PublicStatusService[]>();
  for (const service of services) {
    const regions = service.regions?.length ? service.regions : ['Global'];
    for (const region of regions) {
      const list = groups.get(region) ?? [];
      list.push(service);
      groups.set(region, list);
    }
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Service list rendered from V3: status, SLA grade and uptime are all backend-supplied. */
export default function ServiceHealthV3({
  services,
  timeZone,
  groupByRegion = false,
  thresholds: _thresholds,
}: {
  services: PublicStatusService[];
  timeZone: string;
  groupByRegion?: boolean;
  thresholds?: { uptimeExcellent: number; uptimeGood: number };
}) {
  if (services.length === 0) return null;
  return (
    <section
      className="status-v3-services status-panel"
      aria-labelledby="status-v3-services-heading"
    >
      <h2 id="status-v3-services-heading">Services</h2>
      {groupByRegion ? (
        groupByRegionName(services).map(([region, members]) => (
          <div key={region} className="status-v3-group">
            <h3 className="status-v3-group__title">{region}</h3>
            <ul className="status-v3-services__list">
              {members.map(service => (
                <ServiceRow key={`${region}:${service.id}`} service={service} timeZone={timeZone} />
              ))}
            </ul>
          </div>
        ))
      ) : (
        <ul className="status-v3-services__list">
          {services.map(service => (
            <ServiceRow key={service.id} service={service} timeZone={timeZone} />
          ))}
        </ul>
      )}
    </section>
  );
}
