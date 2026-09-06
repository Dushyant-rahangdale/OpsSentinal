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

// A loose, stylized set of landmasses, tiled horizontally via CSS
// background-repeat and scrolled with background-position — this is what
// makes the globe read as "rotating" without any 3D engine, just a scrolling
// background-image inside a circular, shaded mask.
const CONTINENTS_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 300'>
  <g fill='#56916b'>
    <path d='M58,42 C92,18 132,26 144,58 C156,82 150,102 168,122 C186,142 178,178 148,190 C158,218 136,252 112,244 C90,238 92,208 72,202 C46,208 26,182 38,152 C12,140 18,106 44,92 C32,72 40,52 58,42 Z'/>
    <path d='M258,28 C308,6 382,18 408,48 C438,66 424,96 396,106 C428,120 442,152 414,172 C440,192 422,222 388,216 C392,242 362,258 336,242 C310,252 282,236 288,210 C258,204 244,174 264,150 C240,138 236,108 258,92 C244,72 244,48 258,28 Z'/>
    <path d='M468,158 C494,142 530,148 544,174 C560,192 548,218 522,222 C528,244 502,260 476,248 C452,254 432,232 442,208 C422,196 428,170 450,166 C454,162 462,160 468,158 Z'/>
    <ellipse cx='140' cy='245' rx='15' ry='8' transform='rotate(-12 140 245)'/>
    <ellipse cx='470' cy='55' rx='11' ry='6' transform='rotate(20 470 55)'/>
    <ellipse cx='555' cy='210' rx='9' ry='5'/>
  </g>
</svg>`.trim();

const CONTINENTS_BG = `url("data:image/svg+xml,${encodeURIComponent(CONTINENTS_SVG)}")`;

// Incident markers on the globe — each cycles through the same lifecycle
// states/colors as the product itself (OPEN -> ACKNOWLEDGED -> RESOLVED),
// staggered so they read as a steady stream of incidents being handled
// somewhere in the world, not a synchronized blink.
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

        {/* The globe itself */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            boxShadow:
              '0 0 70px 6px rgba(96,140,255,0.28), 0 0 0 1px rgba(148,180,255,0.18), inset 0 0 60px rgba(0,0,0,0.55)',
          }}
        >
          {/* Ocean base */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 38% 32%, #1c5f7a 0%, #103a52 42%, #081f30 72%, #04121e 100%)',
            }}
          />
          {/* Rotating continents strip */}
          <div
            className="absolute inset-0 opacity-85"
            style={{
              backgroundImage: CONTINENTS_BG,
              backgroundRepeat: 'repeat-x',
              backgroundSize: '600px 300px',
              backgroundPosition: '0 4%',
              animation: 'rotate-globe 55s linear infinite',
            }}
          />
          {/* Volumetric shading — sunlit upper-left, shadowed lower-right */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.22), transparent 42%), radial-gradient(circle at 72% 78%, rgba(0,0,0,0.65), transparent 62%)',
            }}
          />
          {/* Terminator rim light */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow:
                'inset 8px -8px 36px rgba(0,0,0,0.55), inset -4px 5px 30px rgba(180,220,255,0.28)',
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
