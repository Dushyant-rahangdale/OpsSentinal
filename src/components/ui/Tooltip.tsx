'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  variant?: 'default' | 'dark' | 'light';
  showArrow?: boolean;
  className?: string;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  variant = 'default',
  showArrow = true,
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      setShowTooltip(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
    setTimeout(() => setShowTooltip(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const variantStyles = {
    default: {
      background: 'var(--color-neutral-900)',
      color: 'white',
    },
    dark: {
      background: '#1f2937',
      color: 'white',
    },
    light: {
      background: 'white',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-lg)',
    },
  };

  const positionStyles = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px',
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: '8px',
    },
    left: {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: '8px',
    },
    right: {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: '8px',
    },
  };

  const arrowStyles = {
    top: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      borderTopColor: variantStyles[variant].background as string,
      borderBottom: 'none',
    },
    bottom: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      borderBottomColor: variantStyles[variant].background as string,
      borderTop: 'none',
    },
    left: {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      borderLeftColor: variantStyles[variant].background as string,
      borderRight: 'none',
    },
    right: {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      borderRightColor: variantStyles[variant].background as string,
      borderLeft: 'none',
    },
  };

  return (
    <div
      className={`ui-tooltip-wrapper ${className}`}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {showTooltip && (
        <div
          ref={tooltipRef}
          className={`ui-tooltip ui-tooltip-${position} ui-tooltip-${variant}`}
          style={{
            position: 'absolute',
            ...positionStyles[position],
            ...variantStyles[variant],
            padding: 'var(--spacing-2) var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            whiteSpace: 'nowrap',
            zIndex: 'var(--z-tooltip)',
            pointerEvents: 'none',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity var(--transition-fast) var(--ease-out)',
            boxShadow: variant === 'light' ? 'var(--shadow-lg)' : 'var(--shadow-md)',
          }}
          role="tooltip"
        >
          {content}
          {showArrow && (
            <div
              className="ui-tooltip-arrow"
              style={{
                position: 'absolute',
                ...arrowStyles[position],
                width: 0,
                height: 0,
                border: '4px solid transparent',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}


