'use client';

import { useState, useEffect } from 'react';
import GlobalKeyboardHandler from './GlobalKeyboardHandler';
import KeyboardShortcuts from './KeyboardShortcuts';

export default function GlobalKeyboardHandlerWrapper() {
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

    useEffect(() => {
        const handleToggle = () => {
            setShortcutsOpen(prev => !prev);
        };

        window.addEventListener('toggleKeyboardShortcuts', handleToggle);
        return () => window.removeEventListener('toggleKeyboardShortcuts', handleToggle);
    }, []);

    return (
        <>
            <GlobalKeyboardHandler onShortcutsToggle={() => setShortcutsOpen(prev => !prev)} />
            <KeyboardShortcuts isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        </>
    );
}

