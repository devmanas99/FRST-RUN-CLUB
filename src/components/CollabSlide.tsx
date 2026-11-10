import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollabEntry } from '../types';

export function getPartnerInitials(name: string): string {
  const clean = (name || '').trim();
  if (!clean) return 'P';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function splitCollabTitle(
  title: string,
  partnerName: string
): { leftTitle: string; rightTitle: string } {
  const raw = (title || '').trim();
  const FallbackPartner = (partnerName || 'PARTNER').trim().toUpperCase();
  if (!raw) {
    return {
      leftTitle: FallbackPartner,
      rightTitle: 'FRST RUN CLUB',
    };
  }

  const parts = raw.split(/\s+[xX×]\s+/);
  if (parts.length >= 2) {
    const left = parts[0].trim();
    const right = parts.slice(1).join(' X ').trim();
    return {
      leftTitle: left || FallbackPartner,
      rightTitle: right || 'FRST RUN CLUB',
    };
  }

  return {
    leftTitle: raw,
    rightTitle: 'FRST RUN CLUB',
  };
}

interface CollabSlideCardProps {
  collab: Pick<CollabEntry, 'partnerName' | 'logoUrl' | 'title' | 'dateLabel'>;
  isActiveSlide?: boolean;
  animKey?: number;
  paused?: boolean;
  targetHref?: string;
}

export const CollabSlideCard: React.FC<CollabSlideCardProps> = ({
  collab,
  isActiveSlide = true,
  animKey = 0,
  paused = false,
  targetHref,
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [collab.logoUrl]);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setInView(true);
      return;
    }

    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
          } else {
            setInView(false);
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const shouldAnimate = inView && isActiveSlide;

  const { leftTitle, rightTitle } = useMemo(
    () => splitCollabTitle(collab.title, collab.partnerName),
    [collab.title, collab.partnerName]
  );

  const initials = useMemo(
    () => getPartnerInitials(collab.partnerName || leftTitle),
    [collab.partnerName, leftTitle]
  );

  const cleanDateChip = (collab.dateLabel || '').trim();
  const partnerTickerLabel = (collab.partnerName || leftTitle || 'PARTNER')
    .trim()
    .toUpperCase();
  const tickerSegment = `${partnerTickerLabel}  ·  FRST RUN CLUB  ·  `;

  const handleCardActivate = () => {
    if (targetHref) {
      navigate(targetHref);
    }
  };

  return (
    <div
      ref={cardRef}
      role={targetHref ? 'link' : undefined}
      tabIndex={targetHref ? 0 : undefined}
      onClick={targetHref ? handleCardActivate : undefined}
      onKeyDown={
        targetHref
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardActivate();
              }
            }
          : undefined
      }
      className={`w-full min-h-[220px] rounded-[14px] border border-[var(--divider)] bg-[var(--dark-bg)] text-[var(--dark-text)] overflow-hidden relative flex flex-col justify-between select-none ${
        targetHref ? 'cursor-pointer active:scale-[0.995] transition-transform' : ''
      }`}
    >
      {/* Subtle Ambient Floating Doodles (accent colour only, 6px float over 4s) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Doodle 1: Tiny 4-point star (top-left area) */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`w-4 h-4 absolute top-3.5 left-3.5 text-[var(--accent)] opacity-75 collab-float-1 ${
            paused ? 'collab-paused' : ''
          }`}
        >
          <path
            d="M12 2.5 L14.1 9.9 L21.5 12 L14.1 14.1 L12 21.5 L9.9 14.1 L2.5 12 L9.9 9.9 Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Doodle 2: Tiny running shoe (top-right area) */}
        <svg
          viewBox="0 0 36 22"
          fill="none"
          className={`w-6 h-4 absolute top-3.5 right-3.5 text-[var(--accent)] opacity-75 collab-float-2 ${
            paused ? 'collab-paused' : ''
          }`}
        >
          <path
            d="M4 15.5 C4 12 6.5 9 9.5 8.5 L13.5 11.5 C16.5 12 20.5 11.5 23.5 9.5 L26 12 C29.5 12.5 32.5 14 33 16.5 L3 16.5 Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 19 H33"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>

        {/* Doodle 3: Tiny sparkle (bottom-right above ticker) */}
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={`w-3.5 h-3.5 absolute bottom-9 right-4 text-[var(--accent)] opacity-70 collab-float-3 ${
            paused ? 'collab-paused' : ''
          }`}
        >
          <path
            d="M10 2 V18 M2 10 H18 M4.8 4.8 L15.2 15.2 M15.2 4.8 L4.8 15.2"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Main Content Container */}
      <div
        key={`${animKey}-${shouldAnimate ? 'active' : 'idle'}`}
        className="relative z-10 px-4 pt-3.5 pb-2.5 flex-1 flex flex-col items-center justify-center text-center gap-2.5"
      >
        {/* Optional Date Chip */}
        {cleanDateChip && (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-[#35322E] bg-[#252320] text-[11px] font-semibold tracking-[0.06em] uppercase text-[var(--accent)]">
            {cleanDateChip}
          </div>
        )}

        {/* Badges Row: Partner Logo Badge + FRST Logo Badge above the names */}
        <div className="flex items-center justify-center gap-3">
          {/* Partner Badge */}
          <div
            className="w-11 h-11 rounded-[12px] border border-[#35322E] bg-[#252320] flex items-center justify-center overflow-hidden shrink-0"
            title={collab.partnerName || leftTitle}
          >
            {collab.logoUrl && !logoError ? (
              <img
                src={collab.logoUrl}
                alt={`${collab.partnerName || leftTitle} logo`}
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-full h-full object-cover block"
              />
            ) : (
              <span className="font-display text-[17px] text-[var(--dark-text)] tracking-wide leading-none">
                {initials}
              </span>
            )}
          </div>

          <span className="text-[11px] font-semibold text-[var(--dark-muted)] uppercase tracking-widest">
            ×
          </span>

          {/* FRST Badge */}
          <div
            className="w-11 h-11 rounded-[12px] border border-[#35322E] bg-[#252320] flex flex-col items-center justify-center shrink-0"
            title="FRST Run Club"
          >
            <span className="font-display text-[14px] text-[var(--dark-text)] leading-none tracking-wider">
              FRST
            </span>
            <span className="w-4 h-[2px] bg-[var(--accent)] mt-1 rounded-full" />
          </div>
        </div>

        {/* Animated Split Title: Partner slides from left, Hand-drawn X draws in center, FRST RUN CLUB slides from right */}
        <div className="w-full max-w-full flex flex-col items-center justify-center pt-0.5">
          <h3
            aria-label={collab.title || `${leftTitle} X ${rightTitle}`}
            className="w-full flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-display text-[22px] sm:text-[24px] leading-[1.08] text-[var(--dark-text)] px-1"
          >
            {/* Left Name: Partner */}
            <span
              className={`inline-block break-words max-w-full ${
                shouldAnimate ? 'collab-enter-left' : 'collab-hidden-left'
              }`}
            >
              {leftTitle}
            </span>

            {/* Center Hand-Drawn X */}
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center w-5 h-5 shrink-0 mx-0.5"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path
                  d="M4 4 C9 9, 15 15, 20 20 M20 4 C15 9, 9 15, 4 20"
                  stroke="var(--accent)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  pathLength={100}
                  className={shouldAnimate ? 'collab-enter-x' : 'collab-hidden-stroke'}
                />
              </svg>
            </span>

            {/* Right Name: FRST RUN CLUB */}
            <span
              className={`inline-block break-words max-w-full ${
                shouldAnimate ? 'collab-enter-right' : 'collab-hidden-right'
              }`}
            >
              {rightTitle}
            </span>
          </h3>

          {/* Thin Hand-Drawn Underline across under both names */}
          <svg
            viewBox="0 0 240 8"
            fill="none"
            aria-hidden="true"
            className="w-48 max-w-[82%] h-2 mt-1.5"
          >
            <path
              d="M4 4.5 Q120 2, 236 4.5"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              pathLength={100}
              className={
                shouldAnimate ? 'collab-enter-underline' : 'collab-hidden-stroke'
              }
            />
          </svg>
        </div>
      </div>

      {/* Bottom Slow Horizontal Ticker Strip */}
      <div className="relative z-10 border-t border-[#2E2B27] bg-[#161514]/60 py-1.5 overflow-hidden">
        <div
          className={`collab-ticker-track text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--dark-muted)] whitespace-nowrap ${
            paused ? 'collab-paused' : ''
          }`}
        >
          <span className="px-2">{tickerSegment.repeat(4)}</span>
          <span className="px-2" aria-hidden="true">
            {tickerSegment.repeat(4)}
          </span>
        </div>
      </div>
    </div>
  );
};

interface CollabCarouselProps {
  collabs: CollabEntry[];
  targetHref?: string;
}

export const CollabCarousel: React.FC<CollabCarouselProps> = ({
  collabs,
  targetHref,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animCounter, setAnimCounter] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const count = collabs.length;
  const isMultiple = count > 1;

  // Keep index in bounds when collabs list changes
  useEffect(() => {
    if (count === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= count) {
      setCurrentIndex(0);
    }
  }, [count, currentIndex]);

  const scrollToSlide = (idx: number) => {
    setCurrentIndex(idx);
    setAnimCounter((c) => c + 1);
    const container = trackRef.current;
    if (container && container.clientWidth > 0) {
      container.scrollTo({
        left: idx * container.clientWidth,
        behavior: 'smooth',
      });
    }
  };

  // Auto-advance every 6 seconds when there are multiple collabs and not paused
  useEffect(() => {
    if (!isMultiple || paused) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIdx = (prev + 1) % count;
        setAnimCounter((c) => c + 1);
        const container = trackRef.current;
        if (container && container.clientWidth > 0) {
          container.scrollTo({
            left: nextIdx * container.clientWidth,
            behavior: 'smooth',
          });
        }
        return nextIdx;
      });
    }, 6000);

    return () => window.clearInterval(timer);
  }, [isMultiple, paused, count]);

  const handleScroll = () => {
    const container = trackRef.current;
    if (!container || container.clientWidth === 0) return;
    const idx = Math.round(container.scrollLeft / container.clientWidth);
    if (idx >= 0 && idx < count && idx !== currentIndex) {
      setCurrentIndex(idx);
      setAnimCounter((c) => c + 1);
    }
  };

  if (count === 0) {
    return null;
  }

  // Single collab: no dots, no auto-advance, ambient motion running
  if (count === 1) {
    return (
      <div
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <CollabSlideCard
          collab={collabs[0]}
          isActiveSlide={true}
          animKey={animCounter}
          paused={paused}
          targetHref={targetHref}
        />
      </div>
    );
  }

  return (
    <div
      className="space-y-2.5"
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onTouchCancel={() => setPaused(false)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Swipeable Track */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar gap-3"
      >
        {collabs.map((collab, idx) => (
          <div key={collab.id} className="snap-center shrink-0 w-full">
            <CollabSlideCard
              collab={collab}
              isActiveSlide={currentIndex === idx}
              animKey={currentIndex === idx ? animCounter : 0}
              paused={paused}
              targetHref={targetHref}
            />
          </div>
        ))}
      </div>

      {/* Thin 6s Progress Bar under the slide */}
      <div
        aria-hidden="true"
        className="w-full h-[2px] rounded-full bg-[var(--divider)] overflow-hidden"
      >
        <div
          key={`${currentIndex}-${animCounter}`}
          className={`w-full h-full bg-[var(--accent)] collab-progress-bar ${
            paused ? 'collab-paused' : ''
          }`}
        />
      </div>

      {/* Progress Dots */}
      <div
        role="tablist"
        aria-label="Collaboration slides"
        className="flex items-center justify-center gap-2 pt-0.5"
      >
        {collabs.map((c, idx) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={currentIndex === idx}
            aria-label={`Slide ${idx + 1}: ${c.partnerName}`}
            onClick={() => scrollToSlide(idx)}
            className={`h-2 rounded-full transition-all cursor-pointer ${
              currentIndex === idx
                ? 'w-5 bg-[var(--accent)]'
                : 'w-2 bg-[var(--divider)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
