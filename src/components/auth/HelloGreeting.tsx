'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Greeting = { text: string; lang: string; rtl?: boolean };

// Rendered first on the server and on the first client paint, so hydration
// matches exactly; rotation only begins after mount.
const FIRST: Greeting = { text: 'Hello', lang: 'en' };

const GREETINGS: Greeting[] = [
  FIRST,
  { text: 'नमस्ते', lang: 'hi' },
  { text: 'Hola', lang: 'es' },
  { text: 'Bonjour', lang: 'fr' },
  { text: 'こんにちは', lang: 'ja' },
  { text: 'Olá', lang: 'pt' },
  { text: '안녕하세요', lang: 'ko' },
  { text: 'Hallo', lang: 'de' },
  { text: 'مرحبًا', lang: 'ar', rtl: true },
  { text: '你好', lang: 'zh' },
  { text: 'Привет', lang: 'ru' },
  { text: 'Ciao', lang: 'it' },
];

const HOLD_MS = 2600;
const FADE_MS = 420;

export default function HelloGreeting({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    // Respect reduced motion by simply staying on the first greeting.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let fadeTimer: ReturnType<typeof setTimeout>;
    const rotate = setInterval(() => {
      setShown(false);
      fadeTimer = setTimeout(() => {
        setIndex(i => (i + 1) % GREETINGS.length);
        setShown(true);
      }, FADE_MS);
    }, HOLD_MS);

    return () => {
      clearInterval(rotate);
      clearTimeout(fadeTimer);
    };
  }, []);

  const greeting = GREETINGS.at(index) ?? FIRST;

  return (
    <>
      {/* Assistive tech gets one stable greeting rather than a heading whose
          text changes every few seconds. */}
      <span className="sr-only">Welcome back</span>
      <span
        aria-hidden="true"
        lang={greeting.lang}
        dir={greeting.rtl ? 'rtl' : 'ltr'}
        className={cn('inline-block transition-opacity ease-out', className)}
        style={{ opacity: shown ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
      >
        {greeting.text}
      </span>
    </>
  );
}
