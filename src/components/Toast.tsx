'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/shadcn/button';

type ToastProps = {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
  icon?: React.ReactNode;
};

export default function Toast({ message, type, onClose, duration = 3000, icon }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeClasses = {
    success: {
      container: 'bg-green-50 text-green-900 border-green-200',
      iconBg: 'bg-green-500',
    },
    error: {
      container: 'bg-red-50 text-red-900 border-red-200',
      iconBg: 'bg-red-500',
    },
    warning: {
      container: 'bg-amber-50 text-amber-900 border-amber-200',
      iconBg: 'bg-amber-500',
    },
    info: {
      container: 'bg-blue-50 text-blue-900 border-blue-200',
      iconBg: 'bg-blue-500',
    },
  };

  const defaultIcon =
    icon ||
    (type === 'success' ? (
      <CheckCircle className="h-5 w-5" />
    ) : type === 'error' ? (
      <XCircle className="h-5 w-5" />
    ) : type === 'warning' ? (
      <AlertTriangle className="h-5 w-5" />
    ) : (
      <Info className="h-5 w-5" />
    ));

  return (
    <div
      className={cn(
        'toast flex items-center gap-3 px-5 py-3 min-w-[300px] max-w-[500px]',
        'rounded-md border shadow-lg pointer-events-auto',
        'animate-in slide-in-from-top-5 duration-300',
        typeClasses[type].container
      )}
      role="alert"
      aria-live="polite"
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white',
          typeClasses[type].iconBg
        )}
      >
        {defaultIcon}
      </div>
      <span className="flex-1 text-sm font-semibold">{message}</span>
      <Button
        onClick={onClose}
        variant="ghost"
        size="icon"
        className="ml-auto h-6 w-6 rounded-sm hover:bg-black/10 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
