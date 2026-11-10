import React, { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, CircleDot, Home, Trophy, User } from 'lucide-react';
import { useClub } from '../context/ClubContext';
import { DoodleSquiggle } from './Doodles';

export const Layout: React.FC = () => {
  const {
    loading,
    firebaseUser,
    needsOnboarding,
    completeOnboarding,
    error,
    clearError,
  } = useClub();
  const location = useLocation();
  const navigate = useNavigate();

  // First-time onboarding state
  const [obName, setObName] = useState('');
  const [obBio, setObBio] = useState('');
  const [obPhoto, setObPhoto] = useState('');
  const [obPublic, setObPublic] = useState(true);
  const [obAgeConsent, setObAgeConsent] = useState(false);
  const [obSubmitting, setObSubmitting] = useState(false);
  const [obFormError, setObFormError] = useState<string | null>(null);

  useEffect(() => {
    if (firebaseUser && needsOnboarding) {
      setObName((prev) => prev || firebaseUser.displayName || '');
      setObPhoto((prev) => prev || firebaseUser.photoURL || '');
    }
  }, [firebaseUser, needsOnboarding]);

  // 1. Show loading screen while Firebase Auth loads
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <div className="w-full max-w-[480px] mx-auto min-h-screen flex flex-col items-center justify-center px-4 gap-2">
          <div className="font-display text-[28px] tracking-wide text-[var(--text)]">
            FRST Run Club
          </div>
          <p className="label-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // 2. Signed-out users can ONLY see the Login page; all other pages redirect there
  if (!firebaseUser && location.pathname !== '/login') {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to="/login" state={{ from: returnTo }} replace />;
  }

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setObFormError(null);

    if (!obName.trim()) {
      setObFormError('Please enter your display name.');
      return;
    }
    if (!obAgeConsent) {
      setObFormError('Please confirm the age or parent permission requirement.');
      return;
    }

    setObSubmitting(true);
    try {
      const ok = await completeOnboarding({
        displayName: obName,
        bio: obBio.slice(0, 120),
        photoURL: obPhoto,
        showPublicly: obPublic,
      });
      if (ok) {
        navigate('/', { replace: true });
      }
    } finally {
      setObSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] overflow-x-hidden">
      <div
        className={`w-full max-w-[480px] mx-auto min-h-screen flex flex-col relative ${
          firebaseUser ? 'pb-20' : ''
        }`}
      >
        {/* Error message if any */}
        {error && (
          <div
            role="alert"
            className="mx-4 mt-3 p-3.5 club-card text-[16px] flex items-start justify-between gap-3"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="text-small font-semibold text-[var(--accent)] underline shrink-0 cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {/* First-time Onboarding Screen */}
        {firebaseUser && needsOnboarding ? (
          <main className="flex-1 px-4 py-6 space-y-5 animate-page-enter">
            <div className="space-y-1.5">
              <span className="label-sm">Welcome to FRST Run Club</span>
              <h1 className="font-display text-[34px] leading-tight text-[var(--text)]">
                Complete Your Profile
              </h1>
              <DoodleSquiggle className="w-36 h-3" />
              <p className="text-[16px] text-[var(--muted)] pt-1">
                Tell us a little about yourself to join the club in Rewa.
              </p>
            </div>

            {obFormError && (
              <div role="alert" className="p-3.5 club-card text-[16px] text-[var(--accent)]">
                {obFormError}
              </div>
            )}

            <form onSubmit={handleOnboardingSubmit} className="club-card p-4 space-y-4">
              <div>
                <label htmlFor="ob-name" className="block label-sm mb-1.5">
                  Display name *
                </label>
                <input
                  id="ob-name"
                  type="text"
                  required
                  maxLength={80}
                  value={obName}
                  onChange={(e) => setObName(e.target.value)}
                  placeholder="Aarav Singh"
                  className="w-full h-[46px] club-input px-3"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="ob-bio" className="label-sm">
                    One-line bio (optional)
                  </label>
                  <span className="label-sm tabular-nums">{obBio.length}/120</span>
                </div>
                <input
                  id="ob-bio"
                  type="text"
                  maxLength={120}
                  value={obBio}
                  onChange={(e) => setObBio(e.target.value.slice(0, 120))}
                  placeholder="Sunday 5K runner in Rewa"
                  className="w-full h-[46px] club-input px-3"
                />
              </div>

              <div>
                <label htmlFor="ob-photo" className="block label-sm mb-1.5">
                  Photo URL (optional)
                </label>
                <input
                  id="ob-photo"
                  type="url"
                  maxLength={500}
                  value={obPhoto}
                  onChange={(e) => setObPhoto(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full h-[46px] club-input px-3"
                />
              </div>

              <div className="py-3 border-y border-[var(--divider)] flex items-center justify-between gap-3">
                <label
                  htmlFor="ob-public-switch"
                  className="text-[16px] text-[var(--text)] cursor-pointer"
                >
                  Show me on the public leaderboard
                </label>
                <button
                  id="ob-public-switch"
                  type="button"
                  role="switch"
                  aria-checked={obPublic}
                  onClick={() => setObPublic((v) => !v)}
                  className={`w-12 h-7 rounded-full border border-[var(--divider)] p-0.5 cursor-pointer shrink-0 transition-colors ${
                    obPublic ? 'bg-[var(--accent)]' : 'bg-[var(--bg)]'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full transition-transform ${
                      obPublic
                        ? 'translate-x-5 bg-[var(--on-accent)]'
                        : 'translate-x-0 bg-[var(--muted)]'
                    }`}
                  />
                </button>
              </div>

              <label className="flex items-start gap-3 text-[16px] text-[var(--text)] cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={obAgeConsent}
                  onChange={(e) => setObAgeConsent(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-[var(--accent)] shrink-0"
                />
                <span>I am 18 or older, or I have a parent&apos;s permission</span>
              </label>

              <button
                type="submit"
                disabled={obSubmitting}
                className="w-full btn-primary"
              >
                {obSubmitting ? 'Saving...' : 'Complete sign up'}
              </button>
            </form>
          </main>
        ) : (
          /* Main Page Content */
          <main key={location.pathname} className="flex-1 animate-page-enter">
            <Outlet />
          </main>
        )}

        {/* Bottom Tab Bar: 5 simple line icons with labels, active tab in the accent colour */}
        {firebaseUser && !needsOnboarding && (
          <nav
            aria-label="Bottom navigation"
            className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--card)] border-t border-[var(--divider)] pb-safe"
          >
            <div className="max-w-[480px] mx-auto grid grid-cols-5 h-16 px-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                  }`
                }
              >
                <Home className="w-5 h-5" strokeWidth={1.8} />
                <span className="text-[11px] font-medium tracking-wide">Home</span>
              </NavLink>

              <NavLink
                to="/runs"
                className={({ isActive }) =>
                  `min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                  }`
                }
              >
                <Calendar className="w-5 h-5" strokeWidth={1.8} />
                <span className="text-[11px] font-medium tracking-wide">Runs</span>
              </NavLink>

              <NavLink
                to="/record"
                className={({ isActive }) =>
                  `min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                  }`
                }
              >
                <CircleDot className="w-5 h-5" strokeWidth={1.8} />
                <span className="text-[11px] font-medium tracking-wide">Record</span>
              </NavLink>

              <NavLink
                to="/board"
                className={({ isActive }) =>
                  `min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
                    isActive || location.pathname.startsWith('/runner/')
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--muted)]'
                  }`
                }
              >
                <Trophy className="w-5 h-5" strokeWidth={1.8} />
                <span className="text-[11px] font-medium tracking-wide">Board</span>
              </NavLink>

              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
                    isActive || location.pathname === '/admin'
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--muted)]'
                  }`
                }
              >
                <User className="w-5 h-5" strokeWidth={1.8} />
                <span className="text-[11px] font-medium tracking-wide">Profile</span>
              </NavLink>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
};
