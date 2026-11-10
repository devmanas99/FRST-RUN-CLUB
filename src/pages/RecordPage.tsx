import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { evaluateRunFlags, useClub } from '../context/ClubContext';
import { DoodleStopwatch } from '../components/Doodles';

const UNFINISHED_RUN_STORAGE_KEY = 'rewa_frst_unfinished_run_v1';

interface UnfinishedRunSnapshot {
  distanceMeters: number;
  elapsedSeconds: number;
  date: string;
  isPaused: boolean;
  savedAt: number;
}

interface GpsAnchor {
  lat: number;
  lon: number;
  timestamp: number;
}

// Haversine distance in meters between two coordinates
export function calculateHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDuration(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const remSecs = secs % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
}

export function formatPaceMinPerKm(secondsPerKm: number | null): string {
  if (!secondsPerKm || !isFinite(secondsPerKm) || secondsPerKm <= 0 || secondsPerKm > 3600) {
    return '—';
  }
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  if (secs === 60) {
    return `${mins + 1}:00 /km`;
  }
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

type ScreenState = 'ready' | 'running' | 'summary';

export const RecordPage: React.FC = () => {
  const { currentUser, submitPendingRun } = useClub();

  const [screenState, setScreenState] = useState<ScreenState>('ready');
  const [isPaused, setIsPaused] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const [distanceMeters, setDistanceMeters] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentPaceSecPerKm, setCurrentPaceSecPerKm] = useState<number | null>(null);
  const [runDate, setRunDate] = useState(() => new Date().toISOString().slice(0, 10));

  // GPS & Wake Lock feedback states
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [weakGpsMessage, setWeakGpsMessage] = useState<string | null>(null);
  const [wakeLockNotice, setWakeLockNotice] = useState<string | null>(null);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);
  const [savingRun, setSavingRun] = useState(false);

  // Unfinished run recovery state
  const [unfinishedRun, setUnfinishedRun] = useState<UnfinishedRunSnapshot | null>(() => {
    try {
      const raw = localStorage.getItem(UNFINISHED_RUN_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as UnfinishedRunSnapshot;
    } catch {
      return null;
    }
  });

  // Manual run entry state
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualKm, setManualKm] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualSeconds, setManualSeconds] = useState('0');
  const [manualSavedNotice, setManualSavedNotice] = useState<string | null>(null);

  // Refs for GPS watcher, timer, and wake lock
  const watchIdRef = useRef<number | null>(null);
  const lastGpsAnchorRef = useRef<GpsAnchor | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const distanceMetersRef = useRef<number>(0);
  const elapsedSecondsRef = useRef<number>(0);
  const runDateRef = useRef<string>(runDate);
  const wakeLockSentinelRef = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    distanceMetersRef.current = distanceMeters;
  }, [distanceMeters]);

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    runDateRef.current = runDate;
  }, [runDate]);

  const acquireWakeLock = useCallback(async () => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    if (!nav.wakeLock || typeof nav.wakeLock.request !== 'function') {
      setWakeLockNotice(
        'Screen Wake Lock is not supported on this browser. Please keep your screen unlocked manually.'
      );
      return;
    }
    try {
      wakeLockSentinelRef.current = await nav.wakeLock.request('screen');
      setWakeLockNotice(null);
    } catch {
      setWakeLockNotice(
        'Could not keep the screen awake automatically. Keep this screen open while recording.'
      );
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
      } catch {
        // Ignore release errors
      }
      wakeLockSentinelRef.current = null;
    }
  }, []);

  const stopGpsWatch = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    lastGpsAnchorRef.current = null;
  }, []);

  const startGpsWatch = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    stopGpsWatch();
    setGpsError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (isPausedRef.current) {
          return;
        }

        const { latitude, longitude, accuracy } = position.coords;
        const nowTs = position.timestamp || Date.now();

        // Ignore GPS points with accuracy worse than 25 m
        if (accuracy > 25) {
          setWeakGpsMessage(
            `Weak GPS signal (${Math.round(accuracy)} m accuracy). Waiting for accuracy under 25 m.`
          );
          return;
        }

        setWeakGpsMessage(null);
        setGpsError(null);

        const prev = lastGpsAnchorRef.current;
        if (!prev) {
          lastGpsAnchorRef.current = { lat: latitude, lon: longitude, timestamp: nowTs };
          return;
        }

        const deltaSec = (nowTs - prev.timestamp) / 1000;
        if (deltaSec <= 0) {
          return;
        }

        const deltaMeters = calculateHaversineMeters(
          prev.lat,
          prev.lon,
          latitude,
          longitude
        );

        const speedMetersPerSec = deltaMeters / deltaSec;

        // Ignore any jump faster than 8 m/s
        if (speedMetersPerSec > 8) {
          return;
        }

        lastGpsAnchorRef.current = { lat: latitude, lon: longitude, timestamp: nowTs };

        if (deltaMeters > 0.5) {
          setDistanceMeters((d) => d + deltaMeters);
          if (speedMetersPerSec >= 0.5) {
            setCurrentPaceSecPerKm(1000 / speedMetersPerSec);
          }
        }
      },
      (err) => {
        if (err.code === 1) {
          setGpsError(
            'Location permission was denied. Please allow location access in your browser settings and try again.'
          );
        } else if (err.code === 2) {
          setWeakGpsMessage('GPS signal unavailable. Move to an open outdoor area.');
        } else if (err.code === 3) {
          setWeakGpsMessage('Acquiring GPS signal...');
        } else {
          setGpsError('Could not read GPS location.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );
  }, [stopGpsWatch]);

  // 1-second elapsed timer when running and not paused
  useEffect(() => {
    if (screenState !== 'running' || isPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [screenState, isPaused]);

  // Auto-save progress to localStorage every 10 seconds while in 'running' screenState
  useEffect(() => {
    if (screenState !== 'running') return;

    const saveSnapshot = () => {
      const snap: UnfinishedRunSnapshot = {
        distanceMeters: distanceMetersRef.current,
        elapsedSeconds: elapsedSecondsRef.current,
        date: runDateRef.current,
        isPaused: isPausedRef.current,
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(UNFINISHED_RUN_STORAGE_KEY, JSON.stringify(snap));
      } catch {
        // Ignore storage errors
      }
    };

    const interval = setInterval(saveSnapshot, 10000);
    return () => clearInterval(interval);
  }, [screenState]);

  // Re-acquire wake lock when page becomes visible again during active run
  useEffect(() => {
    if (screenState !== 'running' || isPaused) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [screenState, isPaused, acquireWakeLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGpsWatch();
      releaseWakeLock();
    };
  }, [stopGpsWatch, releaseWakeLock]);

  if (!currentUser) {
    return (
      <div className="px-4 py-8 space-y-4">
        <h1 className="font-display text-[34px] text-[var(--text)]">Record A Run</h1>
        <p className="text-[16px] text-[var(--muted)]">
          Sign in to record live GPS runs or submit a run manually.
        </p>
        <Link to="/login" className="w-full btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  const handleStartNewRun = () => {
    setSavedSuccessMessage(null);
    setManualSavedNotice(null);
    setGpsError(null);
    setWeakGpsMessage(null);
    setDistanceMeters(0);
    setElapsedSeconds(0);
    setCurrentPaceSecPerKm(null);
    setRunDate(new Date().toISOString().slice(0, 10));
    setIsPaused(false);
    setConfirmFinish(false);
    setUnfinishedRun(null);
    localStorage.removeItem(UNFINISHED_RUN_STORAGE_KEY);

    setScreenState('running');
    acquireWakeLock();
    startGpsWatch();
  };

  const handleResumeUnfinished = () => {
    if (!unfinishedRun) return;
    setSavedSuccessMessage(null);
    setGpsError(null);
    setWeakGpsMessage(null);
    setDistanceMeters(unfinishedRun.distanceMeters);
    setElapsedSeconds(unfinishedRun.elapsedSeconds);
    setRunDate(unfinishedRun.date || new Date().toISOString().slice(0, 10));
    setIsPaused(false);
    setConfirmFinish(false);
    setUnfinishedRun(null);

    setScreenState('running');
    acquireWakeLock();
    startGpsWatch();
  };

  const handleDiscardUnfinished = () => {
    localStorage.removeItem(UNFINISHED_RUN_STORAGE_KEY);
    setUnfinishedRun(null);
  };

  const handlePause = () => {
    setIsPaused(true);
    lastGpsAnchorRef.current = null;
    setCurrentPaceSecPerKm(null);
    releaseWakeLock();
    try {
      const snap: UnfinishedRunSnapshot = {
        distanceMeters,
        elapsedSeconds,
        date: runDate,
        isPaused: true,
        savedAt: Date.now(),
      };
      localStorage.setItem(UNFINISHED_RUN_STORAGE_KEY, JSON.stringify(snap));
    } catch {
      // Ignore storage errors
    }
  };

  const handleResume = () => {
    lastGpsAnchorRef.current = null;
    setIsPaused(false);
    acquireWakeLock();
  };

  const handleConfirmFinish = () => {
    stopGpsWatch();
    releaseWakeLock();
    setConfirmFinish(false);
    setScreenState('summary');
  };

  const handleSaveFinishedRun = async () => {
    setSavingRun(true);
    try {
      const finalKm = Math.max(0.01, Number((distanceMeters / 1000).toFixed(2)));
      await submitPendingRun({
        date: runDate,
        km: finalKm,
        durationSeconds: elapsedSeconds,
        type: 'Personal',
      });
      localStorage.removeItem(UNFINISHED_RUN_STORAGE_KEY);
      setUnfinishedRun(null);
      setScreenState('ready');
      setSavedSuccessMessage(
        'Run submitted with status "pending". It will appear on the leaderboard once approved by an admin.'
      );
    } finally {
      setSavingRun(false);
    }
  };

  const handleDiscardSummary = () => {
    localStorage.removeItem(UNFINISHED_RUN_STORAGE_KEY);
    setUnfinishedRun(null);
    setDistanceMeters(0);
    setElapsedSeconds(0);
    setCurrentPaceSecPerKm(null);
    setScreenState('ready');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualSavedNotice(null);
    const kmVal = parseFloat(manualKm);
    const minsVal = parseInt(manualMinutes || '0', 10);
    const secsVal = parseInt(manualSeconds || '0', 10);
    const totalSecs = Math.max(0, minsVal * 60 + secsVal);

    if (isNaN(kmVal) || kmVal <= 0 || totalSecs <= 0) {
      return;
    }

    await submitPendingRun({
      date: manualDate,
      km: Number(kmVal.toFixed(2)),
      durationSeconds: totalSecs,
      type: 'Personal',
    });

    const { flagged, flagReason } = evaluateRunFlags(kmVal, totalSecs);
    setManualKm('');
    setManualMinutes('');
    setManualSeconds('0');
    setManualSavedNotice(
      flagged
        ? `Manual run submitted as pending (Flagged: ${flagReason}).`
        : 'Manual run submitted as pending for admin approval.'
    );
  };

  const distanceKm = distanceMeters / 1000;
  const formattedDistanceKm = distanceKm.toFixed(2);
  const avgPaceSecPerKm =
    distanceKm >= 0.01 && elapsedSeconds > 0 ? elapsedSeconds / distanceKm : null;
  const summaryFlags = evaluateRunFlags(Number(formattedDistanceKm), elapsedSeconds);

  return (
    <div className="px-4 py-6 space-y-6 overflow-x-hidden">
      {/* STATE 1: READY */}
      {screenState === 'ready' && (
        <>
          <section className="space-y-4">
            {/* Header with the 1 stopwatch doodle on RecordPage */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="label-sm block">GPS tracker</span>
                <h1 className="font-display text-[34px] text-[var(--text)] leading-none">
                  Record A Run
                </h1>
              </div>
              <DoodleStopwatch className="w-8 h-8 mt-1" />
            </div>

            <div className="club-card p-4">
              <p className="text-[16px] text-[var(--muted)]">
                We use GPS only while you record. Keep this screen open.
              </p>
            </div>

            {savedSuccessMessage && (
              <div className="club-card p-4 space-y-1">
                <span className="label-sm text-[var(--accent)]">Pending approval</span>
                <p className="text-[16px] text-[var(--text)]">{savedSuccessMessage}</p>
              </div>
            )}

            {/* Offer to resume unfinished run if present in localStorage */}
            {unfinishedRun && (
              <div className="club-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[22px] text-[var(--text)]">
                    Unfinished Run Found
                  </span>
                  <span className="label-sm text-[var(--accent)]">Saved</span>
                </div>
                <div className="text-small font-semibold text-[var(--muted)] tabular-nums">
                  {(unfinishedRun.distanceMeters / 1000).toFixed(2)} KM •{' '}
                  {formatDuration(unfinishedRun.elapsedSeconds)} • {unfinishedRun.date}
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={handleResumeUnfinished}
                    className="btn-secondary"
                  >
                    Resume run
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardUnfinished}
                    className="text-small font-semibold text-[var(--muted)] underline cursor-pointer"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* Main action button on Ready screen */}
            <button
              type="button"
              onClick={handleStartNewRun}
              className="w-full btn-primary"
            >
              Start
            </button>
          </section>

          {/* Add a run manually (also goes to pending) */}
          <section className="pt-4 border-t border-[var(--divider)] space-y-4">
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
                  Add A Run Manually
                </h2>
                <span className="label-sm">Pending</span>
              </div>
              <p className="text-[16px] text-[var(--muted)]">
                Manual runs are saved as pending until approved by an admin.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="club-card p-4 space-y-3.5">
              <div>
                <label htmlFor="man-date" className="block label-sm mb-1.5">
                  Date
                </label>
                <input
                  id="man-date"
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full h-[46px] club-input px-3"
                />
              </div>

              <div>
                <label htmlFor="man-km" className="block label-sm mb-1.5">
                  Distance (km)
                </label>
                <input
                  id="man-km"
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="500"
                  required
                  placeholder="5.00"
                  value={manualKm}
                  onChange={(e) => setManualKm(e.target.value)}
                  className="w-full h-[46px] club-input px-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="man-min" className="block label-sm mb-1.5">
                    Time (minutes)
                  </label>
                  <input
                    id="man-min"
                    type="number"
                    min="1"
                    max="1440"
                    required
                    placeholder="28"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                    className="w-full h-[46px] club-input px-3"
                  />
                </div>
                <div>
                  <label htmlFor="man-sec" className="block label-sm mb-1.5">
                    Seconds
                  </label>
                  <input
                    id="man-sec"
                    type="number"
                    min="0"
                    max="59"
                    value={manualSeconds}
                    onChange={(e) => setManualSeconds(e.target.value)}
                    className="w-full h-[46px] club-input px-3"
                  />
                </div>
              </div>

              <button type="submit" className="w-full btn-secondary">
                Submit manual run
              </button>

              {manualSavedNotice && (
                <div className="pt-1 text-small font-semibold text-[var(--accent)]">
                  {manualSavedNotice}
                </div>
              )}
            </form>
          </section>
        </>
      )}

      {/* STATE 2: RUNNING / PAUSED */}
      {screenState === 'running' && (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="label-sm text-[var(--accent)] block">
                {isPaused ? 'Paused' : 'GPS active'}
              </span>
              <h1 className="font-display text-[34px] text-[var(--text)] leading-none">
                {isPaused ? 'Run Paused' : 'Recording Run'}
              </h1>
            </div>
            <DoodleStopwatch className="w-8 h-8" />
          </div>

          {gpsError && (
            <div className="club-card p-3.5 text-[16px] text-[var(--accent)]">
              {gpsError}
            </div>
          )}

          {weakGpsMessage && !gpsError && (
            <div className="club-card p-3.5 text-[16px] text-[var(--muted)]">
              {weakGpsMessage}
            </div>
          )}

          {wakeLockNotice && (
            <div className="text-small text-[var(--muted)]">{wakeLockNotice}</div>
          )}

          {/* Live distance in km (2 decimals, 48px) */}
          <div className="club-card p-5 flex items-center justify-between gap-3">
            <div>
              <div className="label-sm">Distance</div>
              <div className="text-[48px] font-bold text-[var(--accent)] tabular-nums leading-tight">
                {formattedDistanceKm}{' '}
                <span className="font-display text-[22px] text-[var(--text)]">KM</span>
              </div>
            </div>

            {!isPaused && (
              <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border-2 border-[var(--accent)] animate-pulse-ring"
                />
                <span className="w-3 h-3 rounded-full bg-[var(--accent)]" />
              </div>
            )}
          </div>

          {/* Time, current pace, and average pace */}
          <div className="club-card divide-y divide-[var(--divider)] px-4">
            <div className="py-3.5 flex justify-between items-center">
              <span className="label-sm">Time</span>
              <span className="font-display text-[24px] text-[var(--text)] tabular-nums">
                {formatDuration(elapsedSeconds)}
              </span>
            </div>
            <div className="py-3.5 flex justify-between items-center">
              <span className="label-sm">Current pace</span>
              <span className="font-display text-[22px] text-[var(--text)] tabular-nums">
                {formatPaceMinPerKm(currentPaceSecPerKm)}
              </span>
            </div>
            <div className="py-3.5 flex justify-between items-center">
              <span className="label-sm">Average pace</span>
              <span className="font-display text-[22px] text-[var(--accent)] tabular-nums">
                {formatPaceMinPerKm(avgPaceSecPerKm)}
              </span>
            </div>
          </div>

          {/* Controls: 1 main button + 1 secondary outlined button */}
          {!confirmFinish ? (
            <div className="space-y-3">
              {!isPaused ? (
                <button
                  type="button"
                  onClick={handlePause}
                  className="w-full btn-primary"
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResume}
                  className="w-full btn-primary"
                >
                  Resume
                </button>
              )}

              <button
                type="button"
                onClick={() => setConfirmFinish(true)}
                className="w-full btn-secondary"
              >
                Finish
              </button>
            </div>
          ) : (
            <div className="club-card p-4 space-y-3">
              <div className="font-display text-[22px] text-[var(--text)]">
                Finish this run?
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleConfirmFinish}
                  className="btn-primary"
                >
                  Confirm finish
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmFinish(false)}
                  className="btn-secondary"
                >
                  Keep running
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* STATE 3: SUMMARY */}
      {screenState === 'summary' && (
        <section className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="label-sm text-[var(--accent)] block">
                Pending approval
              </span>
              <h1 className="font-display text-[34px] text-[var(--text)] leading-none">
                Run Summary
              </h1>
              <p className="text-[16px] text-[var(--muted)] pt-1">
                Saved runs are marked pending until an admin approves them.
              </p>
            </div>
            <DoodleStopwatch className="w-8 h-8 mt-1" />
          </div>

          <div className="club-card divide-y divide-[var(--divider)] px-4">
            <div className="py-3.5 flex justify-between items-center">
              <span className="label-sm">Distance</span>
              <span className="font-display text-[26px] text-[var(--accent)] tabular-nums">
                {formattedDistanceKm} KM
              </span>
            </div>
            <div className="py-3.5 flex justify-between items-center">
              <span className="label-sm">Time</span>
              <span className="font-display text-[22px] text-[var(--text)] tabular-nums">
                {formatDuration(elapsedSeconds)}
              </span>
            </div>
            <div className="py-3.5 flex justify-between items-center">
              <span className="label-sm">Average pace</span>
              <span className="font-display text-[22px] text-[var(--text)] tabular-nums">
                {formatPaceMinPerKm(avgPaceSecPerKm)}
              </span>
            </div>
            <div className="py-3.5 flex justify-between items-center">
              <span className="label-sm">Date</span>
              <span className="text-[16px] font-medium text-[var(--text)] tabular-nums">
                {runDate}
              </span>
            </div>
          </div>

          {summaryFlags.flagged && (
            <div className="club-card p-3.5 text-[16px] text-[var(--muted)]">
              Note: This run will be flagged for admin verification ({summaryFlags.flagReason}).
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              disabled={savingRun}
              onClick={handleSaveFinishedRun}
              className="w-full btn-primary"
            >
              {savingRun ? 'Saving...' : 'Save run'}
            </button>

            <button
              type="button"
              onClick={handleDiscardSummary}
              className="w-full btn-secondary"
            >
              Discard
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
