'use client';

import { ReactNode, useEffect, useRef } from 'react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      contentRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: { maxWidth: '400px' },
    md: { maxWidth: '500px' },
    lg: { maxWidth: '800px' },
    xl: { maxWidth: '1200px' },
    fullscreen: { maxWidth: '100%', width: '100%', height: '100%', maxHeight: '100%' },
  };

  return (
    <div
      ref={modalRef}
      className={`ui-modal-backdrop ${className}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-4)',
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn var(--transition-base) var(--ease-out)',
      }}
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        ref={contentRef}
        className="ui-modal-content"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        style={{
          ...sizeStyles[size],
          width: '100%',
          background: 'var(--bg-secondary)',
          borderRadius: size === 'fullscreen' ? 0 : 'var(--radius-lg)',
          boxShadow: 'var(--shadow-2xl)',
          maxHeight: size === 'fullscreen' ? '100%' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp var(--transition-slow) var(--ease-out)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className="ui-modal-header"
            style={{
              padding: 'var(--spacing-6)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2
              id="modal-title"
              style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 'var(--font-size-2xl)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 'var(--spacing-2)',
                lineHeight: 1,
                borderRadius: 'var(--radius-sm)',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-neutral-100)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              ×
            </button>
          </div>
        )}
        <div
          className="ui-modal-body"
          style={{
            padding: 'var(--spacing-6)',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>
        {footer && (
          <div
            className="ui-modal-footer"
            style={{
              padding: 'var(--spacing-6)',
              borderTop: '1px solid var(--border)',
              background: 'var(--color-neutral-50)',
              display: 'flex',
              gap: 'var(--spacing-4)',
              justifyContent: 'flex-end',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}


