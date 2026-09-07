'use client';

import React from 'react';
import Image from 'next/image';
import LoginAnimation from '@/components/auth/LoginAnimation';
import { cn } from '@/lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
  showAnimation?: boolean;
  /** Passed through on successful auth so the globe settles to "all resolved". */
  isSuccess?: boolean;
}

export function AuthLayout({ children, showAnimation = true, isSuccess = false }: AuthLayoutProps) {
  return (
    <div className="relative min-h-[100dvh] lg:h-[100dvh] w-full overflow-hidden bg-[#06080b] font-sans selection:bg-red-500/20">
      <div className="flex flex-col lg:flex-row min-h-[100dvh] lg:h-full w-full">
        {/* Left Side: Earth Globe + Sentinel Animation Showcase (desktop) */}
        {showAnimation && (
          <section className="hidden lg:flex lg:w-1/2 h-full relative overflow-hidden border-r border-[#1a202c]">
            <LoginAnimation resolved={isSuccess} />
          </section>
        )}

        {/* Small screens get a compact planetary strip instead of nothing —
            the full showcase assumes a tall panel it will never have here. */}
        {showAnimation && (
          <div className="lg:hidden relative w-full h-[164px] shrink-0 overflow-hidden border-b border-[#1a202c]">
            <LoginAnimation variant="banner" resolved={isSuccess} />
          </div>
        )}

        {/* Right Side: Clean Auth Container with Dark Mode Support */}
        <section
          className={cn(
            'flex flex-col justify-between flex-1 w-full bg-background text-foreground overflow-y-auto px-6 py-8 sm:px-12 lg:px-16 2xl:px-24 transition-colors duration-200',
            showAnimation ? 'lg:w-1/2' : 'w-full'
          )}
        >
          {/* Brand badge — only needed when there's no banner above to carry it */}
          {!showAnimation && (
            <div className="w-full flex items-center justify-between py-2">
              <div className="flex lg:hidden items-center gap-2">
                <Image
                  src="/logo-mark.png"
                  alt="OpsKnight"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                  unoptimized
                />
                <span className="text-lg tracking-tight text-slate-950 dark:text-white">
                  <span className="font-medium">Ops</span>
                  <span className="font-extrabold">Knight</span>
                </span>
              </div>
            </div>
          )}

          {/* Centered Auth Card */}
          <div className="w-full flex items-center justify-center my-auto">{children}</div>

          {/* Bottom security badge */}
          <div className="text-center text-[11px] 2xl:text-xs text-slate-500 dark:text-slate-400 font-medium py-3 flex items-center justify-center gap-1.5">
            <svg
              className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Your instance. Your data. Your rules.</span>
          </div>
        </section>
      </div>
    </div>
  );
}

interface AuthCardProps {
  children: React.ReactNode;
  isSuccess?: boolean;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        'w-full max-w-[360px] sm:max-w-[400px] 2xl:max-w-[460px] min-[2000px]:max-w-[520px] mx-auto py-4',
        className
      )}
    >
      {children}
    </div>
  );
}
