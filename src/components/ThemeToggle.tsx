'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Get saved theme preference or default to system
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
        if (savedTheme) {
            setTheme(savedTheme);
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        const effectiveTheme = theme === 'system' 
            ? (systemPrefersDark ? 'dark' : 'light')
            : theme;

        if (effectiveTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        localStorage.setItem('theme', theme);
    }, [theme, mounted]);

    if (!mounted) {
        return null; // Prevent hydration mismatch
    }

    return (
        <div className="theme-toggle">
            <button
                type="button"
                onClick={() => setTheme('light')}
                aria-label="Switch to light theme"
                aria-pressed={theme === 'light'}
                className={`theme-toggle-button${theme === 'light' ? ' is-active' : ''}`}
            >
                ☀️
            </button>
            <button
                type="button"
                onClick={() => setTheme('system')}
                aria-label="Use system theme"
                aria-pressed={theme === 'system'}
                className={`theme-toggle-button${theme === 'system' ? ' is-active' : ''}`}
            >
                💻
            </button>
            <button
                type="button"
                onClick={() => setTheme('dark')}
                aria-label="Switch to dark theme"
                aria-pressed={theme === 'dark'}
                className={`theme-toggle-button${theme === 'dark' ? ' is-active' : ''}`}
            >
                🌙
            </button>
        </div>
    );
}

