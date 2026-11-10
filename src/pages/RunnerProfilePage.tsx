import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useClub } from '../context/ClubContext';
import { Avatar } from '../components/Avatar';
import {
  CountUpKm,
  DoodleFlame,
  ProfileBannerPattern,
} from '../components/Doodles';
import { formatMemberSince } from './MyProfilePage';

export const RunnerProfilePage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const { getRunnerStats, currentUser, submitProfileReport } = useClub();

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  const stats = uid ? getRunnerStats(uid) : null;

  if (!stats || !stats.user.showPublicly) {
    return (
      <div className="px-4 py-6 space-y-4">
        <Link
          to="/board"
          className="min-h-[44px] inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to board</span>
        </Link>
        <div className="py-6 border-y border-[var(--divider)] space-y-1.5">
          <h1 className="font-display text-[28px] text-[var(--text)]">Runner Not Found</h1>
          <p className="text-[16px] text-[var(--muted)]">
            This profile does not exist or is set to private.
          </p>
        </div>
      </div>
    );
  }

  const { user, totalKm, runsCount, allTimeRank, streakWeeks, badges, recentRuns } = stats;
  const isUnranked = totalKm <= 0 || allTimeRank <= 0;

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    setSubmittingReport(true);
    setReportMsg(null);
    try {
      await submitProfileReport({
        targetUid: user.uid,
        targetName: user.displayName,
        reason: reportReason.trim(),
      });
      setReportReason('');
      setShowReportForm(false);
      setReportMsg('Report sent to FRST Run Club admins.');
    } catch {
      setReportMsg('Could not submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="pb-10 overflow-x-hidden">
      {/* 1. Banner image, full width, 3:1 ratio (about 140px tall) */}
      <div className="relative w-full aspect-[3/1] min-h-[140px] max-h-[160px] bg-[var(--card)] border-b border-[var(--divider)] overflow-hidden">
        {user.bannerURL ? (
          <img
            src={user.bannerURL}
            alt={`${user.displayName} profile banner`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover block"
          />
        ) : (
          <ProfileBannerPattern />
        )}

        <Link
          to="/board"
          className="absolute top-3 left-3 h-8 px-3 rounded-[8px] bg-[var(--bg)]/90 text-[var(--text)] border border-[var(--divider)] text-[12px] font-medium inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Board</span>
        </Link>
      </div>

      {/* Main Content Container */}
      <div className="px-4 space-y-8">
        {/* 2. Round profile photo (88px) overlapping bottom of banner + Name, role chip, bio, member since */}
        <section className="space-y-3">
          <div className="-mt-11 relative z-10">
            <Avatar
              name={user.displayName}
              photoURL={user.photoURL}
              size="2xl"
              className="ring-[3px] ring-[var(--bg)]"
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-[28px] text-[var(--text)] leading-none">
                {user.displayName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full border border-[var(--divider)] bg-[var(--card)] text-[12px] font-medium text-[var(--muted)]">
                {user.role === 'admin' ? 'Admin' : 'Runner'}
              </span>
            </div>

            <p className="text-[16px] text-[var(--text)] leading-snug">
              {user.bio || 'Running with FRST Run Club in Rewa.'}
            </p>

            <p className="text-[13px] text-[var(--muted)]">
              {formatMemberSince(user.createdAt)}
            </p>
          </div>
        </section>

        {/* 3. Stats as a row of 3 tiles: Total km, Runs, Rank + Streak tile with flame doodle */}
        <section aria-label="Runner statistics" className="space-y-2.5">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="club-card p-3.5 flex flex-col justify-between">
              <span className="text-[13px] text-[var(--muted)]">Total km</span>
              <span className="font-display text-[26px] text-[var(--accent)] tabular-nums leading-tight pt-1">
                <CountUpKm value={totalKm} decimals={1} />
              </span>
            </div>

            <div className="club-card p-3.5 flex flex-col justify-between">
              <span className="text-[13px] text-[var(--muted)]">Runs</span>
              <span className="font-display text-[26px] text-[var(--text)] tabular-nums leading-tight pt-1">
                {runsCount}
              </span>
            </div>

            <div className="club-card p-3.5 flex flex-col justify-between">
              <span className="text-[13px] text-[var(--muted)]">Rank</span>
              {isUnranked ? (
                <span className="font-display text-[20px] text-[var(--muted)] leading-tight pt-1.5">
                  Unranked
                </span>
              ) : (
                <span className="font-display text-[26px] text-[var(--accent)] tabular-nums leading-tight pt-1">
                  #{allTimeRank}
                </span>
              )}
            </div>
          </div>

          {/* Streak tile (weeks in a row with a run) with small flame doodle */}
          <div className="club-card px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <DoodleFlame className="w-5 h-6" />
              <div>
                <div className="text-[15px] font-medium text-[var(--text)]">
                  Weekly streak
                </div>
                <div className="text-[13px] text-[var(--muted)]">
                  Weeks in a row with a run
                </div>
              </div>
            </div>
            <div className="font-display text-[24px] text-[var(--accent)] tabular-nums">
              {streakWeeks} {streakWeeks === 1 ? 'wk' : 'wks'}
            </div>
          </div>
        </section>

        {/* 4. Badges row (10, 25, 50, 100 km) */}
        <section aria-label="Milestone badges" className="space-y-3">
          <h2 className="font-display text-[22px] text-[var(--text)] leading-none">
            Badges
          </h2>

          <div className="grid grid-cols-4 gap-2">
            {badges.map((b) => {
              const kmToGo = Math.max(0, Number((b.km - totalKm).toFixed(1)));
              return (
                <div
                  key={b.km}
                  className={`rounded-[14px] p-2.5 border text-center flex flex-col justify-between min-h-[82px] ${
                    b.unlocked
                      ? 'bg-[var(--card)] border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-[var(--card)] border-[var(--divider)] text-[var(--muted)] opacity-65'
                  }`}
                >
                  <span className="font-display text-[20px] leading-none tabular-nums">
                    {b.km} km
                  </span>
                  <span className="text-[11px] leading-tight pt-2 block tabular-nums">
                    {b.unlocked ? 'Earned' : `${kmToGo} km to go`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Recent runs as a simple list with thin dividers */}
        <section aria-label="Recent runs" className="space-y-3">
          <h2 className="font-display text-[22px] text-[var(--text)] leading-none">
            Recent runs
          </h2>

          {recentRuns.length === 0 ? (
            <p className="text-[16px] text-[var(--muted)] py-3 border-y border-[var(--divider)]">
              No runs yet
            </p>
          ) : (
            <div className="divide-y divide-[var(--divider)] border-y border-[var(--divider)]">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="py-3.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-[16px] text-[var(--text)] tabular-nums">
                      {run.date}
                    </span>
                    <span className="text-[13px] text-[var(--muted)] ml-2">
                      · {run.type}
                    </span>
                  </div>
                  <span className="font-display text-[20px] text-[var(--accent)] tabular-nums">
                    {run.km} km
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Report profile option for signed-in viewers */}
        {currentUser && currentUser.uid !== user.uid && (
          <section className="pt-2 space-y-3">
            {!showReportForm ? (
              <button
                type="button"
                onClick={() => setShowReportForm(true)}
                className="text-[13px] text-[var(--muted)] underline cursor-pointer"
              >
                Report profile
              </button>
            ) : (
              <form onSubmit={handleReportSubmit} className="club-card p-4 space-y-3">
                <div className="font-display text-[22px] text-[var(--text)]">
                  Report Profile
                </div>
                <input
                  type="text"
                  required
                  maxLength={200}
                  placeholder="Reason (inappropriate bio, photo, or name)"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full h-[46px] club-input px-3"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="btn-primary"
                  >
                    {submittingReport ? 'Sending...' : 'Submit report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportForm(false)}
                    className="text-[13px] font-semibold text-[var(--muted)] underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {reportMsg && (
              <div className="text-[13px] font-semibold text-[var(--accent)]">
                {reportMsg}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
