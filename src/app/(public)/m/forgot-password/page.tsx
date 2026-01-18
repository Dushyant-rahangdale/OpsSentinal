'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MobileForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Email is required');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setIsSent(true);
        setMessage(data.message);
      } else {
        setError(data.message || 'Something went wrong.');
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
                    0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.2); }
                    50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.4); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes checkmark {
                    0% { transform: scale(0); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
                .forgot-card {
                    animation: slideUp 0.5s ease-out forwards;
                }
                .floating-shape {
                    position: absolute;
                    border-radius: 50%;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
                    animation: float 6s ease-in-out infinite;
                }
                .input-focus:focus {
                    outline: none;
                    border-color: #6366f1 !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
                }
                .btn-primary:active {
                    transform: scale(0.98);
                }
                .success-icon {
                    animation: checkmark 0.5s ease-out forwards;
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
          justifyContent: 'center',
          padding: '1.5rem',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Floating Background Shapes */}
        <div
          className="floating-shape"
          style={{
            width: '120px',
            height: '120px',
            top: '15%',
            right: '-40px',
            animationDelay: '0s',
          }}
        />
        <div
          className="floating-shape"
          style={{
            width: '80px',
            height: '80px',
            bottom: '25%',
            left: '-20px',
            animationDelay: '3s',
          }}
        />

        {/* Main Card with Glassmorphism */}
        <div
          className="forgot-card"
          style={{
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
                width: '64px',
                height: '64px',
                background:
                  'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.1))',
                borderRadius: '18px',
                marginBottom: '1.5rem',
                animation: 'pulse-glow 3s ease-in-out infinite',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#a5b4fc"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
              Reset Password
            </h1>
            <p
              style={{
                fontSize: '0.95rem',
                color: 'rgba(148, 163, 184, 1)',
                margin: 0,
              }}
            >
              {isSent ? 'Check your inbox' : 'Enter your email to continue'}
            </p>
          </div>

          {/* Success State */}
          {isSent ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem',
                paddingTop: '1rem',
              }}
            >
              <div
                className="success-icon"
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '2px solid rgba(34, 197, 94, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4ade80"
                  strokeWidth="2.5"
                >
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'rgba(148, 163, 184, 0.9)',
                  textAlign: 'center',
                  margin: 0,
                  maxWidth: '280px',
                  lineHeight: '1.5',
                }}
              >
                {message}
              </p>
              <Link
                href="/m/login"
                style={{
                  width: '100%',
                  padding: '1.125rem',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: '700',
                  textAlign: 'center',
                  display: 'block',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                }}
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit}>
              {/* Email Field */}
              <div style={{ marginBottom: '1.5rem' }}>
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
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="name@company.com"
                  autoComplete="email"
                  autoFocus
                  disabled={isSubmitting}
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

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    padding: '0.875rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    fontSize: '0.875rem',
                    marginBottom: '1.5rem',
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '1.125rem',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
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
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
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
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Instructions</span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>

              {/* Back Link */}
              <div
                style={{
                  marginTop: '2rem',
                  textAlign: 'center',
                }}
              >
                <Link
                  href="/m/login"
                  style={{
                    fontSize: '0.9rem',
                    color: '#a5b4fc',
                    textDecoration: 'none',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M19 12H5M12 19l-7-7 7-7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
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
          OpsKnight Mobile v1.0
        </div>
      </div>
    </>
  );
}
