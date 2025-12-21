'use client';

import { ReactNode } from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  status?: 'online' | 'offline' | 'away' | 'busy';
  icon?: ReactNode;
  className?: string;
}

export default function Avatar({
  src,
  alt,
  name,
  size = 'md',
  status,
  icon,
  className = '',
}: AvatarProps) {
  const sizeStyles = {
    xs: { width: '24px', height: '24px', fontSize: 'var(--font-size-xs)' },
    sm: { width: '32px', height: '32px', fontSize: 'var(--font-size-sm)' },
    md: { width: '40px', height: '40px', fontSize: 'var(--font-size-base)' },
    lg: { width: '56px', height: '56px', fontSize: 'var(--font-size-lg)' },
    xl: { width: '80px', height: '80px', fontSize: 'var(--font-size-2xl)' },
  };

  const statusStyles = {
    online: { background: 'var(--color-success)' },
    offline: { background: 'var(--color-neutral-400)' },
    away: { background: 'var(--color-warning)' },
    busy: { background: 'var(--color-error)' },
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const statusSize = size === 'xs' || size === 'sm' ? '6px' : size === 'md' ? '8px' : '10px';

  return (
    <div
      className={`ui-avatar ui-avatar-${size} ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        ...sizeStyles[size],
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      ) : icon ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
          }}
        >
          {name ? getInitials(name) : '?'}
        </div>
      )}
      {status && (
        <div
          className={`ui-avatar-status ui-avatar-status-${status}`}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: statusSize,
            height: statusSize,
            borderRadius: '50%',
            border: '2px solid white',
            ...statusStyles[status],
          }}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}


