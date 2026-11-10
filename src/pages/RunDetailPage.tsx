import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Share2 } from 'lucide-react';
import { useClub } from '../context/ClubContext';
import { ClubEvent } from '../types';
import {
  ActivityHandDrawnIcon,
  DoodleSquiggle,
  ProfileBannerPattern,
} from '../components/Doodles';
import { getPartnerInitials } from '../components/CollabSlide';

export function formatEventDateChip(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dateStr;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function formatEventDateLong(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dateStr;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function resolveEventFeeDisplay(event: ClubEvent): string {
  const customFee = (event.feeText || '').trim();
  if (customFee) return customFee;
  const male = Number(event.fee?.male) || 0;
  const female = Number(event.fee?.female) || 0;
  const couple = Number(event.fee?.couple) || 0;
  if (male > 0 || female > 0 || couple > 0) {
    const parts: string[] = [];
    if (male > 0) parts.push(`Male Rs ${male}`);
    if (female > 0) parts.push(`Female Rs ${female}`);
    if (couple > 0) parts.push(`Couple Rs ${couple}`);
    return parts.join(' · ');
  }
  return '';
}

interface EventDetailViewProps {
  event: ClubEvent;
  isPreview?: boolean;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({
  event,
  isPreview = false,
}) => {
  const [bannerImgError, setBannerImgError] = useState(false);
  const [mentionLogoError, setMentionLogoError] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const dateChip = formatEventDateChip(event.date);
  const timeChip = (event.time || '').trim();
  const mainRunText =
    (event.mainRunLabel || '').trim() ||
    (event.distanceKm > 0 ? `${event.distanceKm}K community run` : '');
  const distanceChip =
    event.distanceKm > 0
      ? `${event.distanceKm}K`
      : (event.mainRunLabel || '').trim();

  const introText = (event.intro || event.description || '').trim();
  const venueDisplay = (event.venueName || event.venue || '').trim();
  const venueMapHref = (event.venueMapUrl || '').trim();
  const feeDisplay = resolveEventFeeDisplay(event);
  const registerHref = (event.registrationUrl || '').trim();

  const activities = (event.activities || []).filter(
    (a) => (a.name || '').trim().length > 0
  );
  const perks = (event.perks || []).filter((p) => p.trim().length > 0);

  const mentionTitle = (event.specialMentionTitle || '').trim();
  const mentionText = (event.specialMentionText || '').trim();
  const mentionLogo = (event.specialMentionLogoUrl || '').trim();
  const hasSpecialMention = Boolean(mentionTitle || mentionText);

  const safetyNote = (event.safetyNote || '').trim();

  const hasDetailsSection = Boolean(
    venueDisplay || dateChip || timeChip || mainRunText || feeDisplay
  );

  const handleShare = async () => {
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/runs/${event.id || 'evt_vijay_vilas_turf'}`
        : '';
    const shareData = {
      title: event.title || 'FRST Run Club',
      text: introText || `${event.title} · ${dateChip} ${timeChip}`,
      url: shareUrl,
    };

    try {
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share(shareData);
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.name : '';
      if (msg === 'AbortError') return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback('Link copied');
        window.setTimeout(() => setShareFeedback(null), 2500);
      }
    } catch {
      setShareFeedback('Could not copy link');
      window.setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Photo with rounded corners (or calm doodle pattern in accent colour if none) */}
      <div className="w-full h-[190px] rounded-[14px] border border-[var(--divider)] bg-[var(--card)] overflow-hidden">
        {event.bannerUrl && !bannerImgError ? (
          <img
            src={event.bannerUrl}
            alt={`${event.title} banner`}
            referrerPolicy="no-referrer"
            onError={() => setBannerImgError(true)}
            className="w-full h-full object-cover block"
          />
        ) : (
          <ProfileBannerPattern />
        )}
      </div>

      {/* Title + Date chip, Time chip, and Distance chip */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {dateChip && (
            <span className="px-2.5 py-1 rounded-full border border-[var(--divider)] bg-[var(--card)] text-[12px] font-semibold text-[var(--accent)] tabular-nums">
              {dateChip}
            </span>
          )}
          {timeChip && (
            <span className="px-2.5 py-1 rounded-full border border-[var(--divider)] bg-[var(--card)] text-[12px] font-medium text-[var(--text)] tabular-nums">
              {timeChip}
            </span>
          )}
          {distanceChip && (
            <span className="px-2.5 py-1 rounded-full border border-[var(--divider)] bg-[var(--card)] text-[12px] font-semibold text-[var(--text)] tabular-nums">
              {distanceChip}
            </span>
          )}
          {event.city && (
            <span className="px-2.5 py-1 rounded-full border border-[var(--divider)] bg-[var(--bg)] text-[12px] font-medium text-[var(--muted)]">
              {event.city}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <h1 className="font-display text-[32px] text-[var(--text)] leading-[1.05] break-words">
            {event.title || 'Untitled Run'}
          </h1>
          <DoodleSquiggle className="w-36 h-3" />
        </div>

        {/* Short Intro */}
        {introText && (
          <p className="text-[16px] text-[var(--muted)] leading-relaxed break-words pt-0.5">
            {introText}
          </p>
        )}
      </div>

      {/* Details List with thin dividers */}
      {hasDetailsSection && (
        <section aria-label="Event details" className="space-y-2.5">
          <h2 className="font-display text-[24px] text-[var(--text)] leading-none">
            Details
          </h2>
          <div className="club-card divide-y divide-[var(--divider)] px-4">
            {venueDisplay && (
              <div className="py-3.5 flex items-start justify-between gap-4">
                <span className="label-sm shrink-0 pt-0.5">Venue</span>
                {venueMapHref ? (
                  <a
                    href={venueMapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[15px] font-semibold text-[var(--accent)] underline text-right inline-flex items-center gap-1 break-words"
                  >
                    <span>{venueDisplay}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <span className="text-[15px] font-medium text-[var(--text)] text-right break-words">
                    {venueDisplay}
                  </span>
                )}
              </div>
            )}

            {(event.date || timeChip) && (
              <div className="py-3.5 flex items-start justify-between gap-4">
                <span className="label-sm shrink-0 pt-0.5">Date and time</span>
                <span className="text-[15px] font-medium text-[var(--text)] text-right tabular-nums">
                  {[formatEventDateLong(event.date), timeChip]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            )}

            {mainRunText && (
              <div className="py-3.5 flex items-start justify-between gap-4">
                <span className="label-sm shrink-0 pt-0.5">Main run</span>
                <span className="text-[15px] font-semibold text-[var(--accent)] text-right break-words">
                  {mainRunText}
                </span>
              </div>
            )}

            {feeDisplay && (
              <div className="py-3.5 flex items-start justify-between gap-4">
                <span className="label-sm shrink-0 pt-0.5">Fee</span>
                <span className="text-[15px] font-medium text-[var(--text)] text-right tabular-nums break-words">
                  {feeDisplay}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* "After the run" Section: 2-column tiles with hand-drawn icons in accent colour, staggered 40ms apart */}
      {activities.length > 0 && (
        <section aria-label="After the run" className="space-y-3">
          <h2 className="font-display text-[24px] text-[var(--text)] leading-none">
            After the run
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {activities.map((act, idx) => {
              const isLastOdd =
                activities.length % 2 === 1 && idx === activities.length - 1;
              return (
                <div
                  key={`${act.name}-${idx}`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className={`animate-row-slide club-card p-3.5 flex flex-col justify-between gap-2 min-w-0 ${
                    isLastOdd ? 'col-span-2' : ''
                  }`}
                >
                  <ActivityHandDrawnIcon
                    name={act.name}
                    index={idx}
                    className="w-6 h-6"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-display text-[19px] text-[var(--text)] leading-tight break-words">
                      {act.name}
                    </div>
                    {act.detail && act.detail.trim() && (
                      <p className="text-[13px] text-[var(--muted)] leading-snug break-words">
                        {act.detail}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Optional legacy Perks list if present and no activities */}
      {activities.length === 0 && perks.length > 0 && (
        <section aria-label="What is included" className="space-y-2.5">
          <h2 className="font-display text-[24px] text-[var(--text)] leading-none">
            What&apos;s Included
          </h2>
          <ol className="club-card divide-y divide-[var(--divider)] px-4">
            {perks.map((perk, idx) => (
              <li
                key={idx}
                className="py-3 text-[15px] text-[var(--text)] flex items-center gap-3"
              >
                <span className="text-small font-bold text-[var(--accent)] tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span>{perk}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* "Special mention" Card: logo or initials, title, and text */}
      {hasSpecialMention && (
        <section aria-label="Special mention" className="space-y-2.5">
          <span className="label-sm block">Special mention</span>
          <div className="club-card p-4 flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-[12px] border border-[var(--divider)] bg-[var(--bg)] flex items-center justify-center overflow-hidden shrink-0">
              {mentionLogo && !mentionLogoError ? (
                <img
                  src={mentionLogo}
                  alt={mentionTitle || 'Sponsor logo'}
                  referrerPolicy="no-referrer"
                  onError={() => setMentionLogoError(true)}
                  className="w-full h-full object-cover block"
                />
              ) : (
                <span className="font-display text-[18px] text-[var(--accent)] leading-none">
                  {getPartnerInitials(mentionTitle || 'SM')}
                </span>
              )}
            </div>
            <div className="space-y-1 min-w-0">
              {mentionTitle && (
                <h3 className="font-display text-[22px] text-[var(--text)] leading-tight break-words">
                  {mentionTitle}
                </h3>
              )}
              {mentionText && (
                <p className="text-[14px] text-[var(--muted)] leading-snug break-words">
                  {mentionText}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Safety Note in a muted bordered box */}
      {safetyNote && (
        <div
          role="note"
          aria-label="Safety note"
          className="rounded-[12px] border border-[var(--divider)] bg-[var(--bg)] p-3.5 text-[13px] text-[var(--muted)] leading-relaxed break-words"
        >
          {safetyNote}
        </div>
      )}

      {/* Sticky Bottom Bar with Register (when registrationUrl is set) and Share */}
      <div
        className={
          isPreview
            ? 'pt-2 border-t border-[var(--divider)] flex items-center gap-2.5'
            : 'sticky bottom-[60px] z-30 -mx-4 px-4 py-3 bg-[var(--bg)]/95 backdrop-blur-sm border-t border-[var(--divider)] flex items-center gap-2.5'
        }
      >
        {registerHref && event.status !== 'cancelled' && event.status !== 'past' && (
          <a
            href={registerHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 btn-primary"
          >
            Register
          </a>
        )}

        <button
          type="button"
          onClick={handleShare}
          className={`${
            registerHref && event.status !== 'cancelled' && event.status !== 'past'
              ? 'btn-secondary shrink-0 px-4'
              : 'w-full btn-secondary'
          } inline-flex items-center justify-center gap-2`}
        >
          <Share2 className="w-4 h-4 text-[var(--accent)]" />
          <span>{shareFeedback || 'Share'}</span>
        </button>
      </div>
    </div>
  );
};

export const RunDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { events } = useClub();

  const event = events.find((e) => e.id === id);

  if (!event) {
    return (
      <div className="px-4 py-6 space-y-4">
        <Link
          to="/runs"
          className="min-h-[44px] inline-flex items-center gap-1.5 text-small font-semibold text-[var(--accent)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to runs</span>
        </Link>
        <div className="club-card p-4 space-y-1.5">
          <h1 className="font-display text-[28px] text-[var(--text)]">
            Run Not Found
          </h1>
          <p className="text-[16px] text-[var(--muted)]">
            This run could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-4 overflow-x-hidden">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/runs"
          className="min-h-[40px] inline-flex items-center gap-1.5 text-small font-semibold text-[var(--accent)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All runs</span>
        </Link>
        {event.featured && (
          <span className="label-sm text-[var(--accent)]">This Sunday</span>
        )}
      </div>

      <EventDetailView event={event} />
    </div>
  );
};
