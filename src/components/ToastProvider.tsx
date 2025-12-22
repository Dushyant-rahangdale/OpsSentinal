'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast from './Toast';

type ToastType = 'success' | 'error' | 'info';

type ToastMessage = {
    id: string;
    message: string;
    type: ToastType;
};

type ToastContextType = {
    showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div 
                className="toast-container"
                style={{ 
                    position: 'fixed', 
                    top: '1rem', 
                    right: '1rem',
                    zIndex: 10000, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem',
                    maxWidth: '90%',
                    width: 'auto',
                    pointerEvents: 'none',
                    maxHeight: 'calc(100vh - 2rem)',
                    overflowY: 'auto',
                    overflowX: 'hidden'
                }}
                aria-live="polite"
                aria-atomic="false"
            >
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

