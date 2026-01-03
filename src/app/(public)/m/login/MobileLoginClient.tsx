'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Props = {
  callbackUrl: string;
  errorCode?: string | null;
  passwordSet?: boolean;
  ssoError?: string | null;
  ssoEnabled: boolean;
  ssoProviderType?: string | null;
  ssoProviderLabel?: string | null;
};

function formatError(message: string | null | undefined) {
  if (!message) return '';
  if (message === 'CredentialsSignin') return 'Invalid email or password.';
  if (message === 'AccessDenied')
    return 'Access denied. Check your SSO access or contact your admin.';
  if (message === 'Configuration') return 'Server configuration error.';
  return 'Unable to sign in. Please try again.';
}

export default function MobileLoginClient({
  callbackUrl,
  errorCode,
  passwordSet,
  ssoError,
  ssoEnabled,
  ssoProviderType,
  ssoProviderLabel,
}: Props) {
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSSOLoading, setIsSSOLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (errorCode) {
      setError(formatError(errorCode));
    }
  }, [errorCode]);

  useEffect(() => {
    if (mounted) {
      emailInputRef.current?.focus();
    }
  }, [mounted]);

  let safeCallbackUrl = callbackUrl.startsWith('/m') ? callbackUrl : '/m';
  if (safeCallbackUrl.includes('/login') || safeCallbackUrl === '/') {
    safeCallbackUrl = '/m';
  }

  const providerLabelMap: Record<string, string> = {
    google: 'Google',
    okta: 'Okta',
    azure: 'Microsoft',
    auth0: 'Auth0',
    custom: 'SSO',
  };
  const providerLabel =
    ssoProviderLabel || providerLabelMap[ssoProviderType ?? 'custom'] || providerLabelMap.custom;

  const handleSSO = async () => {
    setIsSSOLoading(true);
    setError('');
    try {
      // Fix: Override callbackUrl to /m if it is root or empty or signout to prevent desktop fallback
      // Fix: Override callbackUrl to /m if it is root, /login, or signout to prevent desktop fallback or loop
      let finalCallbackUrl = callbackUrl;
      if (
        !finalCallbackUrl ||
        finalCallbackUrl === '/' ||
        finalCallbackUrl.includes('/login') ||
        finalCallbackUrl.includes('/auth/signout')
      ) {
        finalCallbackUrl = '/m';
      }
      await signIn('oidc', { callbackUrl: finalCallbackUrl });
    } catch {
      setError('SSO authentication failed.');
      setIsSSOLoading(false);
    }
  };

  const handleCredentials = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      emailInputRef.current?.focus();
      return;
    }

    if (!password) {
      setError('Password is required');
      passwordInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: email.trim(),
        password,
        callbackUrl: safeCallbackUrl,
      });

      if (result?.error) {
        setError(formatError(result.error));
        setPassword('');
        passwordInputRef.current?.focus();
      } else if (result?.ok) {
        router.push(result?.url || safeCallbackUrl);
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* CSS Animations */}
      <style>{`
                @keyframes gradientShift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
                    50% { transform: translateY(-20px) rotate(180deg); opacity: 0.3; }
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.2); }
                    50% { box-shadow: 0 0 40px rgba(220, 38, 38, 0.4); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .login-card {
                    animation: slideUp 0.5s ease-out forwards;
                }
                .floating-shape {
                    position: absolute;
                    border-radius: 50%;
                    background: linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(99, 102, 241, 0.1));
                    animation: float 6s ease-in-out infinite;
                }
                .input-focus:focus {
                    outline: none;
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
                }
                .btn-primary:active {
                    transform: scale(0.98);
                }
                .btn-sso:hover {
                    background: rgba(99, 102, 241, 0.08);
                }
            `}</style>

      <div
        style={{
          minHeight: '100dvh',
          background: 'linear-gradient(-45deg, #0f172a, #1e1b4b, #0f172a, #1a1a2e)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1.5rem',
          boxSizing: 'border-box',
          position: 'relative',
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        {/* Floating Background Shapes */}
        <div
          className="floating-shape"
          style={{
            width: '150px',
            height: '150px',
            top: '10%',
            left: '-50px',
            animationDelay: '0s',
          }}
        />
        <div
          className="floating-shape"
          style={{
            width: '100px',
            height: '100px',
            top: '60%',
            right: '-30px',
            animationDelay: '2s',
          }}
        />
        <div
          className="floating-shape"
          style={{
            width: '80px',
            height: '80px',
            bottom: '20%',
            left: '20%',
            animationDelay: '4s',
          }}
        />

        {/* Main Card with Glassmorphism */}
        <div
          className="login-card"
          style={{
            margin: 'auto',
            width: '100%',
            maxWidth: '400px',
            background: 'rgba(30, 41, 59, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '2.5rem 1.75rem',
            boxShadow:
              '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Logo & Branding */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '72px',
                height: '72px',
                background:
                  'linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(220, 38, 38, 0.1))',
                borderRadius: '20px',
                marginBottom: '1.5rem',
                animation: 'pulse-glow 3s ease-in-out infinite',
              }}
            >
              <Image src="/logo.svg" alt="OpsSentinal" width={44} height={44} />
            </div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: '800',
                color: '#ffffff',
                margin: '0 0 0.5rem',
                letterSpacing: '-0.03em',
              }}
            >
              Welcome back
            </h1>
            <p
              style={{
                fontSize: '0.95rem',
                color: 'rgba(148, 163, 184, 1)',
                margin: 0,
              }}
            >
              Sign in to OpsSentinal
            </p>
          </div>

          {/* SSO Button */}
          {ssoEnabled && (
            <>
              <button
                type="button"
                onClick={handleSSO}
                disabled={isSSOLoading || isSubmitting}
                className="btn-sso"
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '14px',
                  border: '1px solid rgba(99, 102, 241, 0.5)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#a5b4fc',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.625rem',
                  marginBottom: '1.75rem',
                  opacity: isSSOLoading ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {isSSOLoading ? (
                  <span>Connecting...</span>
                ) : (
                  <>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Continue with {providerLabel}</span>
                  </>
                )}
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.75rem',
                }}
              >
                <div style={{ flex: 1, height: '1px', background: 'rgba(148, 163, 184, 0.2)' }} />
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'rgba(148, 163, 184, 0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  or
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(148, 163, 184, 0.2)' }} />
              </div>
            </>
          )}

          {/* Success/Error Messages */}
          {ssoError && (
            <div
              style={{
                padding: '0.875rem 1rem',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {ssoError}
            </div>
          )}

          {passwordSet && (
            <div
              style={{
                padding: '0.875rem 1rem',
                borderRadius: '12px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Password set successfully!
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '0.875rem 1rem',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleCredentials}>
            {/* Email Field */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: 'rgba(226, 232, 240, 0.9)',
                  marginBottom: '0.625rem',
                }}
              >
                Email address
              </label>
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="name@company.com"
                autoComplete="email"
                disabled={isSubmitting || isSSOLoading}
                className="input-focus"
                style={{
                  width: '100%',
                  padding: '1rem 1.125rem',
                  borderRadius: '14px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#f1f5f9',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.625rem',
                }}
              >
                <label
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: 'rgba(226, 232, 240, 0.9)',
                  }}
                >
                  Password
                </label>
                <a
                  href="/m/forgot-password"
                  style={{
                    fontSize: '0.8rem',
                    color: '#a5b4fc',
                    textDecoration: 'none',
                    fontWeight: '500',
                  }}
                >
                  Forgot password?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isSubmitting || isSSOLoading}
                  className="input-focus"
                  style={{
                    width: '100%',
                    padding: '1rem 1.125rem',
                    paddingRight: '3.5rem',
                    borderRadius: '14px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#f1f5f9',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(148, 163, 184, 0.8)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                  }}
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="1"
                        y1="1"
                        x2="23"
                        y2="23"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isSSOLoading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '1.125rem',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.625rem',
                opacity: isSubmitting ? 0.7 : 1,
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
              }}
            >
              {isSubmitting ? (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(148, 163, 184, 0.1)',
            }}
          >
            <p
              style={{
                fontSize: '0.8rem',
                color: 'rgba(148, 163, 184, 0.6)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Secured by OpsSentinal
            </p>
          </div>
        </div>

        {/* Version Badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.7rem',
            color: 'rgba(148, 163, 184, 0.4)',
            letterSpacing: '0.05em',
          }}
        >
          OpsSentinal Mobile v1.0
        </div>
      </div>
    </>
  );
}
