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
    posClass: 'left-6 top-8',
    wirePath: 'M 260 165 C 190 165, 160 90, 110 90',
  },
  {
    id: 'databases',
    label: 'DATABASES',
    sublabel: 'Healthy',
    iconType: 'databases',
    status: 'healthy',
    posClass: 'left-2 top-36',
    wirePath: 'M 260 165 C 180 165, 140 180, 90 180',
  },
  {
    id: 'applications',
    label: 'APPLICATIONS',
    sublabel: 'Monitoring',
    iconType: 'applications',
    status: 'monitoring',
    posClass: 'left-8 bottom-6',
    wirePath: 'M 260 165 C 200 165, 180 260, 130 260',
  },
  {
    id: 'cloud',
    label: 'CLOUD',
    sublabel: 'Protected',
    iconType: 'cloud',
    status: 'protected',
    posClass: 'right-8 top-8',
    wirePath: 'M 260 165 C 330 165, 360 90, 410 90',
  },
  {
    id: 'incidents',
    label: 'INCIDENTS',
    sublabel: 'Detected',
    iconType: 'incidents',
    status: 'incident',
    posClass: 'right-2 top-36',
    wirePath: 'M 260 165 C 340 165, 370 180, 420 180',
  },
  {
    id: 'teams',
    label: 'TEAMS',
    sublabel: 'Aligned',
    iconType: 'teams',
    status: 'aligned',
    posClass: 'right-8 bottom-6',
    wirePath: 'M 260 165 C 320 165, 340 260, 390 260',
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

      {/* 3D Earth Globe Graphics at the bottom with illuminated horizon */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none rounded-full"
        style={{
          bottom: '-160px',
          width: '840px',
          height: '460px',
          background: 'radial-gradient(ellipse at 50% 30%, #0d131e 0%, #06080c 70%, #020305 100%)',
          boxShadow:
            '0 -20px 60px -10px rgba(220, 38, 38, 0.35), 0 -4px 20px 0 rgba(239, 68, 68, 0.2), inset 0 2px 20px rgba(239, 68, 68, 0.3)',
          borderTop: '1px solid rgba(239, 68, 68, 0.45)',
        }}
      >
        <svg className="w-full h-full opacity-60" viewBox="0 0 840 460" fill="none">
          <defs>
            <linearGradient id="arcGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Latitude curves */}
          <ellipse
            cx="420"
            cy="150"
            rx="370"
            ry="85"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
          <ellipse
            cx="420"
            cy="210"
            rx="350"
            ry="80"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
          <ellipse
            cx="420"
            cy="270"
            rx="310"
            ry="70"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="1"
          />

          {/* Longitude meridians */}
          <path
            d="M 420 0 C 330 90, 330 280, 420 380"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
          <path
            d="M 420 0 C 510 90, 510 280, 420 380"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
          <path
            d="M 420 0 C 230 90, 230 280, 420 380"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="1"
          />
          <path
            d="M 420 0 C 610 90, 610 280, 420 380"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="1"
          />

          {/* Interconnecting Red Telemetry Arcs */}
          <path
            d="M 280 170 Q 360 110 490 140"
            stroke="url(#arcGlow)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <path d="M 490 140 Q 570 130 630 190" stroke="url(#arcGlow)" strokeWidth="1.2" />
          <path d="M 230 200 Q 310 150 380 190" stroke="url(#arcGlow)" strokeWidth="1.2" />

          {/* Glowing City / Data Center Points */}
          <circle cx="280" cy="170" r="3" fill="#ef4444" opacity="0.9" />
          <circle cx="280" cy="170" r="7" fill="#ef4444" opacity="0.25" />
          <circle cx="490" cy="140" r="3" fill="#ef4444" opacity="0.9" />
          <circle cx="490" cy="140" r="9" fill="#ef4444" opacity="0.25" />
          <circle cx="630" cy="190" r="2.5" fill="#ef4444" opacity="0.8" />
          <circle cx="380" cy="190" r="3" fill="#ef4444" opacity="0.9" />
          <circle cx="230" cy="200" r="2.5" fill="#ef4444" opacity="0.8" />
        </svg>
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between">
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

      {/* Central Animated Sentinel Node Network */}
      <div className="relative z-10 w-full h-[320px] my-auto flex items-center justify-center">
        {/* Concentric Radar Orbits */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[260px] h-[260px] rounded-full border border-slate-700/20 animate-[spin_40s_linear_infinite]" />
          <div className="w-[320px] h-[320px] rounded-full border border-slate-700/10" />
        </div>

        {/* Dynamic Trace Wires */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 520 330">
          {nodes.map(node => {
            const isIncident = node.id === activeIncidentId;
            return (
              <path
                key={`wire-${node.id}`}
                d={node.wirePath}
                stroke={isIncident ? '#ef4444' : '#1f2937'}
                strokeWidth={isIncident ? 2 : 1.5}
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
      <div className="relative z-10 mt-auto">
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
