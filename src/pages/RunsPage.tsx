import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useClub } from '../context/ClubContext';
import { ClubEvent } from '../types';
import { DoodleShoe, ScrollRevealSection } from '../components/Doodles';

export const RunsPage: React.FC = () => {
  const { events, siteSettings, loading } = useClub();

  const today = new Date().toISOString().slice(0, 10);
  const upcomingRuns = events.filter((e) => {
    if (e.status === 'cancelled' || e.status === 'past') return false;
    if (e.status === 'upcoming') return true;
    return e.date >= today;
  });
  const pastRuns = events
    .filter((e) => e.status === 'past' || (!e.status && e.date < today))
    .reverse();
  const nextRun = upcomingRuns[0] || null;

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="h-24 club-card" />
      </div>
    );
  }

  const renderRunItem = (evt: ClubEvent, isUpcoming: boolean, idx: number) => (
    <Link
      key={evt.id}
      to={`/runs/${evt.id}`}
      style={{ animationDelay: `${idx * 40}ms` }}
      className="animate-row-slide club-card p-4 flex items-center justify-between gap-3"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {isUpcoming && idx === 0 && (
            <span className="label-sm text-[var(--accent)]">Next run</span>
          )}
          <span className="font-display text-[22px] text-[var(--text)] leading-tight truncate">
            {evt.title}
          </span>
        </div>
        <div className="text-small font-medium text-[var(--muted)] tabular-nums">
          {evt.date} • {evt.time}
        </div>
        <div className="text-[16px] text-[var(--text)] truncate">{evt.venue}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-display text-[20px] text-[var(--accent)] tabular-nums">
          {evt.distanceKm} KM
        </span>
        <ChevronRight className="w-5 h-5 text-[var(--muted)]" />
      </div>
    </Link>
  );

  return (
    <div className="px-4 py-6 space-y-6 overflow-x-hidden">
      {/* Header (1 subtle doodle per screen: DoodleShoe) */}
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="label-sm block">Schedule</span>
          <h1 className="font-display text-[34px] text-[var(--text)] leading-none">
            Club Runs
          </h1>
          <p className="text-[16px] text-[var(--muted)] pt-1">
            Tap any run for route details, entry fees, and registration.
          </p>
        </div>
        <DoodleShoe className="w-10 h-7 mt-1" />
      </header>

      <ScrollRevealSection ariaLabel="Upcoming runs" className="space-y-3">
        <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
          Upcoming Runs
        </h2>

        {upcomingRuns.length === 0 ? (
          <div className="club-card p-4">
            <p className="text-[16px] text-[var(--muted)]">
              No upcoming runs. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingRuns.map((evt, idx) => renderRunItem(evt, true, idx))}
          </div>
        )}
      </ScrollRevealSection>

      {/* Main action button (1 per screen) */}
      {nextRun && (nextRun.registrationUrl || siteSettings.registrationUrl) && (
        <a
          href={nextRun.registrationUrl || siteSettings.registrationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full btn-primary"
        >
          Register for next run
        </a>
      )}

      <ScrollRevealSection ariaLabel="Past runs" className="space-y-3 pt-2 border-t border-[var(--divider)]">
        <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
          Past Runs
        </h2>
        {pastRuns.length === 0 ? (
          <div className="club-card p-4">
            <p className="text-[16px] text-[var(--muted)]">No runs yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastRuns.map((evt, idx) => renderRunItem(evt, false, idx))}
          </div>
        )}
      </ScrollRevealSection>
    </div>
  );
};
