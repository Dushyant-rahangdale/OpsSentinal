interface _FilterOption {
  value: string;
  label: string;
}

interface AnalyticsFiltersProps {
  teams: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string | null; email: string | null }>;
  currentFilters: {
    team?: string;
    service?: string;
    assignee?: string;
    status?: string;
    urgency?: string;
    window?: string;
  };
}

export default function AnalyticsFilters({
  teams,
  services,
  users,
  currentFilters,
}: AnalyticsFiltersProps) {
  const statusOptions = ['ALL', 'OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED', 'RESOLVED'];
  const urgencyOptions = ['ALL', 'HIGH', 'LOW'];
  const windowOptions = [1, 3, 7, 14, 30, 60, 90];

  const getUserName = (user: { name: string | null; email: string | null }) => {
    return user.name || user.email || 'Unknown user';
  };

  return (
    <section className="glass-panel analytics-filters-enhanced">
      <div className="analytics-filters-header">
        <h3 className="analytics-filters-title">Filters</h3>
        <p className="analytics-filters-description">Refine your analytics view</p>
      </div>
      <form method="get" className="analytics-filter-form">
        <label className="analytics-filter-field">
          <span>Team</span>
          <select name="team" defaultValue={currentFilters.team ?? 'ALL'}>
            <option value="ALL">All teams</option>
            {teams
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
          </select>
        </label>
        <label className="analytics-filter-field">
          <span>Service</span>
          <select name="service" defaultValue={currentFilters.service ?? 'ALL'}>
            <option value="ALL">All services</option>
            {services
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(service => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
          </select>
        </label>
        <label className="analytics-filter-field">
          <span>Assignee</span>
          <select name="assignee" defaultValue={currentFilters.assignee ?? 'ALL'}>
            <option value="ALL">All assignees</option>
            {users
              .slice()
              .sort((a, b) => getUserName(a).localeCompare(getUserName(b)))
              .map(user => (
                <option key={user.id} value={user.id}>
                  {getUserName(user)}
                </option>
              ))}
          </select>
        </label>
        <label className="analytics-filter-field">
          <span>Status</span>
          <select name="status" defaultValue={currentFilters.status ?? 'ALL'}>
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'All statuses' : status}
              </option>
            ))}
          </select>
        </label>
        <label className="analytics-filter-field">
          <span>Urgency</span>
          <select name="urgency" defaultValue={currentFilters.urgency ?? 'ALL'}>
            {urgencyOptions.map(urgency => (
              <option key={urgency} value={urgency}>
                {urgency === 'ALL' ? 'All urgencies' : urgency}
              </option>
            ))}
          </select>
        </label>
        <label className="analytics-filter-field">
          <span>Time Window</span>
          <select name="window" defaultValue={currentFilters.window ?? '7'}>
            {windowOptions.map(days => (
              <option key={days} value={`${days}`}>
                Last {days} {days === 1 ? 'day' : 'days'}
              </option>
            ))}
          </select>
        </label>
        <div className="analytics-filter-actions">
          <button type="submit" className="analytics-primary-button">
            Apply Filters
          </button>
          <a href="/analytics-new" className="analytics-ghost-button">
            Reset
          </a>
        </div>
      </form>
    </section>
  );
}
