'use client';

import React from 'react';
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

import { EARTH_LAND_PATH } from './earthPaths';

// Geographically accurate Earth landmasses (800x400) with realistic biome gradients,
// shallow coastal shelf outlines, mountain ridges, and night city lights.
const CONTINENTS_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'>
  <defs>
    <!-- Natural biome gradient from Arctic ice to boreal forests, deserts, and jungles -->
    <linearGradient id='biomeGrad' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0%' stop-color='#dbeafe' />    <!-- Arctic ice & tundra -->
      <stop offset='12%' stop-color='#1f402c' />   <!-- Boreal / Taiga forests -->
      <stop offset='30%' stop-color='#336040' />   <!-- Temperate mixed forests -->
      <stop offset='45%' stop-color='#4b6a44' />   <!-- Mediterranean & grasslands -->
      <stop offset='54%' stop-color='#84724a' />   <!-- Sahara / Arabian / Gobi desert ochre -->
      <stop offset='64%' stop-color='#184a2a' />   <!-- Equatorial rainforest (Amazon, Congo, SE Asia) -->
      <stop offset='80%' stop-color='#3a6144' />   <!-- Southern temperate savannah & forests -->
      <stop offset='92%' stop-color='#254332' />   <!-- Patagonia & subantarctic tundra -->
      <stop offset='100%' stop-color='#dbeafe' />  <!-- Antarctic glaciers -->
    </linearGradient>
  </defs>

  <!-- Dual-layer shallow coastal continental shelf (turquoise satellite glow) -->
  <path d='${EARTH_LAND_PATH}' fill='none' stroke='#105268' stroke-width='6' stroke-linejoin='round' opacity='0.7' />
  <path d='${EARTH_LAND_PATH}' fill='none' stroke='#1b728e' stroke-width='2.5' stroke-linejoin='round' opacity='0.9' />

  <!-- Authentic Continents -->
  <path d='${EARTH_LAND_PATH}' fill='url(#biomeGrad)' />

  <!-- Mountain ridges / elevation accent -->
  <path d='${EARTH_LAND_PATH}' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='1.5' />

  <!-- City Night Lights (Clusters of luminous golden/white lights at major global metros) -->
  <g fill='#fef08a' opacity='0.85'>
    <!-- North America: US East Coast, West Coast, Midwest -->
    <circle cx='185' cy='140' r='1.2' /><circle cx='188' cy='138' r='1.4' /><circle cx='183' cy='143' r='1.2' />
    <circle cx='128' cy='144' r='1.3' /><circle cx='124' cy='150' r='1.4' /><circle cx='165' cy='145' r='1.1' />
    <circle cx='162' cy='160' r='1.2' /><circle cx='178' cy='158' r='1.1' /><circle cx='172' cy='142' r='1.1' />
    <!-- Europe: London, Paris, Benelux, Germany, Po Valley -->
    <circle cx='400' cy='112' r='1.5' /><circle cx='406' cy='116' r='1.4' /><circle cx='414' cy='112' r='1.4' />
    <circle cx='422' cy='114' r='1.3' /><circle cx='420' cy='124' r='1.2' /><circle cx='395' cy='128' r='1.2' />
    <circle cx='435' cy='116' r='1.1' /><circle cx='428' cy='122' r='1.2' />
    <!-- Asia: Tokyo, Beijing, Shanghai, Guangzhou, Seoul, Mumbai, Delhi -->
    <circle cx='680' cy='126' r='1.6' /><circle cx='674' cy='130' r='1.4' /><circle cx='635' cy='132' r='1.3' />
    <circle cx='646' cy='144' r='1.4' /><circle cx='638' cy='156' r='1.4' /><circle cx='562' cy='158' r='1.4' />
    <circle cx='556' cy='166' r='1.3' /><circle cx='600' cy='188' r='1.2' /><circle cx='670' cy='118' r='1.3' />
    <!-- South America & Australia: São Paulo, Rio, Buenos Aires, Sydney, Melbourne -->
    <circle cx='288' cy='258' r='1.4' /><circle cx='294' cy='256' r='1.3' /><circle cx='276' cy='272' r='1.2' />
    <circle cx='702' cy='264' r='1.3' /><circle cx='694' cy='272' r='1.2' />
  </g>
</svg>`.trim();

const CONTINENTS_BG = `url("data:image/svg+xml,${encodeURIComponent(CONTINENTS_SVG)}")`;

// Primary realistic atmospheric weather/cyclone cloud deck
const CLOUDS_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'>
  <defs>
    <filter id='cloudBlur'>
      <feGaussianBlur stdDeviation='3.5' />
    </filter>
  </defs>
  <g fill='rgba(255,255,255,0.72)' filter='url(#cloudBlur)'>
    <!-- Equatorial cloud band (ITCZ) -->
    <ellipse cx='120' cy='190' rx='90' ry='12' />
    <ellipse cx='280' cy='195' rx='110' ry='14' />
    <ellipse cx='460' cy='188' rx='95' ry='10' />
    <ellipse cx='640' cy='192' rx='120' ry='15' />

    <!-- Northern mid-latitude cyclone storm swirls -->
    <path d='M80,120 C140,105 220,135 290,110 C340,90 380,130 460,115 C540,100 620,130 700,108 C750,95 780,120 800,112' stroke='rgba(255,255,255,0.6)' stroke-width='22' fill='none' stroke-linecap='round' />
    <ellipse cx='220' cy='115' rx='60' ry='18' transform='rotate(-8 220 115)' />
    <ellipse cx='580' cy='110' rx='75' ry='22' transform='rotate(10 580 110)' />

    <!-- Southern storm belt -->
    <path d='M0,290 C100,280 200,305 320,295 C440,285 560,310 680,290 C740,280 780,300 800,292' stroke='rgba(255,255,255,0.52)' stroke-width='18' fill='none' stroke-linecap='round' />
    <ellipse cx='380' cy='295' rx='80' ry='16' />
    <ellipse cx='720' cy='300' rx='90' ry='18' />
  </g>
</svg>`.trim();

const CLOUDS_BG = `url("data:image/svg+xml,${encodeURIComponent(CLOUDS_SVG)}")`;

// High-altitude cirrus cloud filaments for multi-speed orbital parallax
const CIRRUS_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'>
  <defs>
    <filter id='cirrusBlur'>
      <feGaussianBlur stdDeviation='2' />
    </filter>
  </defs>
  <g stroke='rgba(255,255,255,0.45)' stroke-linecap='round' filter='url(#cirrusBlur)'>
    <!-- Cirrus streaks -->
    <path d='M40,90 Q120,70 200,85 T360,80 T520,75 T680,90 T790,80' stroke-width='7' fill='none' />
    <path d='M10,140 Q90,155 180,145 T340,150 T500,135 T660,148 T790,140' stroke-width='5' fill='none' />
    <path d='M60,240 Q160,225 260,240 T460,230 T640,245 T780,235' stroke-width='6' fill='none' />
  </g>
</svg>`.trim();

const CIRRUS_BG = `url("data:image/svg+xml,${encodeURIComponent(CIRRUS_SVG)}")`;

// Incident markers on the globe
const INCIDENT_MARKERS = [
  { top: '32%', left: '38%', delay: '0s' },
  { top: '58%', left: '62%', delay: '-3.5s' },
  { top: '68%', left: '30%', delay: '-7s' },
  { top: '25%', left: '68%', delay: '-10.5s' },
];

export default function LoginAnimation() {
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
          {/* Rotating continents strip */}
          <div
            className="absolute inset-0 opacity-90"
            style={{
              backgroundImage: CONTINENTS_BG,
              backgroundRepeat: 'repeat-x',
              backgroundSize: '800px 400px',
              backgroundPosition: '0 4%',
              animation: 'rotate-globe 55s linear infinite',
            }}
          />
          {/* Primary atmospheric cloud deck */}
          <div
            className="absolute inset-0 opacity-45 mix-blend-screen"
            style={{
              backgroundImage: CLOUDS_BG,
              backgroundRepeat: 'repeat-x',
              backgroundSize: '800px 400px',
              backgroundPosition: '0 4%',
              animation: 'rotate-clouds 68s linear infinite',
            }}
          />
          {/* High-altitude cirrus filaments — multi-speed parallax */}
          <div
            className="absolute inset-0 opacity-35 mix-blend-screen"
            style={{
              backgroundImage: CIRRUS_BG,
              backgroundRepeat: 'repeat-x',
              backgroundSize: '800px 400px',
              backgroundPosition: '0 4%',
              animation: 'rotate-cirrus 84s linear infinite',
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

          {/* Incident lifecycle markers — pulse OPEN -> ACKNOWLEDGED -> RESOLVED */}
          {INCIDENT_MARKERS.map((m, i) => (
            <div key={i} className="absolute" style={{ top: m.top, left: m.left }}>
              <span
                className="absolute -inset-1.5 rounded-full bg-red-500"
                style={{ animation: `incident-ring 9s ease-out infinite`, animationDelay: m.delay }}
              />
              <span
                className="relative block h-1.5 w-1.5 rounded-full"
                style={{
                  animation: `incident-pulse 9s ease-in-out infinite`,
                  animationDelay: m.delay,
                }}
              />
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
