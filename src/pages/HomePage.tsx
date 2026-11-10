import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import { Avatar } from '../components/Avatar';
import {
  CountUpKm,
  DoodleSquiggle,
  ProfileBannerPattern,
  ScrollRevealSection,
} from '../components/Doodles';
import { CollabCarousel } from '../components/CollabSlide';
import { formatEventDateChip } from './RunDetailPage';

const TICKER_TEXT = 'EVERY SUNDAY - RUN TOGETHER - ALL PACES - COFFEE AFTER - ';

export const formatPostedDate = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const WHY_POINTS = [
  {
    num: '01',
    title: 'Run together',
    copy: 'Start together and finish together every Sunday morning.',
  },
  {
    num: '02',
    title: 'All paces welcome',
    copy: 'Walk, jog, or run at the speed that feels good for you.',
  },
  {
    num: '03',
    title: 'Real friends',
    copy: 'Meet people across Rewa over morning miles and coffee.',
  },
  {
    num: '04',
    title: 'No judgement',
    copy: 'No pressure on pace or gear. Just show up and move.',
  },
];

const POLAROID_PHOTOS = [
  {
    src: '/club-photo.jpg',
    caption: 'Sunday morning crew in Rewa',
    alt: 'FRST Run Club group photo with banner in Rewa',
    tiltClass: '-rotate-2',
  },
  {
    src: '/club-photo-2.jpg',
    caption: 'Out of our comfort zone, together',
    alt: 'Crowd of FRST Run Club runners gathered after the run',
    tiltClass: 'rotate-2',
  },
  {
    src: '/club-photo-3.jpg',
    caption: 'Your city. Your people. Your pace.',
    alt: 'Car with FRST Run Club banner on a Sunday morning',
    tiltClass: '-rotate-1',
  },
];

function formatTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return 'tel:+919098176793';
  if (digits.startsWith('91') && digits.length === 12) {
    return `tel:+${digits}`;
  }
  return `tel:+91${digits}`;
}

export const HomePage: React.FC = () => {
  const {
    currentUser,
    events,
    activeCollabs,
    announcements,
    siteSettings,
    leaderboardAllTime,
    approvedRuns,
    loading,
  } = useClub();

  const [tickerPaused, setTickerPaused] = useState(false);

  // Polaroid stack tap-to-straighten state
  const [straightenedPolaroid, setStraightenedPolaroid] = useState<number | null>(null);

  const [featuredBannerErr, setFeaturedBannerErr] = useState(false);

  const topAnnouncement = announcements[0] || null;

  const nextEvent = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = events.filter((e) => {
      if (e.status === 'cancelled' || e.status === 'past') return false;
      if (e.status === 'upcoming') return true;
      return e.date >= today;
    });
    const featuredUpcoming = upcoming.find((e) => e.featured);
    if (featuredUpcoming) return featuredUpcoming;
    const anyFeatured = events.find(
      (e) => e.featured && e.status !== 'cancelled' && e.status !== 'past'
    );
    return anyFeatured || upcoming[0] || null;
  }, [events]);

  useEffect(() => {
    setFeaturedBannerErr(false);
  }, [nextEvent?.bannerUrl]);

  const totalClubKmNum = useMemo(() => {
    const total = approvedRuns.reduce((sum, r) => sum + Number(r.km || 0), 0);
    return Number(total.toFixed(1));
  }, [approvedRuns]);

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="h-[220px] club-card" />
      </div>
    );
  }

  const registerHref = nextEvent?.registrationUrl || siteSettings.registrationUrl;
  const whatsappHref =
    siteSettings.whatsappUrl || 'https://chat.whatsapp.com/JvATq4OmMoD41LqSPfKUwL';
  const instagramHref =
    siteSettings.instagramUrl || 'https://www.instagram.com/rewafrstrunclub/';
  const teamMembers = siteSettings.teamMembers || [];
  const contactPhones = siteSettings.contactPhones || ['90981 76793', '78287 79901'];

  return (
    <div className="overflow-x-hidden">
      {/* =========================================================
          TOP BAR: "FRST Run Club" wordmark on the left with a small
          city chip "Rewa". Right side: user's round profile photo.
         ========================================================= */}
      <header className="px-4 py-3.5 border-b border-[var(--divider)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-display text-[24px] text-[var(--text)] leading-none whitespace-nowrap">
            FRST Run Club
          </span>
          <span className="px-2 py-0.5 rounded-full border border-[var(--divider)] bg-[var(--card)] text-[12px] font-medium text-[var(--muted)] leading-tight">
            Rewa
          </span>
        </div>

        <Link
          to="/profile"
          aria-label="Open profile"
          className="shrink-0 rounded-full focus:outline-none"
        >
          <Avatar
            name={currentUser?.displayName || 'FRST Runner'}
            photoURL={currentUser?.photoURL}
            size="sm"
          />
        </Link>
      </header>

      {/* Top Pinned Club Announcement (when posted by admin) */}
      {topAnnouncement && (
        <div className="px-4 pt-4">
          <div
            aria-label="Club announcement"
            className="club-card p-3.5 space-y-1"
          >
            <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--muted)]">
              <span className="font-semibold text-[var(--accent)]">
                {topAnnouncement.pinned ? 'Pinned update' : 'Club update'}
              </span>
              <span className="tabular-nums">
                {formatPostedDate(topAnnouncement.createdAt)}
              </span>
            </div>
            <p className="text-[15px] text-[var(--text)] break-words">
              {topAnnouncement.text}
            </p>
          </div>
        </div>
      )}

      {/* =========================================================
          SECTION 1: HERO PHOTO + HEADLINE + REGISTER + LEADERBOARD
         ========================================================= */}
      <section
        aria-label="Hero"
        className="px-4 pt-4 pb-6 border-b border-[var(--divider)] space-y-5"
      >
        <div className="w-full h-[220px] overflow-hidden rounded-[14px] border border-[var(--divider)] bg-[var(--card)]">
          <img
            src="/club-photo.jpg"
            alt="FRST Run Club members gathered together with the club banner in Rewa"
            style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
            className="w-full h-full block"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <h1 className="font-display text-[46px] text-[var(--text)] leading-[0.98]">
              More than a pace.
            </h1>
            <div className="pt-0.5">
              <DoodleSquiggle className="w-44 h-3" />
            </div>
            <p className="text-[16px] text-[var(--muted)] pt-1">
              We run together every Sunday morning in Rewa.
            </p>
          </div>

          <div className="space-y-2.5">
            {registerHref ? (
              <a
                href={registerHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full btn-primary"
              >
                Register
              </a>
            ) : (
              <Link to="/runs" className="w-full btn-primary">
                Register
              </Link>
            )}

            <div>
              <Link
                to="/board"
                className="inline-block text-[14px] font-semibold text-[var(--accent)] underline py-1"
              >
                See leaderboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 2: COLLAB SLIDE (Motion graphics slide, swipeable,
          tapping the slide opens the event details page)
         ========================================================= */}
      {activeCollabs.length > 0 && (
        <ScrollRevealSection
          ariaLabel="Club collaborations"
          className="px-4 py-6 border-b border-[var(--divider)]"
        >
          <CollabCarousel
            collabs={activeCollabs}
            targetHref={nextEvent ? `/runs/${nextEvent.id}` : '/runs'}
          />
        </ScrollRevealSection>
      )}

      {/* =========================================================
          SECTION 3: "THIS SUNDAY" FEATURED CARD (above the stats)
         ========================================================= */}
      <ScrollRevealSection
        ariaLabel="This Sunday"
        className="px-4 py-6 border-b border-[var(--divider)] space-y-3.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h2 className="font-display text-[28px] text-[var(--text)] leading-none">
              This Sunday
            </h2>
            <DoodleSquiggle className="w-28 h-2.5" />
          </div>
          {nextEvent && (
            <span className="text-[12px] font-medium text-[var(--muted)] pt-1">
              {nextEvent.city || 'Rewa'}
            </span>
          )}
        </div>

        {nextEvent ? (
          <div className="club-card overflow-hidden">
            {/* Banner or calm doodle pattern in accent colour */}
            <Link
              to={`/runs/${nextEvent.id}`}
              aria-label={`Open details for ${nextEvent.title}`}
              className="block w-full h-[148px] border-b border-[var(--divider)] bg-[var(--bg)] overflow-hidden"
            >
              {nextEvent.bannerUrl && !featuredBannerErr ? (
                <img
                  src={nextEvent.bannerUrl}
                  alt={`${nextEvent.title} banner`}
                  referrerPolicy="no-referrer"
                  onError={() => setFeaturedBannerErr(true)}
                  className="w-full h-full object-cover block"
                />
              ) : (
                <ProfileBannerPattern />
              )}
            </Link>

            <div className="p-4 space-y-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-[var(--accent)] tabular-nums">
                    {formatEventDateChip(nextEvent.date)} · {nextEvent.time}
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--text)] tabular-nums">
                    {nextEvent.mainRunLabel || `${nextEvent.distanceKm}K`}
                  </span>
                </div>

                <h3 className="font-display text-[25px] text-[var(--text)] leading-tight break-words">
                  {nextEvent.title}
                </h3>

                <p className="text-[14px] text-[var(--muted)] break-words">
                  {nextEvent.venueName || nextEvent.venue}
                </p>
              </div>

              <Link
                to={`/runs/${nextEvent.id}`}
                className="w-full btn-secondary"
              >
                See details
              </Link>
            </div>
          </div>
        ) : (
          <div className="club-card p-4 flex items-center justify-between gap-2">
            <p className="text-[16px] text-[var(--muted)]">
              No upcoming runs. Check back soon.
            </p>
            <span className="text-[12px] text-[var(--muted)] shrink-0">Rewa</span>
          </div>
        )}
      </ScrollRevealSection>

      {/* =========================================================
          SECTION 4: STATS ROW (Runners, Runs, Total km)
         ========================================================= */}
      <ScrollRevealSection
        ariaLabel="Club statistics"
        className="px-4 py-6 border-b border-[var(--divider)]"
      >
        <div className="grid grid-cols-3 gap-2.5">
          <div className="club-card p-3.5 flex flex-col justify-between min-w-0">
            <span className="text-[13px] text-[var(--muted)] truncate">Runners</span>
            <span className="font-display text-[28px] text-[var(--text)] tabular-nums leading-tight pt-1">
              <CountUpKm value={leaderboardAllTime.length} decimals={0} />
            </span>
          </div>

          <div className="club-card p-3.5 flex flex-col justify-between min-w-0">
            <span className="text-[13px] text-[var(--muted)] truncate">Runs</span>
            <span className="font-display text-[28px] text-[var(--text)] tabular-nums leading-tight pt-1">
              <CountUpKm value={approvedRuns.length} decimals={0} />
            </span>
          </div>

          <div className="club-card p-3.5 flex flex-col justify-between min-w-0">
            <span className="text-[13px] text-[var(--muted)] truncate">Total km</span>
            <span className="font-display text-[28px] text-[var(--accent)] tabular-nums leading-tight pt-1">
              <CountUpKm value={totalClubKmNum} decimals={1} />
            </span>
          </div>
        </div>
      </ScrollRevealSection>

      {/* =========================================================
          SECTION 5: SLOW TICKER STRIP (Pause on tap)
         ========================================================= */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={tickerPaused}
        aria-label={tickerPaused ? 'Resume scrolling ticker' : 'Pause scrolling ticker'}
        onClick={() => setTickerPaused((p) => !p)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setTickerPaused((p) => !p);
          }
        }}
        className="w-full overflow-hidden bg-[var(--divider)] border-b border-[var(--divider)] py-2.5 cursor-pointer select-none"
      >
        <div
          className={`animate-ticker label-sm whitespace-nowrap ${
            tickerPaused ? 'animate-ticker-paused' : ''
          }`}
        >
          <span className="px-2">{TICKER_TEXT.repeat(4)}</span>
          <span className="px-2" aria-hidden="true">
            {TICKER_TEXT.repeat(4)}
          </span>
        </div>
      </div>

      {/* =========================================================
          SECTION 6: "WHY FRST" WITH CLUB-PHOTO-2.JPG & 4 SHORT POINTS
         ========================================================= */}
      <ScrollRevealSection
        ariaLabel="Why FRST"
        className="px-4 py-6 border-b border-[var(--divider)] space-y-4"
      >
        <h2 className="font-display text-[30px] text-[var(--text)] leading-none">
          Why FRST
        </h2>

        <div className="w-full h-[210px] overflow-hidden rounded-[14px] border border-[var(--divider)] bg-[var(--card)]">
          <img
            src="/club-photo-2.jpg"
            alt="Crowd of FRST Run Club runners smiling together after a morning run"
            loading="lazy"
            style={{ objectFit: 'cover', objectPosition: 'center 72%' }}
            className="w-full h-full block"
          />
        </div>

        <div className="divide-y divide-[var(--divider)] border-y border-[var(--divider)]">
          {WHY_POINTS.map((pt) => (
            <div key={pt.num} className="py-3.5 flex items-start gap-3">
              <span className="text-[13px] font-semibold text-[var(--accent)] tabular-nums pt-0.5 shrink-0">
                {pt.num}
              </span>
              <div className="space-y-0.5 min-w-0">
                <div className="font-display text-[21px] text-[var(--text)] leading-tight">
                  {pt.title}
                </div>
                <p className="text-[15px] text-[var(--muted)]">{pt.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollRevealSection>

      {/* =========================================================
          SECTION 7: PHOTOS AS A SMALL STACK OF POLAROID-STYLE PICTURES
          WITH A SLIGHT TILT THAT STRAIGHTENS ON TAP
         ========================================================= */}
      <ScrollRevealSection
        ariaLabel="Club photos"
        className="px-4 py-6 border-b border-[var(--divider)] space-y-4"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-[28px] text-[var(--text)] leading-none">
            Sunday Mornings
          </h2>
          <span className="text-[13px] text-[var(--muted)]">Tap a photo</span>
        </div>

        <div className="space-y-4 py-1">
          {POLAROID_PHOTOS.map((photo, idx) => {
            const isStraight = straightenedPolaroid === idx;
            return (
              <button
                key={photo.src}
                type="button"
                onClick={() =>
                  setStraightenedPolaroid((prev) => (prev === idx ? null : idx))
                }
                className={`w-full text-left bg-[var(--card)] border border-[var(--divider)] rounded-[14px] p-3 pb-4 transition-transform duration-300 cursor-pointer block ${
                  isStraight ? 'rotate-0 scale-[1.01]' : photo.tiltClass
                }`}
              >
                <div className="w-full h-[185px] overflow-hidden rounded-[10px] bg-[var(--bg)]">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    loading="lazy"
                    className="w-full h-full object-cover block"
                  />
                </div>
                <p className="text-[14px] font-medium text-[var(--text)] pt-2.5 px-1">
                  {photo.caption}
                </p>
              </button>
            );
          })}
        </div>
      </ScrollRevealSection>

      {/* =========================================================
          SECTION 8: "MORE CITIES SOON"
         ========================================================= */}
      <ScrollRevealSection
        ariaLabel="More cities soon"
        className="px-4 py-6 border-b border-[var(--divider)]"
      >
        <div className="club-card p-4 space-y-3.5">
          <div className="space-y-1">
            <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
              More cities soon
            </h2>
            <p className="text-[16px] text-[var(--muted)]">
              We are starting in Rewa. More cities are coming.
            </p>
          </div>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full btn-secondary text-center"
          >
            Want FRST in your city? Message us
          </a>
        </div>
      </ScrollRevealSection>

      {/* =========================================================
          SECTION 9: JOIN SECTION WITH CLUB-PHOTO-3.JPG
         ========================================================= */}
      <ScrollRevealSection
        ariaLabel="Join the community"
        className="px-4 py-6 border-b border-[var(--divider)] space-y-4"
      >
        <div className="w-full h-[210px] overflow-hidden rounded-[14px] border border-[var(--divider)] bg-[var(--card)]">
          <img
            src="/club-photo-3.jpg"
            alt="FRST Run Club car draped with the club banner on Sunday morning"
            loading="lazy"
            style={{ objectFit: 'cover', objectPosition: 'center 68%' }}
            className="w-full h-full block"
          />
        </div>

        <div className="space-y-2.5">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full btn-secondary"
          >
            Join the WhatsApp community
          </a>

          <a
            href={instagramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full btn-secondary"
          >
            Follow on Instagram
          </a>
        </div>
      </ScrollRevealSection>

      {/* =========================================================
          SECTION 10: TEAM AND CONTACT
         ========================================================= */}
      <ScrollRevealSection
        ariaLabel="Team and contact"
        className="px-4 py-6 border-b border-[var(--divider)] space-y-5"
      >
        <div className="space-y-3">
          <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
            Team
          </h2>

          <div className="divide-y divide-[var(--divider)] border-y border-[var(--divider)]">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="py-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    name={member.name}
                    photoURL={member.photoURL}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="font-display text-[20px] text-[var(--text)] leading-tight truncate">
                      {member.name}
                    </div>
                    <div className="text-[13px] text-[var(--muted)]">
                      {member.role}
                    </div>
                  </div>
                </div>

                <a
                  href={member.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-semibold text-[var(--accent)] underline shrink-0"
                >
                  Instagram
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[14px] font-medium text-[var(--muted)]">
            Contact us for more info
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {contactPhones.map((phone) => (
              <a
                key={phone}
                href={formatTelHref(phone)}
                className="text-[16px] font-semibold text-[var(--accent)] underline tabular-nums"
              >
                {phone}
              </a>
            ))}
          </div>
        </div>
      </ScrollRevealSection>

      {/* =========================================================
          SECTION 11: FOOTER
         ========================================================= */}
      <footer className="px-4 py-8 space-y-2 text-[13px] text-[var(--muted)]">
        <div className="font-display text-[22px] text-[var(--text)] leading-none">
          FRST Run Club
        </div>
        <div>Rewa, Madhya Pradesh · Every Sunday morning</div>
        <div className="pt-1 text-[12px] text-[var(--muted)]">
          Web app by mans.ctrl
        </div>
      </footer>
    </div>
  );
};
