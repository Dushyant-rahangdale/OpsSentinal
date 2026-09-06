'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';

// Deterministic pseudo-random star field — seeded so the server-rendered and
// hydrated client markup match exactly (no Math.random() during render).
function generateStars(count: number) {
  let seed = 1337;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: count }, (_, i) => {
    const r = rand();
    const size = r < 0.82 ? 1 : r < 0.96 ? 1.5 : 2;
    return {
      id: i,
      top: rand() * 100,
      left: rand() * 100,
      size,
      opacity: 0.3 + rand() * 0.5,
      duration: 3 + rand() * 5,
      delay: -(rand() * 8),
    };
  });
}

const STARS = generateStars(110);

// Pre-rendered geographically accurate continents + NASA satellite clouds,
// served as static cached assets. City lights are a separate layer so they can
// be masked to the night side only (see the lights layer below).
const CONTINENTS_IMG_URL = "url('/earth-continents.svg')";
const CITY_LIGHTS_IMG_URL = "url('/earth-city-lights.svg')";
const CLOUDS_IMG_URL = "url('/earth-clouds.webp')";

// The map textures are equirectangular 800x400. Every layer — land, lights,
// clouds — and every incident marker is positioned in this same coordinate
// space, and all of them are driven by ONE rotation clock below. That shared
// clock is what keeps markers glued to the landmass instead of drifting.
const TILE_W = 800;
const TILE_H = 400;
const CONTINENT_PERIOD_S = 55; // seconds for one full revolution of the map
const CLOUD_PERIOD_S = 68; // weather drifts slower than the surface (parallax)
const BG_POS_Y_PCT = 0.04; // matches backgroundPosition '0 4%' on the layers
const SPOTLIGHT_MS = 7000; // how long each incident ticket stays on screen

type IncidentMarker = {
  /** Column/row in the 800x400 equirectangular map. */
  u: number;
  v: number;
  id: string;
  service: string;
  status: string;
  color: string;
  pulseDelay: string;
};

// Anchored to real city coordinates lifted from the map asset's own annotated
// light positions, so a marker always sits on land — never open ocean.
const INCIDENT_MARKERS: IncidentMarker[] = [
  {
    u: 185,
    v: 140,
    id: 'INC-2481',
    service: 'Payments API',
    status: 'Acknowledged',
    color: '#f59e0b',
    pulseDelay: '0s',
  }, // New York
  {
    u: 406,
    v: 116,
    id: 'INC-3390',
    service: 'Auth Gateway',
    status: 'Resolved',
    color: '#10b981',
    pulseDelay: '-3.5s',
  }, // London
  {
    u: 680,
    v: 126,
    id: 'INC-5127',
    service: 'Checkout Service',
    status: 'Triggered',
    color: '#ef4444',
    pulseDelay: '-7s',
  }, // Tokyo
  {
    u: 562,
    v: 158,
    id: 'INC-6642',
    service: 'Notification Queue',
    status: 'Acknowledged',
    color: '#f59e0b',
    pulseDelay: '-10.5s',
  }, // Mumbai
  {
    u: 288,
    v: 258,
    id: 'INC-7215',
    service: 'Search Cluster',
    status: 'Resolved',
    color: '#10b981',
    pulseDelay: '-14s',
  }, // São Paulo
];

export default function LoginAnimation() {
  const globeRef = useRef<HTMLDivElement | null>(null);
  const continentsRef = useRef<HTMLDivElement | null>(null);
  const lightsRef = useRef<HTMLDivElement | null>(null);
  const cloudsRef = useRef<HTMLDivElement | null>(null);
  // Keyed by incident id rather than array index — the rAF loop only ever
  // looks nodes up by id, so there is no positional coupling to maintain.
  const nodesRef = useRef(
    new Map<string, { marker: HTMLDivElement | null; label: HTMLDivElement | null }>()
  );

  const registerNode = (id: string, key: 'marker' | 'label', el: HTMLDivElement | null): void => {
    const existing = nodesRef.current.get(id) ?? { marker: null, label: null };
    nodesRef.current.set(
      id,
      key === 'marker' ? { ...existing, marker: el } : { ...existing, label: el }
    );
  };

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let boxW = globe.clientWidth;
    const resizeObserver = new ResizeObserver(() => {
      boxW = globe.clientWidth;
    });
    resizeObserver.observe(globe);

    let rafId = 0;
    let startTs = 0;
    let spotlightId: string | null = null;
    let nextSpotlightAt = 0;

    const frame = (now: number) => {
      if (!startTs) startTs = now;
      const elapsed = prefersReducedMotion ? 0 : (now - startTs) / 1000;

      // One clock → every layer and every marker derive from this.
      const surfaceOffset = (elapsed / CONTINENT_PERIOD_S) * TILE_W;
      const cloudOffset = (elapsed / CLOUD_PERIOD_S) * TILE_W;

      if (continentsRef.current)
        continentsRef.current.style.backgroundPositionX = `${surfaceOffset}px`;
      // Lights share the surface offset exactly — they must stay on their cities.
      if (lightsRef.current) lightsRef.current.style.backgroundPositionX = `${surfaceOffset}px`;
      if (cloudsRef.current) cloudsRef.current.style.backgroundPositionX = `${cloudOffset}px`;

      const radius = boxW / 2;
      const centreX = boxW / 2;
      const centreY = boxW / 2;
      // background-position-y percentages resolve against (box height - image height)
      const yOffset = (boxW - TILE_H) * BG_POS_Y_PCT;

      const placements = new Map<string, { bx: number; by: number; alpha: number }>();

      for (const m of INCIDENT_MARKERS) {
        const bx = (((m.u + surfaceOffset) % TILE_W) + TILE_W) % TILE_W;
        const by = m.v + yOffset;
        let alpha = 0;
        if (bx <= boxW) {
          const dist = Math.hypot(bx - centreX, by - centreY);
          // Fade out across the outer 14% of the disc so markers dissolve at
          // the limb as they rotate out of view rather than popping off.
          alpha = Math.max(0, Math.min(1, (radius - dist) / (radius * 0.14)));
        }
        placements.set(m.id, { bx, by, alpha });

        const node = nodesRef.current.get(m.id);
        if (node?.marker) {
          node.marker.style.opacity = String(alpha);
          node.marker.style.transform = `translate3d(${bx}px, ${by}px, 0)`;
        }
      }

      // Spotlight: exactly one incident ticket visible at a time, and only on a
      // marker sitting comfortably inside the disc (never out at the limb).
      const isWellPlaced = (id: string) => {
        const p = placements.get(id);
        return !!p && p.alpha >= 1 && p.bx > boxW * 0.18 && p.bx < boxW * 0.82;
      };

      if (now >= nextSpotlightAt) {
        const currentIdx = INCIDENT_MARKERS.findIndex(m => m.id === spotlightId);
        // Rotate the candidate order so we always advance to the *next* marker.
        const order = [
          ...INCIDENT_MARKERS.slice(currentIdx + 1),
          ...INCIDENT_MARKERS.slice(0, currentIdx + 1),
        ];
        const next = order.find(m => isWellPlaced(m.id));
        if (next) {
          spotlightId = next.id;
          nextSpotlightAt = now + SPOTLIGHT_MS;
        }
      }

      for (const m of INCIDENT_MARKERS) {
        const node = nodesRef.current.get(m.id);
        if (!node?.label) continue;
        const visible = m.id === spotlightId && (placements.get(m.id)?.alpha ?? 0) >= 1;
        node.label.style.opacity = visible ? '1' : '0';
      }

      if (!prefersReducedMotion) rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#04060d] select-none">
      {/* Starfield */}
      <div className="absolute inset-0" aria-hidden="true">
        {STARS.map(s => (
          <span
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animation: `twinkle ${s.duration}s ease-in-out infinite`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}

        {/* Occasional shooting stars */}
        <span
          className="absolute h-px w-24 rounded-full bg-gradient-to-r from-white to-transparent"
          style={{
            top: '18%',
            left: '68%',
            transform: 'rotate(28deg)',
            animation: 'shooting-star 14s linear infinite',
            animationDelay: '-3s',
          }}
        />
        <span
          className="absolute h-px w-16 rounded-full bg-gradient-to-r from-white to-transparent"
          style={{
            top: '38%',
            left: '20%',
            transform: 'rotate(24deg)',
            animation: 'shooting-star 19s linear infinite',
            animationDelay: '-11s',
          }}
        />
      </div>

      {/* Soft depth vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,70,130,0.22),transparent_60%)]" />

      {/* Top brand header */}
      <div className="relative z-20 flex items-center gap-2.5 p-8 lg:p-12 pb-0">
        <div className="h-8 w-8 rounded-xl bg-red-950/50 border border-red-500/30 flex items-center justify-center p-1 shadow-[0_0_12px_rgba(220,38,38,0.25)]">
          <Image
            src="/logo.png"
            alt="OpsKnight"
            width={28}
            height={28}
            className="h-6 w-6 object-contain"
            priority
            unoptimized
          />
        </div>
        <span className="font-extrabold text-lg tracking-tight text-white">OpsKnight</span>
      </div>

      {/* Earth + orbit, anchored toward the bottom so it reads as a planetary horizon */}
      <div
        className="absolute left-1/2 z-10 pointer-events-none"
        style={{
          bottom: '-46%',
          width: 'clamp(520px, 62vw, 860px)',
          aspectRatio: '1 / 1',
          transform: 'translateX(-50%)',
        }}
      >
        {/* Orbit ring + satellites */}
        <div
          className="absolute rounded-full border border-dashed border-indigo-300/20"
          style={{ inset: '-6%' }}
        />
        <div
          className="absolute inset-0 animate-[spin_50s_linear_infinite]"
          style={{ margin: '-6%' }}
        >
          <span className="absolute top-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-sky-200 shadow-[0_0_10px_3px_rgba(186,230,253,0.6)]" />
        </div>
        <div
          className="absolute inset-0 animate-[spin_78s_linear_infinite]"
          style={{ margin: '-6%', animationDirection: 'reverse' }}
        >
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-red-300/80 shadow-[0_0_8px_2px_rgba(252,165,165,0.5)]" />
        </div>

        {/* Outer Rayleigh Atmospheric Aura */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            margin: '-4%',
            background:
              'radial-gradient(circle at 35% 30%, rgba(56,189,248,0.22) 50%, rgba(14,165,233,0.08) 68%, transparent 76%)',
            filter: 'blur(20px)',
          }}
        />

        {/* The globe itself */}
        <div
          ref={globeRef}
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            boxShadow:
              '0 0 75px 10px rgba(56,189,248,0.32), 0 0 0 1.5px rgba(186,230,253,0.28), inset 0 0 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Ocean base — realistic deep satellite ocean */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, #175472 0%, #0c334b 35%, #071e30 65%, #030c16 100%)',
            }}
          />
          {/* Rotating continents strip — offset driven by the shared clock */}
          <div
            ref={continentsRef}
            className="absolute inset-0 opacity-90 pointer-events-none"
            style={{
              backgroundImage: CONTINENTS_IMG_URL,
              backgroundRepeat: 'repeat-x',
              backgroundSize: '800px 400px',
              backgroundPosition: '0 4%',
              willChange: 'background-position',
              transform: 'translateZ(0)',
            }}
          />
          {/* City lights — same offset as the land so they stay on their cities,
              masked to reveal only on the night side of the terminator. */}
          <div
            ref={lightsRef}
            className="absolute inset-0 pointer-events-none mix-blend-screen"
            style={{
              backgroundImage: CITY_LIGHTS_IMG_URL,
              backgroundRepeat: 'repeat-x',
              backgroundSize: '800px 400px',
              backgroundPosition: '0 4%',
              WebkitMaskImage:
                'radial-gradient(circle at 32% 28%, transparent 42%, rgba(0,0,0,0.5) 64%, #000 84%)',
              maskImage:
                'radial-gradient(circle at 32% 28%, transparent 42%, rgba(0,0,0,0.5) 64%, #000 84%)',
              filter: 'drop-shadow(0 0 2px rgba(255,190,120,0.85))',
              willChange: 'background-position',
              transform: 'translateZ(0)',
            }}
          />
          {/* NASA Photographic Satellite Cloud Systems */}
          <div
            ref={cloudsRef}
            className="absolute inset-0 opacity-55 mix-blend-screen pointer-events-none"
            style={{
              backgroundImage: CLOUDS_IMG_URL,
              backgroundRepeat: 'repeat-x',
              backgroundSize: '800px 400px',
              backgroundPosition: '0 4%',
              willChange: 'background-position',
              transform: 'translateZ(0)',
            }}
          />
          {/* Volumetric shading — deep night terminator shadow */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 74% 78%, rgba(2,5,10,0.85) 0%, rgba(2,5,10,0.45) 45%, transparent 72%)',
            }}
          />
          {/* Liquid ocean sun-glint specular reflection */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen"
            style={{
              background:
                'radial-gradient(ellipse at 32% 28%, rgba(255,255,255,0.4) 0%, rgba(186,230,253,0.18) 16%, transparent 36%)',
            }}
          />
          {/* Rayleigh limb scattering ring */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, transparent 62%, rgba(56,189,248,0.15) 86%, rgba(186,230,253,0.38) 97%, transparent 100%)',
            }}
          />
          {/* Terminator rim light */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow:
                'inset 8px -8px 42px rgba(0,0,0,0.7), inset -5px 5px 34px rgba(186,230,253,0.35)',
            }}
          />
          {/* Radar sweep — a slow rotating scan beam, reinforcing "under watch" */}
          <div
            className="absolute inset-0 rounded-full opacity-60 mix-blend-screen animate-[spin_16s_linear_infinite]"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, rgba(56,189,248,0.4) 5deg, transparent 30deg, transparent 360deg)',
            }}
          />

          {/* Incident markers — pinned to map coordinates, so they ride the
              surface as it rotates and dissolve at the limb. */}
          {INCIDENT_MARKERS.map(m => (
            <div
              key={m.id}
              ref={el => registerNode(m.id, 'marker', el)}
              className="absolute top-0 left-0 opacity-0"
              style={{ willChange: 'transform, opacity' }}
            >
              {/* expanding "detected" ping */}
              <span
                className="absolute rounded-full bg-red-500"
                style={{
                  left: -9,
                  top: -9,
                  width: 18,
                  height: 18,
                  animation: 'incident-ring 9s ease-out infinite',
                  animationDelay: m.pulseDelay,
                }}
              />
              {/* the marker dot, cycling OPEN -> ACKNOWLEDGED -> RESOLVED */}
              <span
                className="absolute rounded-full"
                style={{
                  left: -3,
                  top: -3,
                  width: 6,
                  height: 6,
                  animation: 'incident-pulse 9s ease-in-out infinite',
                  animationDelay: m.pulseDelay,
                }}
              />

              {/* Ticket callout — tracks its marker; only one is shown at a time */}
              <div
                ref={el => registerNode(m.id, 'label', el)}
                className="absolute whitespace-nowrap rounded-md border border-white/10 bg-[#0a0e18]/95 px-2.5 py-1.5 shadow-lg opacity-0"
                style={{
                  left: 0,
                  bottom: 14,
                  transform: 'translateX(-50%)',
                  transition: 'opacity 600ms ease',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="text-[10px] font-mono font-semibold text-white">{m.id}</span>
                </div>
                <div className="flex items-center justify-between gap-3 mt-0.5">
                  <span className="text-[9px] text-slate-400">{m.service}</span>
                  <span className="text-[9px] font-semibold" style={{ color: m.color }}>
                    {m.status}
                  </span>
                </div>
                <div
                  className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent"
                  style={{ borderTopColor: '#0a0e18' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-8 lg:p-12 pt-24 bg-gradient-to-t from-[#04060d] via-[#04060d]/85 to-transparent">
        <div className="w-7 h-[2px] bg-red-600 mb-3" />
        <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-[1.2]">
          On watch when you{' '}
          <span className="text-red-500 italic font-serif text-[38px] lg:text-[46px] font-normal">
            need it most.
          </span>
        </h2>
        <p className="text-xs lg:text-sm text-slate-400 mt-2 max-w-sm leading-relaxed">
          Incidents detected, acknowledged, and resolved — around the world, around the clock.
        </p>

        <div className="flex items-center justify-between pt-4 mt-5 border-t border-slate-800/60 text-[10px] font-mono tracking-wider text-slate-400">
          <div>Open source &nbsp;•&nbsp; Self-hosted</div>
          <div>SYSTEMS STAY STRONGER TOGETHER</div>
        </div>
      </div>
    </div>
  );
}
