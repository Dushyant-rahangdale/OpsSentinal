/**
 * The one stylesheet for the public status page.
 *
 * Authored entirely as descendant selectors under a single root class, because the same string has
 * to work in two places: the document, where the live page renders, and the admin preview's shadow
 * root, where selector-matched rules from the page's stylesheets never reach. Custom properties do
 * inherit across a shadow boundary, but `.some-class { ... }` defined outside does not, which is
 * why preview and live must share this text rather than each having their own.
 *
 * Consequences worth knowing before editing:
 *   - no Tailwind utilities in the public components; they would silently vanish in preview
 *   - no `:host`; it matches only inside a shadow root and would break the live page
 *   - every colour comes from a token defined on the root class, so branding can override it
 */
export const STATUS_PAGE_SURFACE_CLASS = 'status-page-surface';

const R = `.${STATUS_PAGE_SURFACE_CLASS}`;

export const STATUS_PAGE_PUBLIC_CSS = `
${R} {
  --status-operational: #047857;
  --status-operational-bg: #ecfdf5;
  --status-degraded: #b45309;
  --status-degraded-bg: #fffbeb;
  --status-maintenance: #1d4ed8;
  --status-maintenance-bg: #eff6ff;
  --status-partial-outage: #c2410c;
  --status-partial-outage-bg: #fff7ed;
  --status-major-outage: #be123c;
  --status-major-outage-bg: #fff1f2;
  --status-unknown: #475569;
  --status-unknown-bg: #f1f5f9;
  --primary: var(--status-primary, var(--primary-color, #2563eb));
  --primary-hover: var(--status-primary-hover, var(--primary-hover, #1d4ed8));
  --status-text: var(--sp-ink, #111827);
  --status-text-strong: var(--sp-ink-strong, var(--sp-ink, #0f172a));
  --status-text-muted: var(--sp-muted, #6b7280);
  --status-text-subtle: var(--sp-muted-2, var(--sp-muted, #94a3b8));
  --status-text-inverse: var(--sp-inverse, #ffffff);
  --status-panel-bg: var(--sp-panel-bg, color-mix(in srgb, #ffffff 94%, var(--status-primary, #2563eb) 6%));
  --status-panel-border: var(--sp-panel-border, color-mix(in srgb, #e5e7eb 82%, var(--status-primary, #2563eb) 18%));
  --status-panel-muted-bg: var(--sp-panel-muted-bg, color-mix(in srgb, #f8fafc 85%, var(--status-primary, #2563eb) 15%));
  --status-panel-muted-border: var(--sp-panel-muted-border, color-mix(in srgb, #e2e8f0 80%, var(--status-primary, #2563eb) 20%));
  color: var(--status-text);
  font-family: var(--status-font-family, inherit);
  display: block;
}

${R} *, ${R} *::before, ${R} *::after { box-sizing: border-box; }
${R} h1, ${R} h2, ${R} h3, ${R} h4, ${R} p, ${R} dl, ${R} dd, ${R} dt { margin: 0; }
${R} button, ${R} input, ${R} select { color: inherit; font: inherit; }

${R} .sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* ---- status tokens ---- */
${R} .status-badge {
  display: inline-flex; align-items: center; gap: .35rem; border: 1px solid currentColor;
  border-radius: 999px; padding: .25rem .6rem; font-weight: 700; font-size: .8125rem;
  white-space: nowrap;
}
${R} .status-operational { color: var(--status-operational); background: var(--status-operational-bg); }
${R} .status-degraded { color: var(--status-degraded); background: var(--status-degraded-bg); }
${R} .status-maintenance { color: var(--status-maintenance); background: var(--status-maintenance-bg); }
${R} .status-partial-outage { color: var(--status-partial-outage); background: var(--status-partial-outage-bg); }
${R} .status-major-outage { color: var(--status-major-outage); background: var(--status-major-outage-bg); }
${R} .status-unknown { color: var(--status-unknown); background: var(--status-unknown-bg); }

/* ---- shared surfaces ---- */
${R} .status-panel {
  padding: 1.25rem; border: 1px solid var(--status-panel-border);
  border-radius: .875rem; background: var(--status-panel-bg);
}
${R} .status-section { margin: 2.5rem 0; display: grid; gap: 1rem; }
${R} .status-section__head {
  display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .5rem;
}
${R} .status-section__head h2 { font-size: 1.125rem; font-weight: 700; color: var(--status-text-strong); }
${R} .status-section__count { font-size: .8125rem; color: var(--status-text-muted); }
${R} .status-muted { color: var(--status-text-muted); font-size: .875rem; }
${R} .status-empty {
  display: grid; gap: .35rem; padding: 2rem 1.25rem; text-align: center;
  border: 1px dashed var(--status-panel-muted-border); border-radius: .875rem;
  background: var(--status-panel-muted-bg);
}
${R} .status-empty strong { color: var(--status-text-strong); }

/* ---- overview ---- */
${R} .status-overview { display: grid; gap: 1rem; margin: 1.5rem 0 2rem; }
${R} .status-overview__banner { display: grid; gap: .35rem; }
${R} .status-overview__banner h2 {
  font-size: clamp(1.375rem, 4vw, 1.75rem); font-weight: 750; letter-spacing: -.01em;
  color: var(--status-text-strong);
}
${R} .status-overview__note {
  display: inline-flex; align-items: center; gap: .4rem; padding: .35rem .6rem;
  border-radius: .5rem; background: var(--status-unknown-bg); color: var(--status-unknown);
  font-size: .8125rem; font-weight: 600;
}
${R} .status-overview__stats {
  display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
}
${R} .status-stat { display: grid; gap: .2rem; align-content: start; }
${R} .status-stat__label {
  font-size: .6875rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: var(--status-text-subtle);
}
${R} .status-stat__value {
  font-size: 1.5rem; font-weight: 700; line-height: 1.1; color: var(--status-text-strong);
  font-variant-numeric: tabular-nums;
}
${R} .status-stat__hint { font-size: .8125rem; color: var(--status-text-muted); }

/* ---- service toolbar ---- */
${R} .status-toolbar { display: grid; gap: .75rem; }
${R} .status-toolbar__row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
${R} .status-toolbar__search { flex: 1 1 16rem; min-width: 0; }
${R} .status-input {
  width: 100%; padding: .5rem .75rem; border: 1px solid var(--status-panel-border);
  border-radius: .5rem; background: var(--status-panel-bg); color: var(--status-text);
}
${R} .status-input:focus-visible {
  outline: none; border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
}
${R} .status-chip {
  display: inline-flex; align-items: center; gap: .35rem; padding: .35rem .7rem;
  border: 1px solid var(--status-panel-border); border-radius: 999px;
  background: var(--status-panel-bg); color: var(--status-text-muted);
  font-size: .8125rem; font-weight: 600; cursor: pointer;
}
${R} .status-chip:hover:not(:disabled) { border-color: var(--primary); color: var(--status-text-strong); }
${R} .status-chip:focus-visible {
  outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 30%, transparent);
}
${R} .status-chip[aria-pressed='true'] {
  border-color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--status-text-strong);
}
${R} .status-chip:disabled { opacity: .45; cursor: not-allowed; }
${R} .status-chip__count { font-variant-numeric: tabular-nums; opacity: .75; }

/* ---- services ---- */
${R} .status-services { display: grid; gap: .75rem; }
${R} .status-region-group { display: grid; gap: .75rem; margin: 0 0 1.25rem; }
${R} .status-region-group > h3 {
  font-size: .75rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: var(--status-text-subtle);
}
${R} .status-service {
  content-visibility: auto; contain-intrinsic-size: auto 148px;
  display: grid; gap: .625rem; padding: 1rem 1.25rem;
  border: 1px solid var(--status-panel-border); border-radius: .875rem;
  background: var(--status-panel-bg);
}
${R} .status-service:hover { border-color: color-mix(in srgb, var(--primary) 35%, var(--status-panel-border)); }
${R} .status-service__head {
  display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: .75rem;
}
${R} .status-service__name { font-size: 1rem; font-weight: 700; color: var(--status-text-strong); }
${R} .status-service__meta { display: flex; flex-wrap: wrap; gap: .375rem; margin-top: .35rem; }
${R} .status-tag {
  display: inline-flex; align-items: center; padding: .15rem .5rem; border-radius: .375rem;
  background: var(--status-panel-muted-bg); border: 1px solid var(--status-panel-muted-border);
  font-size: .75rem; font-weight: 600; color: var(--status-text-muted);
}
${R} .status-service__description { font-size: .875rem; color: var(--status-text-muted); line-height: 1.55; }
${R} .status-service__facts {
  display: flex; flex-wrap: wrap; gap: 1.25rem; font-size: .8125rem; color: var(--status-text-muted);
}
${R} .status-service__facts b { color: var(--status-text-strong); font-variant-numeric: tabular-nums; }

/* ---- daily history ----
   Column count comes from a container query, not a resize listener: the strip must size to its own
   width, which is the admin preview's device frame rather than the browser window. */
${R} .status-history { display: grid; gap: .35rem; container-type: inline-size; }
${R} .status-history__strip { display: flex; align-items: stretch; gap: 2px; min-height: 2rem; }
${R} .status-history__item { position: relative; flex: 1 1 0; min-width: 0; }
${R} .status-history__cell {
  display: block; width: 100%; height: 1.75rem; padding: 0; border: 0; border-radius: 3px;
  cursor: pointer; background: var(--status-unknown-bg);
}
${R} .status-history__cell.status-operational { background: var(--status-operational); }
${R} .status-history__cell.status-degraded { background: var(--status-degraded); }
${R} .status-history__cell.status-maintenance { background: var(--status-maintenance); }
${R} .status-history__cell.status-partial-outage { background: var(--status-partial-outage); }
${R} .status-history__cell.status-major-outage { background: var(--status-major-outage); }
/* Never colour alone: unverified days are also hatched. */
${R} .status-history__cell.status-unknown {
  background: repeating-linear-gradient(
    45deg, var(--status-unknown-bg), var(--status-unknown-bg) 3px,
    color-mix(in srgb, var(--status-unknown) 35%, transparent) 3px,
    color-mix(in srgb, var(--status-unknown) 35%, transparent) 6px
  );
}
${R} .status-history__cell:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
${R} .status-history__scale {
  display: flex; justify-content: space-between; font-size: .75rem; color: var(--status-text-subtle);
}
${R} .status-history__item[data-outside='true'] { display: none; }
@container (max-width: 44rem) {
  ${R} .status-history__item[data-window='90'] { display: none; }
}
@container (max-width: 30rem) {
  ${R} .status-history__item[data-window='60'] { display: none; }
}

/* ---- day inspector ---- */
${R} .status-history__tooltip {
  position: absolute; z-index: 20; bottom: calc(100% + .5rem); left: 50%;
  transform: translateX(-50%); width: max-content; max-width: min(22rem, 80vw);
  display: grid; gap: .5rem; padding: .875rem; text-align: left;
  color: var(--status-text); background: var(--status-panel-bg);
  border: 1px solid var(--status-panel-border); border-radius: .625rem;
  box-shadow: 0 12px 32px rgba(15, 23, 42, .18);
}
${R} .status-history__item:last-child .status-history__tooltip { left: auto; right: 0; transform: none; }
${R} .status-history__item:first-child .status-history__tooltip { left: 0; transform: none; }
${R} .status-history__tooltip-head {
  display: flex; align-items: center; justify-content: space-between; gap: .75rem;
}
${R} .status-history__tooltip-head strong { color: var(--status-text-strong); }
${R} .status-history__timeline { display: flex; height: .75rem; gap: 1px; border-radius: 3px; overflow: hidden; }
${R} .status-history__timeline > span { min-width: 1px; background: var(--status-operational); }
${R} .status-history__timeline > span.status-degraded { background: var(--status-degraded); }
${R} .status-history__timeline > span.status-maintenance { background: var(--status-maintenance); }
${R} .status-history__timeline > span.status-partial-outage { background: var(--status-partial-outage); }
${R} .status-history__timeline > span.status-major-outage { background: var(--status-major-outage); }
${R} .status-history__timeline > span.status-unknown { background: var(--status-unknown); }
${R} .status-history__axis {
  display: flex; justify-content: space-between; font-size: .6875rem;
  color: var(--status-text-subtle); font-variant-numeric: tabular-nums;
}
${R} .status-legend { display: flex; flex-wrap: wrap; gap: .625rem; font-size: .6875rem; }
${R} .status-legend span { display: inline-flex; align-items: center; gap: .3rem; color: var(--status-text-muted); }
${R} .status-legend i { width: .625rem; height: .625rem; border-radius: 2px; background: currentColor; }

/* ---- uptime metrics ---- */
${R} .status-uptime-grid {
  display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
${R} .status-uptime-card { display: grid; gap: .75rem; }
${R} .status-uptime-card__head {
  display: flex; align-items: center; justify-content: space-between; gap: .75rem;
}
${R} .status-uptime-window { display: grid; gap: .3rem; }
${R} .status-uptime-window__row {
  display: flex; align-items: baseline; justify-content: space-between; gap: .5rem;
  font-size: .75rem; color: var(--status-text-subtle);
  font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
}
${R} .status-uptime-window__value {
  font-size: 1rem; font-weight: 700; letter-spacing: 0; text-transform: none;
  color: var(--status-text-strong); font-variant-numeric: tabular-nums;
}
${R} .status-meter {
  height: .5rem; border-radius: 999px; overflow: hidden;
  background: var(--status-panel-muted-bg); border: 1px solid var(--status-panel-muted-border);
}
${R} .status-meter > span { display: block; height: 100%; background: var(--status-operational); }
${R} .status-meter[data-tier='good'] > span { background: var(--status-degraded); }
${R} .status-meter[data-tier='poor'] > span { background: var(--status-major-outage); }
${R} .status-meter[data-tier='unknown'] > span { background: var(--status-unknown); }

/* ---- regions ---- */
${R} .status-region-grid {
  display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
}
${R} .status-region { display: grid; gap: .5rem; align-content: start; }
${R} .status-region__head {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem;
}
${R} .status-region__head h3 { font-size: .9375rem; font-weight: 700; color: var(--status-text-strong); }
${R} .status-region__summary { font-size: .8125rem; color: var(--status-text-muted); }
${R} .status-region__detail {
  display: grid; gap: .2rem; margin-top: .25rem; font-size: .75rem; color: var(--status-text-muted);
}
${R} .status-region__detail div { display: flex; justify-content: space-between; gap: 1rem; }
${R} .status-disclosure > summary {
  cursor: pointer; font-size: .75rem; font-weight: 600; color: var(--primary); list-style: none;
}
${R} .status-disclosure > summary::-webkit-details-marker { display: none; }
${R} .status-disclosure > summary:focus-visible {
  outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 30%, transparent);
  border-radius: .25rem;
}

/* ---- local-time hint ---- */
${R} .status-hint {
  display: inline-flex; align-items: center; gap: .3rem; padding: 0; border: 0;
  background: none; color: var(--status-text-subtle); font-size: .75rem; cursor: help;
}
${R} .status-hint:focus-visible {
  outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 30%, transparent);
  border-radius: .25rem;
}

/* ---- footer ---- */
${R} .status-footer {
  margin-top: 3rem; padding-top: 1.25rem; border-top: 1px solid var(--status-panel-border);
  display: grid; gap: .625rem; font-size: .8125rem; color: var(--status-text-muted);
}
${R} .status-footer__links { display: flex; flex-wrap: wrap; gap: .875rem; align-items: center; }
${R} .status-footer-link { color: var(--status-text-muted); text-decoration: none; }
${R} .status-footer-link:hover {
  color: var(--status-text-strong); text-decoration: underline;
  text-decoration-thickness: 2px; text-underline-offset: 3px;
}
${R} .status-footer-link:focus-visible {
  outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 30%, transparent);
  border-radius: .25rem;
}
${R} .status-footer__brand { display: inline-flex; align-items: center; gap: .4rem; }
${R} .status-footer__brand img { height: 1.125rem; width: auto; }

@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .45; }
}
${R} .status-pulse { animation: status-pulse 2s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  ${R} .status-pulse { animation: none; }
  ${R} * { transition: none !important; }
}
`;
