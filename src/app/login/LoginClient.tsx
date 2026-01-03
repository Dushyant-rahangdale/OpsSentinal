'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/ui/Spinner';
import SsoButton from '@/components/auth/SsoButton';

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
  if (message === 'CredentialsSignin')
    return 'Invalid email or password. Please check your credentials and try again.';
  if (message === 'AccessDenied')
    return 'Access denied. Check your SSO access or contact your administrator.';
  if (message === 'Configuration') return 'Server configuration error. Please contact support.';
  return 'Unable to sign in. Please try again.';
}

export default function LoginClient({
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
  const errorRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSSOLoading, setIsSSOLoading] = useState(false);

  // Set initial error from errorCode prop after mount to avoid hydration issues
  useEffect(() => {
    if (errorCode) {
      const errorMessage = formatError(errorCode);
      setError(errorMessage);
      // Focus error message for screen readers
      setTimeout(() => {
        errorRef.current?.focus();
      }, 100);
    }
  }, [errorCode]);

  // Focus email input on mount and prevent body scroll
  useEffect(() => {
    emailInputRef.current?.focus();
    // Prevent body scroll on login page
    document.body.style.overflow = 'hidden';
    return () => {
      // Restore body scroll when component unmounts
      document.body.style.overflow = '';
    };
  }, []);

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    if (value.length < 1) {
      setPasswordError('Password cannot be empty');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) {
      validateEmail(value);
    }
    setError(''); // Clear general error when user types
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (passwordError) {
      validatePassword(value);
    }
    setError(''); // Clear general error when user types
  };

  const handleSSO = async () => {
    setIsSSOLoading(true);
    setError('');
    try {
      await signIn('oidc', { callbackUrl });
    } catch (_err) {
      setError('SSO authentication failed. Please try again.');
      setIsSSOLoading(false);
    }
  };

  const handleCredentials = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Clear previous errors
    setError('');
    setEmailError('');
    setPasswordError('');

    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      // Focus first invalid field
      if (!isEmailValid) {
        emailInputRef.current?.focus();
      } else if (!isPasswordValid) {
        passwordInputRef.current?.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: email.trim(),
        password,
        callbackUrl,
      });

      if (result?.error) {
        setError(formatError(result.error));
        // Focus password field on error for security
        passwordInputRef.current?.focus();
        setPassword('');
      } else if (result?.ok) {
        router.push(result?.url || callbackUrl);
      }
    } catch (_err) {
      setError('An unexpected error occurred. Please try again.');
      passwordInputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-shell" role="main">
      {/* Animated background elements */}
      <div className="login-bg-animation">
        <div className="login-bg-orb login-bg-orb-1"></div>
        <div className="login-bg-orb login-bg-orb-2"></div>
        <div className="login-bg-orb login-bg-orb-3"></div>
      </div>

      <div className="login-card">
        {/* Brand Section */}
        <section className="login-brand" aria-label="OpsSentinal product information">
          <div className="login-brand-content">
            <div className="login-brand-header">
              <div className="login-logo-container">
                <img src="/logo.svg" alt="OpsSentinal" className="login-brand-logo" />
              </div>
              <div className="login-badge" aria-hidden="true">
                <span className="login-badge-dot"></span>
                OpsSentinal Platform
              </div>
            </div>

            <h1 className="login-brand-title">
              Command incidents.
              <span className="login-brand-title-accent">Stay ahead.</span>
            </h1>

            <p className="login-brand-description">
              A redline-ready control center for high-stakes response. See every alert, escalation,
              and shift before it becomes a disruption.
            </p>

            <div className="login-features" suppressHydrationWarning aria-label="Key features">
              <div className="login-feature-item" role="listitem">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Live incident war room</span>
              </div>
              <div className="login-feature-item" role="listitem">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline
                    points="12 6 12 12 16 14"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Sub-minute escalation</span>
              </div>
              <div className="login-feature-item" role="listitem">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
                  <path
                    d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Follow-the-sun coverage</span>
              </div>
              <div className="login-feature-item" role="listitem">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Audit-ready access controls</span>
              </div>
            </div>

            <div className="login-brand-footer">
              <div className="login-brand-stats">
                <div className="login-stat">
                  <div className="login-stat-value">99.9%</div>
                  <div className="login-stat-label">Uptime</div>
                </div>
                <div className="login-stat-divider"></div>
                <div className="login-stat">
                  <div className="login-stat-value">24/7</div>
                  <div className="login-stat-label">Monitoring</div>
                </div>
                <div className="login-stat-divider"></div>
                <div className="login-stat">
                  <div className="login-stat-value">Global</div>
                  <div className="login-stat-label">Resilience</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section className="login-form" aria-label="Sign in form">
          <div className="login-form-wrapper">
            <div className="login-form-header">
              <div className="login-form-logo">
                <img src="/logo.svg" alt="OpsSentinal" className="login-form-logo-img" />
              </div>
              <div className="login-form-branding">
                <h2 className="login-title">Welcome back</h2>
                <p className="login-subtitle">Sign in to access your OpsSentinal dashboard</p>
              </div>
            </div>

            {ssoError && (
              <div className="login-alert error" role="alert" aria-live="polite">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{ssoError}</span>
              </div>
            )}

            {ssoEnabled && (
              <>
                <SsoButton
                  providerType={ssoProviderType as any}
                  providerLabel={ssoProviderLabel}
                  onClick={handleSSO}
                  loading={isSSOLoading}
                  disabled={isSubmitting}
                />

                <div className="login-divider" role="separator" aria-label="Or">
                  <span className="login-divider-line" />
                  <span className="login-divider-label">or continue with email</span>
                  <span className="login-divider-line" />
                </div>
              </>
            )}

            {passwordSet && (
              <div className="login-alert success" role="alert" aria-live="polite">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Password set successfully. Sign in to continue.</span>
              </div>
            )}

            <form
              onSubmit={handleCredentials}
              className="login-form-fields"
              noValidate
              aria-label="Email and password sign in"
            >
              <div className="login-field">
                <label htmlFor="email">
                  Email address
                  <span className="sr-only"> (required)</span>
                </label>
                <div className="login-input-wrapper">
                  <input
                    id="email"
                    ref={emailInputRef}
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => handleEmailChange(e.target.value)}
                    onBlur={() => validateEmail(email)}
                    placeholder="name@company.com"
                    className={`login-input ${emailError ? 'login-input-error' : ''}`}
                    aria-invalid={emailError ? 'true' : 'false'}
                    aria-describedby={emailError ? 'email-error' : undefined}
                    disabled={isSubmitting || isSSOLoading}
                  />
                  {email && !emailError && (
                    <svg
                      className="login-input-icon success"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                {emailError && (
                  <div id="email-error" className="login-field-error" role="alert">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {emailError}
                  </div>
                )}
              </div>

              <div className="login-field">
                <label htmlFor="password">
                  Password
                  <span className="sr-only"> (required)</span>
                </label>
                <div style={{ marginBottom: '0.35rem', textAlign: 'right' }}>
                  <a
                    href="/forgot-password"
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--primary)',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                    tabIndex={-1}
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="login-input-wrapper">
                  <input
                    id="password"
                    ref={passwordInputRef}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={e => handlePasswordChange(e.target.value)}
                    onBlur={() => validatePassword(password)}
                    placeholder="Enter your password"
                    className={`login-input ${passwordError ? 'login-input-error' : ''}`}
                    aria-invalid={passwordError ? 'true' : 'false'}
                    aria-describedby={passwordError ? 'password-error' : undefined}
                    disabled={isSubmitting || isSSOLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isSubmitting || isSSOLoading}
                    tabIndex={0}
                  >
                    {showPassword ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
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
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {passwordError && (
                  <div id="password-error" className="login-field-error" role="alert">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {passwordError}
                  </div>
                )}
              </div>

              {error && (
                <div
                  ref={errorRef}
                  className="login-alert error"
                  role="alert"
                  aria-live="assertive"
                  tabIndex={-1}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="login-btn login-btn-primary"
                disabled={isSubmitting || isSSOLoading}
                aria-label="Sign in with email and password"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" variant="white" />
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
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 12h14M12 5l7 7-7 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="login-help">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path
                  d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m0 4h.01"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Need help? Contact your OpsSentinal administrator.</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
