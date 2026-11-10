import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import { DoodleSquiggle } from '../components/Doodles';

export const LoginPage: React.FC = () => {
  const {
    firebaseUser,
    needsOnboarding,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    clearError,
  } = useClub();
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from?: string }).from !== '/login'
      ? (location.state as { from: string }).from
      : '/';

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    if (firebaseUser && !needsOnboarding) {
      navigate(returnTo, { replace: true });
    }
  }, [firebaseUser, needsOnboarding, navigate, returnTo]);

  const handleGoogleClick = async () => {
    setResetMessage(null);
    clearError();
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    clearError();
    if (!email.trim() || !password) return;

    setSubmitting(true);
    try {
      if (authMode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setResetMessage(null);
    clearError();
    const sent = await sendPasswordReset(email);
    if (sent) {
      setResetMessage('Password reset link sent. Please check your email inbox.');
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 flex flex-col justify-center overflow-x-hidden">
      <div className="w-full space-y-6">
        {/* Brand Header (1 subtle doodle per screen) */}
        <div className="space-y-1.5">
          <span className="label-sm block">Rewa, Madhya Pradesh</span>
          <h1 className="font-display text-[34px] text-[var(--text)] leading-none">
            FRST Run Club
          </h1>
          <DoodleSquiggle className="w-36 h-3" />
          <p className="text-[16px] text-[var(--muted)] pt-1">
            Sign in to join FRST Run Club
          </p>
        </div>

        {/* Main action button: Continue with Google */}
        <button
          type="button"
          disabled={submitting}
          onClick={handleGoogleClick}
          className="w-full btn-primary"
        >
          Continue with Google
        </button>

        {/* Email + Password Card */}
        <div className="club-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--divider)] pb-3">
            <span className="label-sm">Email access</span>
            <div role="tablist" aria-label="Email authentication mode" className="flex items-center gap-4 text-small font-semibold">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signin'}
                onClick={() => {
                  setAuthMode('signin');
                  setResetMessage(null);
                  clearError();
                }}
                className={`cursor-pointer ${
                  authMode === 'signin'
                    ? 'text-[var(--accent)] underline'
                    : 'text-[var(--muted)]'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signup'}
                onClick={() => {
                  setAuthMode('signup');
                  setResetMessage(null);
                  clearError();
                }}
                className={`cursor-pointer ${
                  authMode === 'signup'
                    ? 'text-[var(--accent)] underline'
                    : 'text-[var(--muted)]'
                }`}
              >
                Sign up
              </button>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block label-sm mb-1.5">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="runner@example.com"
                className="w-full h-[46px] club-input px-3"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-password" className="label-sm">
                  Password
                </label>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-small font-semibold text-[var(--accent)] underline cursor-pointer"
                  >
                    Forgot password
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full h-[46px] club-input px-3"
              />
            </div>

            {resetMessage && (
              <div className="p-3 rounded-[10px] border border-[var(--divider)] bg-[var(--bg)] text-small font-medium text-[var(--text)]">
                {resetMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-secondary"
            >
              {submitting
                ? 'Please wait...'
                : authMode === 'signin'
                ? 'Sign in with email'
                : 'Sign up with email'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
