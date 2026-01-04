'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import _Link from 'next/link';
import Spinner from '@/components/ui/Spinner';
import { Eye, EyeOff, Lock, Check, X, ShieldCheck, AlertTriangle } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password strength requirements
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);

  const strengthScore = [hasMinLength, hasNumber, hasSpecialChar, hasUpperCase].filter(
    Boolean
  ).length;
  const isStrong = strengthScore === 4;

  if (!token) {
    return (
      <div
        className="login-alert error"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <AlertTriangle size={16} />
        <span>Invalid or missing reset token. Please request a new link.</span>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!isStrong) {
      setError('Please meet all password requirements');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
      } else {
        setSuccess(true);
        // Redirect after success
        setTimeout(() => {
          router.push('/login?password=1');
        }, 2000);
      }
    } catch (_err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        className="login-alert success"
        role="alert"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1rem',
          padding: '2rem',
        }}
      >
        <div
          style={{ background: '#d1fae5', padding: '1rem', borderRadius: '50%', color: '#059669' }}
        >
          <ShieldCheck size={32} />
        </div>
        <div>
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#065f46',
              marginBottom: '0.5rem',
            }}
          >
            Password Reset!
          </h3>
          <p style={{ color: '#047857' }}>Your password has been successfully updated.</p>
        </div>
        <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
          Redirecting to login...
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="login-form-fields" noValidate>
      {/* New Password Field */}
      <div className="login-field">
        <label htmlFor="password" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lock size={14} className="text-gray-400" />
          New Password
        </label>
        <div className="login-input-wrapper" style={{ position: 'relative' }}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="New strong password"
            className="login-input"
            style={{ paddingRight: '2.5rem' }}
            disabled={isSubmitting}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
            }}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Password Strength Meter */}
        <div
          style={{
            marginTop: '0.75rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.25rem',
          }}
        >
          <div
            style={{
              height: '4px',
              borderRadius: '2px',
              background:
                strengthScore >= 1 ? (strengthScore === 4 ? '#10b981' : '#fbbf24') : '#e5e7eb',
              transition: 'all 0.3s',
            }}
          />
          <div
            style={{
              height: '4px',
              borderRadius: '2px',
              background:
                strengthScore >= 2 ? (strengthScore === 4 ? '#10b981' : '#fbbf24') : '#e5e7eb',
              transition: 'all 0.3s',
            }}
          />
          <div
            style={{
              height: '4px',
              borderRadius: '2px',
              background:
                strengthScore >= 3 ? (strengthScore === 4 ? '#10b981' : '#fbbf24') : '#e5e7eb',
              transition: 'all 0.3s',
            }}
          />
          <div
            style={{
              height: '4px',
              borderRadius: '2px',
              background: strengthScore >= 4 ? '#10b981' : '#e5e7eb',
              transition: 'all 0.3s',
            }}
          />
        </div>

        <div
          style={{
            marginTop: '0.75rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            fontSize: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: hasMinLength ? '#059669' : '#6b7280',
            }}
          >
            {hasMinLength ? <Check size={12} /> : <div style={{ width: 12 }} />} 8+ Characters
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: hasUpperCase ? '#059669' : '#6b7280',
            }}
          >
            {hasUpperCase ? <Check size={12} /> : <div style={{ width: 12 }} />} Uppercase
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: hasNumber ? '#059669' : '#6b7280',
            }}
          >
            {hasNumber ? <Check size={12} /> : <div style={{ width: 12 }} />} Number
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: hasSpecialChar ? '#059669' : '#6b7280',
            }}
          >
            {hasSpecialChar ? <Check size={12} /> : <div style={{ width: 12 }} />} Symbol
          </div>
        </div>
      </div>

      {/* Confirm Password Field */}
      <div className="login-field">
        <label
          htmlFor="confirmPassword"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Lock size={14} className="text-gray-400" />
          Confirm Password
        </label>
        <div className="login-input-wrapper" style={{ position: 'relative' }}>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="login-input"
            style={{ paddingRight: '2.5rem' }}
            disabled={isSubmitting}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
            }}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {confirmPassword && password !== confirmPassword && (
          <div
            style={{
              fontSize: '0.75rem',
              color: '#dc2626',
              marginTop: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <X size={12} /> Passwords do not match
          </div>
        )}
      </div>

      {error && (
        <div
          className="login-alert error"
          role="alert"
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}
        >
          <AlertTriangle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        className="login-btn login-btn-primary"
        disabled={isSubmitting || !isStrong || password !== confirmPassword}
        style={{
          opacity: isSubmitting || !isStrong || password !== confirmPassword ? 0.7 : 1,
          cursor:
            isSubmitting || !isStrong || password !== confirmPassword ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? (
          <>
            <Spinner size="sm" variant="white" />
            <span>Updating...</span>
          </>
        ) : (
          <span>Set New Password</span>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="login-shell" role="main">
      <div className="login-bg-animation">
        <div className="login-bg-orb login-bg-orb-1"></div>
        <div className="login-bg-orb login-bg-orb-2"></div>
        <div className="login-bg-orb login-bg-orb-3"></div>
      </div>

      <div
        className="login-card"
        style={{
          maxWidth: '480px',
          margin: 'auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'auto',
          gridTemplateColumns: 'none', // Override grid
        }}
      >
        <section
          className="login-form"
          aria-label="Reset Password form"
          style={{ width: '100%', padding: '2rem 2.5rem' }}
        >
          <div className="login-form-wrapper">
            <div className="login-form-header" style={{ marginBottom: '2rem' }}>
              <div className="login-form-logo">
                <img src="/logo.svg" alt="OpsSentinal" className="login-form-logo-img" />
              </div>
              <div className="login-form-branding">
                <h2 className="login-title">Create New Password</h2>
                <p className="login-subtitle">Secure your account with a strong password</p>
              </div>
            </div>

            <Suspense fallback={<Spinner />}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}
