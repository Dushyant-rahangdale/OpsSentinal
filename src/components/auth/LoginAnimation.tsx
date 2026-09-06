'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

interface ServiceNodeData {
  id: string;
  label: string;
  sublabel: string;
  iconType: 'services' | 'databases' | 'applications' | 'cloud' | 'incidents' | 'teams';
  status: 'healthy' | 'monitoring' | 'protected' | 'aligned' | 'incident';
  posClass: string;
  wirePath: string;
}

const INITIAL_NODES: ServiceNodeData[] = [
  {
    id: 'services',
    label: 'SERVICES',
    sublabel: 'Healthy',
    iconType: 'services',
    status: 'healthy',
    posClass: 'left-4 top-2',
    wirePath: 'M 270 220 C 180 220, 130 45, 95 45',
  },
  {
    id: 'databases',
    label: 'DATABASES',
    sublabel: 'Healthy',
    iconType: 'databases',
    status: 'healthy',
    posClass: 'left-1 top-[185px]',
    wirePath: 'M 270 220 C 180 220, 130 205, 80 205',
  },
  {
    id: 'applications',
    label: 'APPLICATIONS',
    sublabel: 'Monitoring',
    iconType: 'applications',
    status: 'monitoring',
    posClass: 'left-6 bottom-4',
    wirePath: 'M 270 220 C 190 220, 150 395, 100 395',
  },
  {
    id: 'cloud',
    label: 'CLOUD',
    sublabel: 'Protected',
    iconType: 'cloud',
    status: 'protected',
    posClass: 'right-4 top-2',
    wirePath: 'M 270 220 C 360 220, 410 45, 445 45',
  },
  {
    id: 'incidents',
    label: 'INCIDENTS',
    sublabel: 'Detected',
    iconType: 'incidents',
    status: 'incident',
    posClass: 'right-1 top-[185px]',
    wirePath: 'M 270 220 C 360 220, 410 205, 460 205',
  },
  {
    id: 'teams',
    label: 'TEAMS',
    sublabel: 'Aligned',
    iconType: 'teams',
    status: 'aligned',
    posClass: 'right-6 bottom-4',
    wirePath: 'M 270 220 C 350 220, 390 395, 440 395',
  },
];

export default function LoginAnimation() {
  const [nodes, setNodes] = useState<ServiceNodeData[]>(INITIAL_NODES);
  const [activeIncidentId, setActiveIncidentId] = useState<string>('incidents');
  const [isFixing, setIsFixing] = useState<boolean>(false);

  // Lightweight incident simulation loop
  const triggerSimulationStep = useCallback(() => {
    setIsFixing(true);
    setTimeout(() => {
      const candidates = ['incidents', 'databases', 'services'];
      const nextId = candidates[(candidates.indexOf(activeIncidentId) + 1) % candidates.length];

      setNodes(prev =>
        prev.map(node => {
          if (node.id === nextId) {
            return {
              ...node,
              status: 'incident',
              sublabel: 'Detected',
            };
          }
          return {
            ...node,
            status:
              node.id === 'applications'
                ? 'monitoring'
                : node.id === 'cloud'
                  ? 'protected'
                  : node.id === 'teams'
                    ? 'aligned'
                    : 'healthy',
            sublabel:
              node.id === 'applications'
                ? 'Monitoring'
                : node.id === 'cloud'
                  ? 'Protected'
                  : node.id === 'teams'
                    ? 'Aligned'
                    : 'Healthy',
          };
        })
      );
      setActiveIncidentId(nextId);
      setIsFixing(false);
    }, 2000);
  }, [activeIncidentId]);

  useEffect(() => {
    const interval = setInterval(triggerSimulationStep, 7000);
    return () => clearInterval(interval);
  }, [triggerSimulationStep]);

  return (
    <div className="relative h-full w-full flex flex-col justify-between p-8 lg:p-12 select-none overflow-hidden bg-[#06080b]">
      {/* Background Subtle Space Grid */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '54px 54px',
        }}
      />

      {/* Top Header */}
      <div className="relative z-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-red-950/50 border border-red-500/30 flex items-center justify-center p-1 shadow-[0_0_12px_rgba(220,38,38,0.25)]">
            <Image
              src="/logo-mark.png"
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

        <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
          DETECT &nbsp;|&nbsp; COORDINATE &nbsp;|&nbsp; RESOLVE &nbsp;|&nbsp; STAY AHEAD
        </div>
      </div>

      {/* Central Animated Sentinel Node Network with Earth in Background */}
      <div className="relative z-10 w-full max-w-[540px] h-[440px] mx-auto my-auto flex items-center justify-center">
        {/* 3D Curved Earth Globe Canvas in the Background */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-[160px] pointer-events-none rounded-full z-0 overflow-hidden"
          style={{
            width: '880px',
            height: '880px',
            background:
              'radial-gradient(circle at 50% 12%, #0e1624 0%, #080d16 35%, #04060a 75%, #020305 100%)',
            boxShadow:
              '0 -25px 60px -5px rgba(220, 38, 38, 0.5), 0 -4px 20px 0 rgba(239, 68, 68, 0.4), inset 0 4px 30px rgba(239, 68, 68, 0.35)',
            borderTop: '2px solid rgba(239, 68, 68, 0.75)',
          }}
        >
          <svg className="w-full h-full opacity-80" viewBox="0 0 880 880" fill="none">
            <defs>
              <linearGradient id="arcRed" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#ef4444" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Latitude Grid Lines (curved across the sphere) */}
            <ellipse
              cx="440"
              cy="90"
              rx="340"
              ry="70"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
            <ellipse
              cx="440"
              cy="180"
              rx="400"
              ry="85"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
            <ellipse
              cx="440"
              cy="280"
              rx="430"
              ry="95"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
            <ellipse
              cx="440"
              cy="390"
              rx="435"
              ry="100"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />

            {/* Longitude Meridians (sweeping downward) */}
            <path
              d="M 440 0 C 360 120, 360 400, 440 650"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
            <path
              d="M 440 0 C 520 120, 520 400, 440 650"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
            <path
              d="M 440 0 C 270 120, 270 400, 440 650"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
            <path
              d="M 440 0 C 610 120, 610 400, 440 650"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
            <path
              d="M 440 0 C 180 120, 180 400, 440 650"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
            <path
              d="M 440 0 C 700 120, 700 400, 440 650"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />

            {/* Continental Landmass Dots */}
            {/* Americas */}
            <circle cx="280" cy="190" r="1.5" fill="#94a3b8" opacity="0.6" />
            <circle cx="290" cy="180" r="1.5" fill="#94a3b8" opacity="0.7" />
            <circle cx="270" cy="210" r="1.5" fill="#94a3b8" opacity="0.6" />
            <circle cx="305" cy="205" r="1.5" fill="#94a3b8" opacity="0.7" />
            <circle cx="320" cy="225" r="1.5" fill="#94a3b8" opacity="0.5" />
            <circle cx="285" cy="240" r="1.5" fill="#94a3b8" opacity="0.6" />
            <circle cx="300" cy="260" r="1.5" fill="#94a3b8" opacity="0.5" />

            {/* Europe & Africa */}
            <circle cx="440" cy="140" r="1.5" fill="#94a3b8" opacity="0.7" />
            <circle cx="455" cy="130" r="1.5" fill="#94a3b8" opacity="0.8" />
            <circle cx="430" cy="160" r="1.5" fill="#94a3b8" opacity="0.6" />
            <circle cx="460" cy="155" r="1.5" fill="#94a3b8" opacity="0.8" />
            <circle cx="445" cy="180" r="1.5" fill="#94a3b8" opacity="0.7" />
            <circle cx="435" cy="220" r="1.5" fill="#94a3b8" opacity="0.6" />
            <circle cx="450" cy="250" r="1.5" fill="#94a3b8" opacity="0.6" />
            <circle cx="470" cy="270" r="1.5" fill="#94a3b8" opacity="0.5" />
            <circle cx="440" cy="300" r="1.5" fill="#94a3b8" opacity="0.5" />

            {/* Asia */}
            <circle cx="570" cy="160" r="1.5" fill="#94a3b8" opacity="0.6" />
            <circle cx="590" cy="150" r="1.5" fill="#94a3b8" opacity="0.7" />
            <circle cx="610" cy="170" r="1.5" fill="#94a3b8" opacity="0.7" />
            <circle cx="580" cy="190" r="1.5" fill="#94a3b8" opacity="0.6" />
            <circle cx="620" cy="210" r="1.5" fill="#94a3b8" opacity="0.5" />

            {/* Interconnecting Red Telemetry Arcs */}
            <path
              d="M 290 180 Q 370 110 455 130"
              stroke="url(#arcRed)"
              strokeWidth="1.8"
              strokeDasharray="5 3"
              className="animate-pulse"
            />
            <path
              d="M 455 130 Q 530 100 610 170"
              stroke="url(#arcRed)"
              strokeWidth="1.8"
              strokeDasharray="5 3"
              className="animate-pulse"
            />
            <path
              d="M 305 205 Q 380 170 445 180"
              stroke="url(#arcRed)"
              strokeWidth="1.4"
              strokeDasharray="4 2"
            />
            <path
              d="M 445 180 Q 510 190 580 190"
              stroke="url(#arcRed)"
              strokeWidth="1.4"
              strokeDasharray="4 2"
            />
            <path
              d="M 450 250 Q 510 240 580 190"
              stroke="url(#arcRed)"
              strokeWidth="1.2"
              strokeDasharray="3 2"
            />

            {/* Active Data Hubs (Red Pulsing Beacons) */}
            <circle cx="290" cy="180" r="3.5" fill="#ef4444" />
            <circle
              cx="290"
              cy="180"
              r="9"
              fill="#ef4444"
              opacity="0.25"
              className="animate-ping"
            />

            <circle cx="455" cy="130" r="4" fill="#ef4444" />
            <circle
              cx="455"
              cy="130"
              r="12"
              fill="#ef4444"
              opacity="0.3"
              className="animate-ping"
            />

            <circle cx="610" cy="170" r="3.5" fill="#ef4444" />
            <circle cx="610" cy="170" r="9" fill="#ef4444" opacity="0.25" />

            <circle cx="305" cy="205" r="3" fill="#ef4444" opacity="0.9" />
            <circle cx="445" cy="180" r="3" fill="#ef4444" opacity="0.9" />
            <circle cx="580" cy="190" r="3" fill="#ef4444" opacity="0.9" />

            {/* Incident Flare Beacon on Earth */}
            {activeIncidentId === 'incidents' && (
              <g className="animate-pulse">
                <circle cx="590" cy="150" r="6" fill="#ef4444" />
                <circle
                  cx="590"
                  cy="150"
                  r="20"
                  fill="#ef4444"
                  opacity="0.4"
                  className="animate-ping"
                />
                <line
                  x1="590"
                  y1="150"
                  x2="590"
                  y2="60"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
              </g>
            )}
          </svg>
        </div>

        {/* Concentric Radar Orbits */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-[280px] h-[280px] rounded-full border border-slate-700/20 animate-[spin_40s_linear_infinite]" />
          <div className="w-[360px] h-[360px] rounded-full border border-slate-700/10" />
        </div>

        {/* Dynamic Trace Wires */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-15"
          viewBox="0 0 540 440"
        >
          {nodes.map(node => {
            const isIncident = node.id === activeIncidentId;
            return (
              <path
                key={`wire-${node.id}`}
                d={node.wirePath}
                stroke={isIncident ? (isFixing ? '#10b981' : '#ef4444') : '#253043'}
                strokeWidth={isIncident ? 2.5 : 1.5}
                fill="none"
                className={isIncident ? 'animate-pulse' : ''}
                strokeDasharray={isIncident ? '6 4' : undefined}
              />
            );
          })}
        </svg>

        {/* Central Sentinel Shield Hub */}
        <div className="relative z-20 flex items-center justify-center">
          <div className="relative w-28 h-32 flex items-center justify-center">
            {/* SVG Shield with dual neon glow (ice left, crimson right) matching reference */}
            <svg
              viewBox="0 0 100 120"
              className="absolute inset-0 w-full h-full drop-shadow-[0_0_22px_rgba(239,68,68,0.4)]"
            >
              <defs>
                <filter id="shieldGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="shieldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#111827" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#06080b" stopOpacity="0.98" />
                </linearGradient>
              </defs>

              {/* Shield Base Fill */}
              <path
                d="M 50 10 C 68 10, 84 14, 86 34 C 88 64, 72 88, 50 108 C 28 88, 12 64, 14 34 C 16 14, 32 10, 50 10 Z"
                fill="url(#shieldFill)"
                stroke="#1e293b"
                strokeWidth="1.5"
              />

              {/* Left Rim: Cold Ice / Neon Glow */}
              <path
                d="M 50 10 C 32 10, 16 14, 14 34 C 12 64, 28 88, 50 108"
                fill="none"
                stroke="#67e8f9"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.9"
                filter="url(#shieldGlow)"
              />

              {/* Right Rim: Red Sentinel Glow */}
              <path
                d="M 50 10 C 68 10, 84 14, 86 34 C 88 64, 72 88, 50 108"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#shieldGlow)"
              />

              {/* Center Vertical Seam */}
              <line
                x1="50"
                y1="14"
                x2="50"
                y2="102"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="2 3"
                opacity="0.6"
              />
            </svg>

            {/* OpsKnight Knight Helm inside shield */}
            <Image
              src="/logo-mark.png"
              alt="Sentinel Core"
              width={48}
              height={48}
              className="h-12 w-12 object-contain relative z-10 drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]"
              priority
              unoptimized
            />

            {isFixing && (
              <div className="absolute -top-3 z-30 px-2 py-0.5 rounded-full bg-emerald-500 text-[8px] font-bold text-black uppercase tracking-wider animate-bounce shadow-[0_0_10px_rgba(16,185,129,0.8)]">
                Remediating
              </div>
            )}
          </div>
        </div>

        {/* Orbiting Service Nodes */}
        {nodes.map(node => {
          const isIncident = node.id === activeIncidentId;
          return (
            <div
              key={node.id}
              className={`absolute flex items-center gap-2.5 rounded-xl px-3 py-2 backdrop-blur-sm shadow-md transition-all duration-300 ${
                node.posClass
              } ${
                isIncident
                  ? 'bg-red-950/60 border border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.35)]'
                  : 'bg-[#0c1017]/80 border border-[#1e2738]'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg ${
                  isIncident ? 'bg-red-900/60 text-red-300' : 'bg-[#141b27] text-slate-300'
                }`}
              >
                <NodeIcon type={node.iconType} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isIncident ? 'text-red-200' : 'text-white'
                    }`}
                  >
                    {node.label}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isIncident ? 'bg-red-500 animate-ping' : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <span
                  className={`text-[9px] font-medium ${
                    isIncident ? 'text-red-300 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {node.sublabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Editorial Tagline */}
      <div className="relative z-20 mt-auto pt-4 bg-gradient-to-t from-[#06080b] via-[#06080b]/90 to-transparent">
        <div className="w-7 h-[2px] bg-red-600 mb-3" />
        <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-[1.2]">
          On watch when you{' '}
          <span className="text-red-500 italic font-serif text-[38px] lg:text-[46px] font-normal">
            need it most.
          </span>
        </h2>
        <p className="text-xs lg:text-sm text-slate-400 mt-2 max-w-sm leading-relaxed">
          Calm, coordinated incident response for modern engineering teams.
        </p>
      </div>

      {/* Footer System Badges */}
      <div className="relative z-10 flex items-center justify-between pt-4 mt-6 border-t border-slate-800/60 text-[10px] font-mono tracking-wider text-slate-400">
        <div>Open source &nbsp;•&nbsp; Self-hosted</div>
        <div>SYSTEMS STAY STRONGER TOGETHER</div>
      </div>
    </div>
  );
}

function NodeIcon({ type }: { type: ServiceNodeData['iconType'] }) {
  switch (type) {
    case 'services':
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      );
    case 'databases':
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
          />
        </svg>
      );
    case 'applications':
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      );
    case 'cloud':
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"
          />
        </svg>
      );
    case 'incidents':
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    case 'teams':
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      );
    default:
      return null;
  }
}
