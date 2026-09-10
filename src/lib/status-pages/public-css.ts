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
  inline-size: 100%; max-inline-size: 100%; min-inline-size: 0;
}

${R} *, ${R} *::before, ${R} *::after { box-sizing: border-box; }
${R} img, ${R} svg, ${R} video { max-inline-size: 100%; }
${R} .status-page-content { inline-size: 100%; max-inline-size: 100%; min-inline-size: 0; }
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
  padding: clamp(1.25rem, 2.5vw, 1.75rem); border: 1px solid var(--status-panel-border);
  border-radius: 1rem; background: var(--status-panel-bg);
  box-shadow: 0 1px 2px rgba(15, 23, 42, .04), 0 10px 30px rgba(15, 23, 42, .035);
}
${R} .status-section { margin: clamp(2.75rem, 6vw, 4.5rem) 0; display: grid; gap: 1.25rem; min-inline-size: 0; max-inline-size: 100%; }
${R} .status-section__head {
  display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .5rem;
}
${R} .status-section__head h2 { font-size: clamp(1.25rem, 2vw, 1.5rem); font-weight: 750; letter-spacing: -.02em; color: var(--status-text-strong); }
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
${R} .status-services {
  display: grid; gap: 0; min-width: 0; width: 100%;
  border: 1px solid var(--status-panel-border); border-radius: 1rem;
  background: var(--status-panel-bg); box-shadow: 0 1px 3px rgba(15, 23, 42, .05);
  overflow: visible;
}
${R} .status-region-group { display: grid; gap: .75rem; margin: 0 0 1.25rem; min-inline-size: 0; max-inline-size: 100%; }
${R} .status-region-group > h3 {
  font-size: .75rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: var(--status-text-subtle);
}
${R} .status-service {
  content-visibility: auto; contain-intrinsic-size: auto 148px;
  position: relative; display: grid; gap: 1rem; padding: clamp(1rem, 3vw, 1.5rem);
  border: 0; border-top: 1px solid var(--status-panel-border); border-radius: 0;
  background: var(--status-panel-bg); box-shadow: none;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  overflow: visible;
  min-width: 0; width: 100%; max-width: 100%;
}
${R} .status-service:first-child { border-top: 0; border-radius: 1rem 1rem 0 0; }
${R} .status-service:last-child { border-radius: 0 0 1rem 1rem; }
${R} .status-service:only-child { border-radius: 1rem; }
${R} .status-service::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 4px; border-radius: 0; background: transparent; }
${R} .status-service:hover, ${R} .status-service:focus-within {
  background: color-mix(in srgb, var(--status-panel-bg) 96%, var(--primary) 4%);
  transform: translateX(2px); box-shadow: none; z-index: 10;
}
${R} .status-service:hover::before, ${R} .status-service:focus-within::before { background: var(--status-operational); }
${R} .status-service[data-status='degraded']:hover::before, ${R} .status-service[data-status='degraded']:focus-within::before { background: var(--status-degraded); }
${R} .status-service[data-status='maintenance']:hover::before, ${R} .status-service[data-status='maintenance']:focus-within::before { background: var(--status-maintenance); }
${R} .status-service[data-status='partial-outage']:hover::before, ${R} .status-service[data-status='partial-outage']:focus-within::before { background: var(--status-partial-outage); }
${R} .status-service[data-status='major-outage']:hover::before, ${R} .status-service[data-status='major-outage']:focus-within::before { background: var(--status-major-outage); }
${R} .status-service__head {
  display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: .75rem; min-inline-size: 0;
}
${R} .status-service__head > div { min-inline-size: 0; }
${R} .status-service__name { font-size: 1.0625rem; font-weight: 750; letter-spacing: -.01em; color: var(--status-text-strong); }
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
   Every day gets an equal fraction of the strip. There is deliberately no minimum bar width and
   no horizontal scrolling: all 90 days always compress into the card's actual inline size. */
${R} .status-history { display: grid; gap: .5rem; container-type: inline-size; min-inline-size: 0; inline-size: 100%; max-inline-size: 100%; overflow: hidden; }
${R} .status-history__strip {
  display: grid; grid-template-columns: repeat(90, minmax(0, 1fr)); align-items: stretch;
  gap: 3px; min-height: 2.65rem; padding: .55rem .75rem;
  border: 1px solid var(--status-panel-muted-border); border-radius: .75rem;
  background: var(--status-panel-muted-bg); box-shadow: inset 0 1px 2px rgba(15, 23, 42, .06);
  inline-size: 100%; max-inline-size: 100%; min-inline-size: 0; overflow: hidden;
}
${R} .status-history__item { position: relative; min-inline-size: 0; inline-size: 100%; overflow: visible; }
${R} .status-history__cell {
  display: block; inline-size: 100%; min-inline-size: 0; block-size: 1.55rem; padding: 0;
  border: 0; border-radius: 2px;
  cursor: pointer; background: var(--status-unknown-bg);
  transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
}
${R} .status-history__cell:hover, ${R} .status-history__cell[aria-expanded='true'] {
  transform: scaleY(1.22); filter: saturate(1.1);
  box-shadow: 0 0 0 1px var(--status-text-strong), 0 4px 10px rgba(15, 23, 42, .16); z-index: 2;
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
@container (max-width: 64rem) {
  ${R} .status-history__strip { gap: 2px; padding-inline: .5rem; }
}
@container (max-width: 36rem) {
  ${R} .status-history__strip { gap: 1px; padding-inline: .25rem; }
  ${R} .status-history__cell { border-radius: 1px; }
}
@container (max-width: 22rem) {
  ${R} .status-history__strip { gap: .5px; padding-inline: 2px; }
}

/* ---- day inspector ---- */
${R} .status-history__tooltip {
  position: relative; z-index: 20; width: 100%;
  display: grid; gap: .9rem; padding: clamp(1rem, 2.5vw, 1.35rem); text-align: left;
  color: var(--status-text); background: var(--status-panel-bg);
  border: 1px solid var(--status-panel-border); border-radius: .9rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, .12);
  animation: status-inspector-in .18s ease-out;
}
${R} .status-history__tooltip-head {
  display: flex; align-items: center; justify-content: space-between; gap: .75rem;
}
${R} .status-history__tooltip-head > div { display: grid; gap: .15rem; }
${R} .status-history__tooltip-head strong { color: var(--status-text-strong); }
${R} .status-history__service-label { color: var(--status-text-muted); font-size: .75rem; }
${R} .status-history__close { width: 1.75rem; height: 1.75rem; border: 0; border-radius: 999px; background: var(--status-panel-muted-bg); color: var(--status-text-muted); cursor: pointer; font-size: 1.1rem; }
${R} .status-history__close:hover { color: var(--status-text-strong); background: var(--status-panel-muted-border); }
${R} .status-history__day-stats { display: flex; flex-wrap: wrap; gap: .65rem; }
${R} .status-history__day-stats span { padding: .55rem .7rem; border-radius: .55rem; background: var(--status-panel-muted-bg); color: var(--status-text-muted); font-size: .8125rem; }
${R} .status-history__day-stats b { color: var(--status-text-strong); font-variant-numeric: tabular-nums; }
${R} .status-history__timeline-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .4rem; font-size: .75rem; color: var(--status-text-muted); }
${R} .status-history__timeline-head strong { color: var(--status-text-strong); font-size: .8125rem; }
${R} .status-history__timeline { position: relative; height: 3.25rem; padding: .25rem; border: 1px solid var(--status-panel-muted-border); background: var(--status-panel-muted-bg); border-radius: .6rem; overflow: hidden; }
${R} .status-history__segments { display: flex; height: 100%; gap: 1px; overflow: hidden; border-radius: .35rem; }
${R} .status-history__segments > span { min-width: 1px; background: var(--status-operational); }
${R} .status-history__segments > span.status-degraded { background: var(--status-degraded); }
${R} .status-history__segments > span.status-maintenance { background: var(--status-maintenance); }
${R} .status-history__segments > span.status-partial-outage { background: var(--status-partial-outage); }
${R} .status-history__segments > span.status-major-outage { background: var(--status-major-outage); }
${R} .status-history__segments > span.status-unknown { background: var(--status-unknown); }
${R} .status-history__markers { position: absolute; inset: .25rem; pointer-events: none; }
${R} .status-history__markers i { position: absolute; top: -.15rem; bottom: -.15rem; width: 2px; background: var(--status-text-inverse); box-shadow: 0 0 0 1px rgba(15, 23, 42, .65); transform: translateX(-1px); }
${R} .status-history__axis {
  display: flex; justify-content: space-between; font-size: .6875rem;
  color: var(--status-text-subtle); font-variant-numeric: tabular-nums;
}
${R} .status-history__incident-times { display: flex; flex-wrap: wrap; gap: .45rem; }
${R} .status-history__incident-times span { display: inline-flex; align-items: center; gap: .35rem; padding: .35rem .55rem; border-radius: .45rem; background: var(--status-major-outage-bg); color: var(--status-text-muted); font-size: .75rem; }
${R} .status-history__incident-times b { color: var(--status-major-outage); font-variant-numeric: tabular-nums; }
${R} .status-legend { display: flex; flex-wrap: wrap; gap: .625rem; font-size: .6875rem; }
${R} .status-legend span { display: inline-flex; align-items: center; gap: .3rem; color: var(--status-text-muted); }
${R} .status-legend i { width: .625rem; height: .625rem; border-radius: 2px; background: currentColor; }

/* ---- uptime metrics ---- */
${R} .status-uptime-grid {
  display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); min-inline-size: 0;
}
${R} .status-uptime-card { position: relative; display: grid; gap: 1.15rem; overflow: hidden; transition: transform .2s ease, box-shadow .2s ease; }
${R} .status-uptime-card::before { content: ''; position: absolute; inset: 0 0 auto; height: 3px; background: linear-gradient(90deg, var(--status-operational), color-mix(in srgb, var(--status-operational) 35%, var(--primary))); }
${R} .status-uptime-card[data-tier='good']::before { background: linear-gradient(90deg, var(--status-degraded), var(--primary)); }
${R} .status-uptime-card[data-tier='poor']::before { background: linear-gradient(90deg, var(--status-major-outage), var(--status-degraded)); }
${R} .status-uptime-card:hover { transform: translateY(-3px); box-shadow: 0 18px 40px rgba(15, 23, 42, .11); }
${R} .status-uptime-card__head {
  display: flex; align-items: center; justify-content: space-between; gap: .75rem;
}
${R} .status-uptime-window { display: grid; gap: .5rem; padding-top: .15rem; }
${R} .status-uptime-window__row {
  display: flex; align-items: baseline; justify-content: space-between; gap: .5rem;
  font-size: .75rem; color: var(--status-text-subtle);
  font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
}
${R} .status-uptime-window__value {
  font-size: clamp(1.35rem, 3vw, 1.75rem); font-weight: 780; letter-spacing: -.025em; text-transform: none;
  color: var(--status-text-strong); font-variant-numeric: tabular-nums;
}
${R} .status-meter {
  height: .7rem; border-radius: 999px; overflow: hidden;
  background: var(--status-panel-muted-bg); border: 1px solid var(--status-panel-muted-border);
}
${R} .status-meter > span { display: block; height: 100%; background: linear-gradient(90deg, color-mix(in srgb, var(--status-operational) 72%, #34d399), var(--status-operational)); transition: width .7s ease; }
${R} .status-meter[data-tier='good'] > span { background: var(--status-degraded); }
${R} .status-meter[data-tier='poor'] > span { background: var(--status-major-outage); }
${R} .status-meter[data-tier='unknown'] > span { background: var(--status-unknown); }

/* ---- regions ---- */
${R} .status-region-grid {
  display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); min-inline-size: 0;
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
${R} .status-subscribe {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(min(100%, 26rem), .8fr);
  align-items: center; gap: 1rem 2rem; padding: clamp(1.25rem, 3vw, 2rem);
  border: 1px solid var(--status-panel-border); border-radius: 1rem;
  background: var(--status-panel-bg); box-shadow: 0 6px 16px rgba(15, 23, 42, .05);
}
${R} .status-subscribe__copy { display: grid; gap: .35rem; min-inline-size: 0; }
${R} .status-subscribe__copy strong { color: var(--status-text-strong); font-size: clamp(1rem, 2vw, 1.2rem); }
${R} .status-subscribe__copy span { color: var(--status-text-muted); font-size: .875rem; }
${R} .status-subscribe__controls { display: flex; min-inline-size: 0; }
${R} .status-subscribe__input {
  min-inline-size: 0; inline-size: 100%; padding: .7rem .85rem;
  border: 1px solid var(--status-panel-border); border-radius: .65rem 0 0 .65rem;
  background: var(--status-panel-bg); color: var(--status-text);
}
${R} .status-subscribe__button {
  flex: 0 0 auto; padding: .7rem 1rem; border: 1px solid var(--primary); border-radius: 0 .65rem .65rem 0;
  background: var(--primary); color: var(--status-text-inverse); font-weight: 700; cursor: pointer;
}
${R} .status-subscribe__button:disabled { cursor: wait; opacity: .65; }
${R} .status-subscribe__input:focus-visible, ${R} .status-subscribe__button:focus-visible { outline: 3px solid color-mix(in srgb, var(--primary) 30%, transparent); outline-offset: 2px; z-index: 1; }
${R} .status-subscribe__error { grid-column: 1 / -1; padding: .65rem .75rem; border: 1px solid #fca5a5; border-radius: .6rem; background: #fee2e2; color: #991b1b; font-size: .875rem; }
${R} .status-subscribe__success { display: grid; gap: .35rem; padding: 1.25rem; border: 1px solid #86efac; border-radius: .8rem; background: #dcfce7; text-align: center; color: #15803d; }
${R} .status-subscribe__success strong { color: #166534; font-size: 1.05rem; }

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

/* ---- responsive composition ---- */
@media (max-width: 48rem) {
  ${R} .status-panel { padding: clamp(.9rem, 4vw, 1.25rem); border-radius: .8rem; }
  ${R} .status-section { margin: clamp(2rem, 9vw, 3rem) 0; gap: 1rem; }
  ${R} .status-overview__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  ${R} .status-service { padding: clamp(.9rem, 4vw, 1.2rem); border-radius: .8rem; }
  ${R} .status-service__facts { gap: .55rem 1rem; }
  ${R} .status-history__tooltip-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; }
  ${R} .status-history__tooltip-head .status-badge { justify-self: start; }
  ${R} .status-history__close { grid-column: 2; grid-row: 1; }
  ${R} .status-history__timeline-head span { display: none; }
  ${R} .status-region-grid, ${R} .status-uptime-grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 40rem) {
  ${R} .status-page-header { position: relative !important; top: auto !important; }
  ${R} .status-overview__stats { grid-template-columns: minmax(0, 1fr); }
  ${R} .status-service__head { display: grid; grid-template-columns: minmax(0, 1fr); }
  ${R} .status-service__head > .status-badge { justify-self: start; }
  ${R} .status-toolbar__row { align-items: stretch; }
  ${R} .status-toolbar__search { flex-basis: 100%; }
  ${R} .status-page-input, ${R} .status-page-select { inline-size: 100% !important; min-inline-size: 0 !important; flex: 1 1 100%; }
  ${R} .status-history__day-stats > span { flex: 1 1 9rem; }
  ${R} .status-history__axis { font-size: .625rem; }
  ${R} .status-subscribe { grid-template-columns: minmax(0, 1fr); }
  ${R} .status-subscribe__controls { display: grid; gap: .6rem; }
  ${R} .status-subscribe__input, ${R} .status-subscribe__button { border-radius: .65rem; }
}

@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .45; }
}
@keyframes status-inspector-in { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
${R} .status-pulse { animation: status-pulse 2s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  ${R} .status-pulse, ${R} .status-history__tooltip { animation: none; }
  ${R} * { transition: none !important; }
}
`;
