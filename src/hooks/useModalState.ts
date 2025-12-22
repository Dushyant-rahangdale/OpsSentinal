'use client';

import { useEffect, useState, useCallback } from 'react';

// Global modal state to prevent conflicts
let globalModalState: {
    search: boolean;
    quickActions: boolean;
    userMenu: boolean;
} = {
    search: false,
    quickActions: false,
    userMenu: false
};

type ModalName = 'search' | 'quickActions' | 'userMenu';
const listeners = new Map<ModalName, Set<() => void>>();

function notifyListeners(modalName: ModalName) {
    const modalListeners = listeners.get(modalName);
    if (modalListeners) {
        modalListeners.forEach(listener => listener());
    }
    // Also notify all listeners when any modal state changes
    listeners.forEach(modalListeners => {
        modalListeners.forEach(listener => listener());
    });
}

export function useModalState(modalName: ModalName) {
    const [isOpen, setIsOpenLocal] = useState(globalModalState[modalName]);

    useEffect(() => {
        if (!listeners.has(modalName)) {
            listeners.set(modalName, new Set());
        }
        const listener = () => {
            setIsOpenLocal(globalModalState[modalName]);
        };
        listeners.get(modalName)!.add(listener);
        
        // Sync initial state
        setIsOpenLocal(globalModalState[modalName]);
        
        return () => {
            listeners.get(modalName)?.delete(listener);
        };
    }, [modalName]);

    const setIsOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
        const newValue = typeof open === 'function' ? open(globalModalState[modalName]) : open;
        
        if (newValue) {
            // Close other modals
            Object.keys(globalModalState).forEach(key => {
                if (key !== modalName) {
                    globalModalState[key as ModalName] = false;
                    notifyListeners(key as ModalName);
                }
            });
        }
        globalModalState[modalName] = newValue;
        notifyListeners(modalName);
    }, [modalName]);

    return [isOpen, setIsOpen] as const;
}
