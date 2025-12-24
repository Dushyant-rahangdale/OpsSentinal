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
        <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            padding: '0.5rem',
            background: 'var(--color-neutral-100)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)'
        }}>
            <button
                onClick={() => setTheme('light')}
                aria-label="Switch to light theme"
                style={{
                    padding: '0.5rem',
                    background: theme === 'light' ? 'var(--primary)' : 'transparent',
                    color: theme === 'light' ? 'white' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '1rem'
                }}
            >
                ☀️
            </button>
            <button
                onClick={() => setTheme('system')}
                aria-label="Use system theme"
                style={{
                    padding: '0.5rem',
                    background: theme === 'system' ? 'var(--primary)' : 'transparent',
                    color: theme === 'system' ? 'white' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '1rem'
                }}
            >
                💻
            </button>
            <button
                onClick={() => setTheme('dark')}
                aria-label="Switch to dark theme"
                style={{
                    padding: '0.5rem',
                    background: theme === 'dark' ? 'var(--primary)' : 'transparent',
                    color: theme === 'dark' ? 'white' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '1rem'
                }}
            >
                🌙
            </button>
        </div>
    );
}

