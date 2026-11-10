import React, { useEffect, useRef, useState } from 'react';

interface DoodleProps {
  color?: string;
  className?: string;
}

/**
 * Hook that triggers true once the element scrolls into view
 */
function useInViewOnce<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || inView) return;
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView]);

  return [ref, inView];
}

/**
 * Section wrapper that fades up 14px when scrolled into view (500ms)
 */
export const ScrollRevealSection: React.FC<{
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}> = ({ children, className = '', ariaLabel }) => {
  const [ref, inView] = useInViewOnce<HTMLElement>();
  return (
    <section
      ref={ref}
      aria-label={ariaLabel}
      className={`${
        inView ? 'section-reveal-visible' : 'section-reveal-hidden'
      } ${className}`}
    >
      {children}
    </section>
  );
};

/**
 * 1. Hand-drawn underline doodle (accent colour, 2.5px stroke, round line caps, 1s draw)
 */
export const DoodleSquiggle: React.FC<DoodleProps> = ({
  color = 'var(--accent)',
  className = 'w-40 h-3',
}) => {
  const [ref, inView] = useInViewOnce<SVGSVGElement>();
  const pathClass = inView ? 'doodle-path' : 'doodle-path-pending';
  return (
    <svg
      ref={ref}
      viewBox="0 0 180 12"
      fill="none"
      aria-hidden="true"
      className={`block ${className}`}
    >
      <path
        pathLength={100}
        className={pathClass}
        d="M3 8 C38 3, 76 10, 115 5 C140 3, 160 7, 177 5"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * 2. Small Flame Doodle for Weekly Streak tile (accent colour, 2.4px stroke, round line caps)
 */
export const DoodleFlame: React.FC<DoodleProps> = ({
  color = 'var(--accent)',
  className = 'w-5 h-6',
}) => {
  const [ref, inView] = useInViewOnce<SVGSVGElement>();
  const pathClass = inView ? 'doodle-path' : 'doodle-path-pending';
  return (
    <svg
      ref={ref}
      viewBox="0 0 28 34"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path
        pathLength={100}
        className={pathClass}
        d="M15 3 C15 9, 24 12, 24 21 C24 27.5, 19.5 31, 14 31 C8.5 31, 4 27, 4 20.5 C4 15, 8 11.5, 10 8 C10 11.5, 12.5 13, 13.5 13 C14 9, 13.5 5.5, 15 3 Z"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        pathLength={100}
        className={pathClass}
        d="M14 29 C11.5 29, 10 27, 10 24.5 C10 22, 12.5 20.5, 14 18 C15.5 20.5, 18 22, 18 24.5 C18 27, 16.5 29, 14 29 Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * 3. Calm Banner Pattern of Small Doodles (shoe, star, heart) in the accent colour at 15% opacity
 */
export const ProfileBannerPattern: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="w-full h-full bg-[var(--card)] relative overflow-hidden flex items-center justify-center"
    >
      <svg
        viewBox="0 0 480 160"
        fill="none"
        className="w-full h-full object-cover opacity-15"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Row 1: Shoe, Star, Heart, Shoe, Star */}
        {/* Shoe 1 */}
        <g transform="translate(26, 22)">
          <path
            d="M4 18 C6 11, 10 8, 15 6 L19 11 C24 12, 31 13, 36 16 C38 17, 38 20, 35 21 L5 21 C3 21, 3 19, 4 18 Z"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 18 L36 18"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* Star 1 */}
        <g transform="translate(124, 18)">
          <path
            d="M12 2 L14.8 8.5 L22 9.3 L16.5 14 L18.2 21 L12 17.3 L5.8 21 L7.5 14 L2 9.3 L9.2 8.5 Z"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Heart 1 */}
        <g transform="translate(216, 22)">
          <path
            d="M12 20 C12 20, 3 14, 3 8 C3 4.8, 5.5 2.5, 8.5 2.5 C10.4 2.5, 11.5 3.6, 12 4.8 C12.5 3.6, 13.6 2.5, 15.5 2.5 C18.5 2.5, 21 4.8, 21 8 C21 14, 12 20, 12 20 Z"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Shoe 2 */}
        <g transform="translate(306, 20)">
          <path
            d="M4 18 C6 11, 10 8, 15 6 L19 11 C24 12, 31 13, 36 16 C38 17, 38 20, 35 21 L5 21 C3 21, 3 19, 4 18 Z"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 18 L36 18"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* Star 2 */}
        <g transform="translate(414, 22)">
          <path
            d="M12 2 L14.8 8.5 L22 9.3 L16.5 14 L18.2 21 L12 17.3 L5.8 21 L7.5 14 L2 9.3 L9.2 8.5 Z"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Row 2: Heart, Shoe, Star, Heart, Shoe */}
        {/* Heart 2 */}
        <g transform="translate(72, 74)">
          <path
            d="M12 20 C12 20, 3 14, 3 8 C3 4.8, 5.5 2.5, 8.5 2.5 C10.4 2.5, 11.5 3.6, 12 4.8 C12.5 3.6, 13.6 2.5, 15.5 2.5 C18.5 2.5, 21 4.8, 21 8 C21 14, 12 20, 12 20 Z"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Shoe 3 */}
        <g transform="translate(162, 72)">
          <path
            d="M4 18 C6 11, 10 8, 15 6 L19 11 C24 12, 31 13, 36 16 C38 17, 38 20, 35 21 L5 21 C3 21, 3 19, 4 18 Z"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 18 L36 18"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* Star 3 */}
        <g transform="translate(268, 70)">
          <path
            d="M12 2 L14.8 8.5 L22 9.3 L16.5 14 L18.2 21 L12 17.3 L5.8 21 L7.5 14 L2 9.3 L9.2 8.5 Z"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Heart 3 */}
        <g transform="translate(362, 76)">
          <path
            d="M12 20 C12 20, 3 14, 3 8 C3 4.8, 5.5 2.5, 8.5 2.5 C10.4 2.5, 11.5 3.6, 12 4.8 C12.5 3.6, 13.6 2.5, 15.5 2.5 C18.5 2.5, 21 4.8, 21 8 C21 14, 12 20, 12 20 Z"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Row 3 subtle accents */}
        <g transform="translate(122, 120)">
          <path
            d="M12 20 C12 20, 3 14, 3 8 C3 4.8, 5.5 2.5, 8.5 2.5 C10.4 2.5, 11.5 3.6, 12 4.8 C12.5 3.6, 13.6 2.5, 15.5 2.5 C18.5 2.5, 21 4.8, 21 8 C21 14, 12 20, 12 20 Z"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <g transform="translate(220, 118)">
          <path
            d="M12 2 L14.8 8.5 L22 9.3 L16.5 14 L18.2 21 L12 17.3 L5.8 21 L7.5 14 L2 9.3 L9.2 8.5 Z"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <g transform="translate(316, 118)">
          <path
            d="M4 18 C6 11, 10 8, 15 6 L19 11 C24 12, 31 13, 36 16 C38 17, 38 20, 35 21 L5 21 C3 21, 3 19, 4 18 Z"
            stroke="var(--accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
};

/**
 * 4. Small Medal Doodle (accent colour, 2.5px stroke, round line caps)
 */
export const DoodleMedal: React.FC<DoodleProps> = ({
  color = 'var(--accent)',
  className = 'w-7 h-8',
}) => {
  const [ref, inView] = useInViewOnce<SVGSVGElement>();
  const pathClass = inView ? 'doodle-path' : 'doodle-path-pending';
  return (
    <svg
      ref={ref}
      viewBox="0 0 36 42"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path
        pathLength={100}
        className={pathClass}
        d="M10 4 L15 16 M26 4 L21 16 M7 4 L29 4"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        pathLength={100}
        className={pathClass}
        cx="18"
        cy="27"
        r="10"
        stroke={color}
        strokeWidth="2.4"
      />
      <path
        pathLength={100}
        className={pathClass}
        d="M18 22 L18 31 M15 24 L18 22"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * 5. Stopwatch Doodle (accent colour, 2.5px stroke, round line caps)
 */
export const DoodleStopwatch: React.FC<DoodleProps> = ({
  color = 'var(--accent)',
  className = 'w-8 h-8',
}) => {
  const [ref, inView] = useInViewOnce<SVGSVGElement>();
  const pathClass = inView ? 'doodle-path' : 'doodle-path-pending';
  return (
    <svg
      ref={ref}
      viewBox="0 0 40 42"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path
        pathLength={100}
        className={pathClass}
        d="M15 4 L25 4 M20 4 L20 9 M30 9 L34 13"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        pathLength={100}
        className={pathClass}
        cx="20"
        cy="24"
        r="13"
        stroke={color}
        strokeWidth="2.4"
      />
      <path
        pathLength={100}
        className={pathClass}
        d="M20 17 L20 24 L25 27"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * 6. Running Shoe Doodle (accent colour, 2.5px stroke, round line caps)
 */
export const DoodleShoe: React.FC<DoodleProps> = ({
  color = 'var(--accent)',
  className = 'w-9 h-6',
}) => {
  const [ref, inView] = useInViewOnce<SVGSVGElement>();
  const pathClass = inView ? 'doodle-path' : 'doodle-path-pending';
  return (
    <svg
      ref={ref}
      viewBox="0 0 56 36"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path
        pathLength={100}
        className={pathClass}
        d="M6 25 C8 16, 14 11, 20 8 L25 15 C32 17, 42 18, 49 22 C52 24, 52 28, 48 29 L7 29 C4 29, 4 27, 6 25 Z"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        pathLength={100}
        className={pathClass}
        d="M5 25 L50 25 M23 12 L27 9 M28 15 L32 12"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * 7. Crown Doodle (accent colour, 2.5px stroke, round line caps)
 */
export const DoodleCrown: React.FC<DoodleProps> = ({
  color = 'var(--accent)',
  className = 'w-7 h-5',
}) => {
  const [ref, inView] = useInViewOnce<SVGSVGElement>();
  const pathClass = inView ? 'doodle-path' : 'doodle-path-pending';
  return (
    <svg
      ref={ref}
      viewBox="0 0 40 28"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path
        pathLength={100}
        className={pathClass}
        d="M5 23 L3 8 L13 15 L20 5 L27 15 L37 8 L35 23 Z"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Clean calm label
 */
interface StickerTagProps {
  children: React.ReactNode;
  variant?: 'neon' | 'pink' | 'cream' | 'dark' | 'accent';
  tilt?: -3 | -2 | -1 | 1 | 2 | 3;
  className?: string;
}

export const StickerTag: React.FC<StickerTagProps> = ({
  children,
  className = '',
}) => {
  return (
    <span className={`inline-block label-sm select-none ${className}`}>
      {children}
    </span>
  );
};

/**
 * Count-up number animation (counts up once when scrolled into view, respects prefers-reduced-motion)
 */
export const CountUpKm: React.FC<{ value: number; decimals?: number }> = ({
  value,
  decimals = 1,
}) => {
  const [ref, inView] = useInViewOnce<HTMLSpanElement>();
  const [displayVal, setDisplayVal] = useState<number>(value);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || value <= 0 || !inView) {
      setDisplayVal(value);
      return;
    }

    let rafId = 0;
    const duration = 500;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayVal(value * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplayVal(value);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, inView]);

  const formatted =
    decimals === 0
      ? Math.round(displayVal).toString()
      : Number(displayVal.toFixed(decimals)).toString();

  return <span ref={ref}>{formatted}</span>;
};

/**
 * Hand-drawn activity icons for "After the run" section (accent colour only):
 * - cricket bat
 * - paddle (pickleball / table tennis)
 * - football
 * - shuttlecock (badminton)
 * - target (arcade / field games / default)
 */
export type ActivityIconKind =
  | 'cricket'
  | 'paddle'
  | 'football'
  | 'shuttlecock'
  | 'target';

export function resolveActivityIconKind(
  name: string,
  fallbackIndex = 0
): ActivityIconKind {
  const lower = (name || '').toLowerCase();
  if (lower.includes('cricket') || lower.includes('bat') || lower.includes('bowl')) {
    return 'cricket';
  }
  if (
    lower.includes('pickle') ||
    lower.includes('paddle') ||
    lower.includes('tennis') ||
    lower.includes('ping')
  ) {
    return 'paddle';
  }
  if (lower.includes('foot') || lower.includes('soccer') || lower.includes('turf match')) {
    return 'football';
  }
  if (lower.includes('badminton') || lower.includes('shuttle')) {
    return 'shuttlecock';
  }
  if (
    lower.includes('arcade') ||
    lower.includes('target') ||
    lower.includes('game') ||
    lower.includes('field')
  ) {
    return 'target';
  }
  const order: ActivityIconKind[] = [
    'cricket',
    'paddle',
    'football',
    'shuttlecock',
    'target',
  ];
  return order[fallbackIndex % order.length];
}

export const ActivityHandDrawnIcon: React.FC<{
  name: string;
  index?: number;
  className?: string;
}> = ({ name, index = 0, className = 'w-6 h-6' }) => {
  const kind = resolveActivityIconKind(name, index);

  if (kind === 'cricket') {
    // Hand-drawn cricket bat + ball
    return (
      <svg
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        className={`shrink-0 text-[var(--accent)] ${className}`}
      >
        <path
          d="M6 22 L15.5 12.5 L19.5 16.5 L10 26 C8.5 26.5, 6 24, 6 22 Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.5 14.5 L23.5 8.5 M21.5 6.5 L25.5 10.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx="8.5"
          cy="8.5"
          r="3"
          stroke="currentColor"
          strokeWidth="1.9"
        />
      </svg>
    );
  }

  if (kind === 'paddle') {
    // Hand-drawn pickleball / table tennis paddle
    return (
      <svg
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        className={`shrink-0 text-[var(--accent)] ${className}`}
      >
        <path
          d="M15 4 C20 4, 23.5 7.5, 23.5 12 C23.5 16.5, 20 19.5, 15.5 19.5 L12 19.5 L8.5 16 L8.5 12 C8.5 7.5, 11 4, 15 4 Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.5 17.5 L5.5 22.5 M12.5 19.5 L7.5 24.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="15" cy="11" r="1" fill="currentColor" />
        <circle cx="18" cy="13" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (kind === 'football') {
    // Hand-drawn football
    return (
      <svg
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        className={`shrink-0 text-[var(--accent)] ${className}`}
      >
        <circle
          cx="14"
          cy="14"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M14 9.5 L18 12.3 L16.5 17 L11.5 17 L10 12.3 Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 4 V9.5 M23 11 L18 12.3 M20 22 L16.5 17 M8 22 L11.5 17 M5 11 L10 12.3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === 'shuttlecock') {
    // Hand-drawn badminton shuttlecock
    return (
      <svg
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        className={`shrink-0 text-[var(--accent)] ${className}`}
      >
        <path
          d="M9.5 19.5 C9.5 22, 11.5 24, 14 24 C16.5 24, 18.5 22, 18.5 19.5 Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 19.5 L6 6 L11.5 10 L14 5 L16.5 10 L22 6 L18.5 19.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Default: hand-drawn target (arcade & field games)
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 text-[var(--accent)] ${className}`}
    >
      <circle
        cx="14"
        cy="14"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="14"
        cy="14"
        r="5.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="14" cy="14" r="1.8" fill="currentColor" />
    </svg>
  );
};

