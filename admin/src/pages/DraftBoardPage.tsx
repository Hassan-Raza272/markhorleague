import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  subscribeDraftPicks,
  subscribeDraftSession,
  subscribeFranchises,
  subscribePlayerPhotos,
  subscribePublicPlayerPhotos,
} from '../services/draftBoardService';
import {
  getFranchiseIdForPick,
  getPickDetails,
  resolveDraftFranchiseOrder,
} from '../utils/draftOrder';
import {
  formatPickClock,
  getPickClockRemainingMs,
  isPickClockActive,
} from '../utils/pickClock';
import type { DraftPick, DraftSession, Franchise } from '../types';
import { Maximize2, Minimize2 } from 'lucide-react';

const REVEAL_MS = 15_000;

function shortName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function franchiseLabel(franchise: Franchise | null | undefined, fallback?: string): string {
  if (franchise?.shortCode?.trim()) return franchise.shortCode.trim();
  const name = franchise?.name ?? fallback ?? '—';
  if (name.length <= 22) return name;
  return `${name.slice(0, 20)}…`;
}

function statusLabel(status: DraftSession['status'] | undefined): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'LIVE';
    case 'COMPLETED':
      return 'COMPLETE';
    case 'SETUP':
      return 'SETUP';
    default:
      return 'WAITING';
  }
}

export function DraftBoardPage() {
  const [session, setSession] = useState<DraftSession | null>(null);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [revealPickId, setRevealPickId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastPickCount = useRef(0);
  const revealTimer = useRef<number | null>(null);
  const boardReady = useRef(false);

  const mergePhotos = useCallback((next: Record<string, string>) => {
    setPhotos(prev => ({ ...prev, ...next }));
  }, []);

  useEffect(() => {
    const unsubSession = subscribeDraftSession(
      setSession,
      err => setError(err.message),
    );
    const unsubPicks = subscribeDraftPicks(
      setPicks,
      err => setError(err.message),
    );
    const unsubFranchises = subscribeFranchises(
      setFranchises,
      err => setError(err.message),
    );
    return () => {
      unsubSession();
      unsubPicks();
      unsubFranchises();
    };
  }, []);

  useEffect(() => {
    const unsubPlayers = subscribePlayerPhotos(mergePhotos, () => {
      /* public board may lack player read access */
    });
    const unsubPublic = subscribePublicPlayerPhotos(mergePhotos, () => {
      /* ignore */
    });
    return () => {
      unsubPlayers();
      unsubPublic();
    };
  }, [mergePhotos]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const nonLocks = picks.filter(p => !p.isLock);
    // Skip reveal flood on first snapshot; only animate new live picks.
    if (!boardReady.current) {
      lastPickCount.current = nonLocks.length;
      boardReady.current = true;
      return;
    }
    if (nonLocks.length > lastPickCount.current && nonLocks.length > 0) {
      const latest = nonLocks[nonLocks.length - 1];
      setRevealPickId(latest.id);
      if (revealTimer.current) window.clearTimeout(revealTimer.current);
      revealTimer.current = window.setTimeout(() => {
        setRevealPickId(null);
        revealTimer.current = null;
      }, REVEAL_MS);
    }
    lastPickCount.current = nonLocks.length;
  }, [picks]);

  useEffect(() => {
    return () => {
      if (revealTimer.current) window.clearTimeout(revealTimer.current);
    };
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const franchiseOrder = useMemo(() => {
    if (!session) return franchises.map(f => f.id);
    return resolveDraftFranchiseOrder(
      session.franchiseOrder,
      franchises.map(f => f.id),
      session.status,
    );
  }, [franchises, session]);

  const franchiseById = useMemo(() => {
    const map = new Map<string, Franchise>();
    for (const f of franchises) map.set(f.id, f);
    return map;
  }, [franchises]);

  const draftedPicks = useMemo(
    () => picks.filter(p => !p.isLock).sort((a, b) => a.pickNumber - b.pickNumber),
    [picks],
  );

  const lastPick = draftedPicks[draftedPicks.length - 1] ?? null;
  const revealing =
    revealPickId && lastPick && lastPick.id === revealPickId ? lastPick : null;

  const resolvePhoto = useCallback(
    (pick: DraftPick | null | undefined) => {
      if (!pick) return undefined;
      return pick.profileImage || photos[pick.playerDocId] || undefined;
    },
    [photos],
  );

  const onClockFranchise = useMemo(() => {
    if (!session || session.status !== 'IN_PROGRESS') return null;
    if (franchiseOrder.length === 0) return null;
    if (session.totalPicks > 0 && session.currentPickNumber > session.totalPicks) {
      return null;
    }
    try {
      const id = getFranchiseIdForPick(session.currentPickNumber, franchiseOrder);
      return franchiseById.get(id) ?? null;
    } catch {
      return null;
    }
  }, [franchiseById, franchiseOrder, session]);

  const pickMeta = useMemo(() => {
    if (!session || franchiseOrder.length === 0) return null;
    try {
      return getPickDetails(session.currentPickNumber, franchiseOrder.length);
    } catch {
      return null;
    }
  }, [franchiseOrder.length, session]);

  const clockMs = getPickClockRemainingMs(session, now);
  const clockActive = isPickClockActive(session);
  const clockSeconds = Math.ceil(clockMs / 1000);
  const clockUrgent = clockActive && clockSeconds <= 30;

  const recentPicks = useMemo(
    () => [...draftedPicks].reverse().slice(0, 8),
    [draftedPicks],
  );

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* browser may block */
    }
  };

  const heroPhoto = resolvePhoto(revealing);

  return (
    <div className="draft-board min-h-screen bg-mcl-forest-950 text-white overflow-hidden relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(163,207,45,0.12),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(212,175,55,0.08),_transparent_50%)]" />

      {/* Fullscreen pick reveal — 15s */}
      {revealing ? (
        <div className="fixed inset-0 z-50 draft-board-reveal flex flex-col items-center justify-center overflow-hidden bg-[#020805]">
          {/* Atmosphere */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(212,175,55,0.22)_0%,_transparent_52%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(163,207,45,0.14)_0%,_transparent_42%)]" />
          <div className="pointer-events-none absolute -left-24 top-1/4 h-[55vh] w-[55vh] rounded-full bg-mcl-lime-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-1/4 h-[50vh] w-[50vh] rounded-full bg-mcl-gold-500/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-mcl-gold-500/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-mcl-lime-500/50 to-transparent" />

          <div className="relative z-10 flex h-full w-full max-w-[1400px] flex-col items-center justify-center px-6 py-8 md:px-10">
            {/* Top brand strip */}
            <div className="draft-board-reveal-badge mb-5 flex items-center gap-3 md:mb-7">
              <img
                src="/mcl-logo.png"
                alt=""
                className="h-10 w-10 rounded-full object-cover ring-2 ring-mcl-gold-500/60 md:h-12 md:w-12"
              />
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-mcl-gold-400 md:text-xs">
                  Markhor Cricket League
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mcl-silver-400 md:text-sm">
                  Season 4 · Live Draft
                </p>
              </div>
            </div>

            {/* Pick badge */}
            <div className="draft-board-reveal-badge mb-6 inline-flex items-center gap-3 rounded-full border border-mcl-gold-500/50 bg-mcl-gold-500/10 px-5 py-2.5 backdrop-blur-sm md:mb-8 md:px-7 md:py-3">
              <span className="h-2 w-2 rounded-full bg-mcl-lime-500 draft-board-live-pulse" />
              <p className="text-sm font-extrabold uppercase tracking-[0.28em] text-mcl-gold-400 md:text-lg">
                {revealing.isAutoPick ? 'Auto Pick' : 'New Pick'}
              </p>
              <span className="rounded-full bg-mcl-forest-900/80 px-3 py-1 text-sm font-extrabold text-white md:text-base">
                #{revealing.pickNumber}
              </span>
            </div>

            {/* Hero photo with premium rings */}
            <div className="draft-board-reveal-photo relative mb-7 md:mb-9">
              <div className="absolute -inset-6 rounded-full border border-mcl-lime-500/25 md:-inset-8" />
              <div className="absolute -inset-3 rounded-full border border-mcl-gold-500/40 md:-inset-4" />
              <div className="draft-board-reveal-ring relative overflow-hidden rounded-full">
                {heroPhoto ? (
                  <img
                    src={heroPhoto}
                    alt={revealing.playerName}
                    className="h-[min(70vh,760px)] w-[min(70vh,760px)] rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-[min(70vh,760px)] w-[min(70vh,760px)] items-center justify-center rounded-full bg-gradient-to-b from-mcl-forest-700 to-mcl-forest-900">
                    <span className="text-8xl font-extrabold tracking-tight text-mcl-lime-500 md:text-9xl">
                      {shortName(revealing.playerName)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Player copy */}
            <div className="draft-board-reveal-text text-center">
              <h2 className="max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] md:text-7xl lg:text-8xl">
                {revealing.playerName}
              </h2>
            </div>
            <div className="draft-board-reveal-text-delay mt-4 flex flex-col items-center gap-3 md:mt-5">
              <p className="text-2xl font-extrabold text-mcl-lime-500 md:text-4xl lg:text-5xl">
                {revealing.franchiseName}
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2 md:gap-3">
                <span className="rounded-full border border-mcl-forest-600 bg-mcl-forest-900/80 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-mcl-silver-100 md:text-base">
                  {revealing.playerRole}
                </span>
                {revealing.playerCategory ? (
                  <span className="rounded-full border border-mcl-gold-500/35 bg-mcl-gold-500/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-mcl-gold-400 md:text-base">
                    {revealing.playerCategory}
                  </span>
                ) : null}
                {revealing.shirtNumber ? (
                  <span className="rounded-full border border-mcl-lime-500/40 bg-mcl-lime-500/10 px-4 py-1.5 text-sm font-extrabold text-mcl-lime-400 md:text-base">
                    #{revealing.shirtNumber}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <header className="relative z-10 flex items-center justify-between gap-4 px-6 md:px-10 pt-5 pb-3">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src="/mcl-logo.png"
            alt="MCL"
            className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover drop-shadow-lg"
          />
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-extrabold tracking-[0.12em] truncate">
              MCL 2026-27
            </h1>
            <p className="text-mcl-silver-400 text-xs md:text-sm font-semibold uppercase tracking-wider">
              Live Player Draft
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs md:text-sm font-extrabold tracking-wider border ${
              session?.status === 'IN_PROGRESS'
                ? 'bg-red-500/20 text-red-300 border-red-400/40 draft-board-live-pulse'
                : session?.status === 'COMPLETED'
                  ? 'bg-mcl-lime-500/15 text-mcl-lime-500 border-mcl-lime-500/40'
                  : 'bg-mcl-forest-800 text-mcl-silver-400 border-mcl-forest-600'
            }`}>
            {session?.status === 'IN_PROGRESS' ? (
              <span className="w-2 h-2 rounded-full bg-red-400" />
            ) : null}
            {statusLabel(session?.status)}
          </span>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl border border-mcl-forest-600 bg-mcl-forest-900/80 text-mcl-silver-100 hover:border-mcl-lime-500/50 hover:text-mcl-lime-500 transition"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen for LED'}>
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </header>

      {error ? (
        <div className="relative z-10 mx-6 md:mx-10 mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">
          {error.includes('permission') || error.includes('Missing or insufficient')
            ? 'Sign in as Super Admin on this laptop (or deploy updated Firestore rules) to load the live draft board.'
            : error}
        </div>
      ) : null}

      <main className="relative z-10 px-6 md:px-10 pb-6 grid grid-rows-[1fr_auto] gap-4 min-h-[calc(100vh-6.5rem)]">
        <section className="grid grid-cols-1 gap-4 items-stretch">
          {/* On the clock — primary area */}
          <div className="rounded-3xl border border-mcl-forest-600 bg-mcl-forest-900/80 p-6 md:p-12 flex flex-col justify-center overflow-hidden min-h-[55vh]">
            {session?.status === 'COMPLETED' ? (
              <div className="text-center draft-board-fade-in">
                <p className="text-mcl-lime-500 text-sm md:text-base font-bold uppercase tracking-[0.25em] mb-3">
                  Draft Complete
                </p>
                <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-4">
                  All picks are in
                </h2>
                {lastPick ? (
                  <p className="text-mcl-silver-400 text-lg md:text-2xl">
                    Final pick · {lastPick.playerName} → {lastPick.franchiseName}
                  </p>
                ) : null}
              </div>
            ) : session?.status === 'IN_PROGRESS' && onClockFranchise ? (
              <div className="text-center draft-board-fade-in flex flex-col items-center justify-center flex-1">
                <p className="text-mcl-silver-400 text-sm md:text-lg font-bold uppercase tracking-[0.3em] mb-4">
                  On the clock
                  {pickMeta
                    ? ` · Round ${pickMeta.round} · Pick ${session.currentPickNumber}`
                    : ''}
                </p>
                <p className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-mcl-lime-500 mb-8 md:mb-10 max-w-5xl px-4 leading-tight">
                  {onClockFranchise.name}
                </p>
                <div
                  className={`inline-flex items-center justify-center min-w-[16rem] md:min-w-[28rem] px-12 md:px-20 py-7 md:py-12 rounded-3xl border-[3px] font-mono text-7xl md:text-[9rem] lg:text-[11rem] font-extrabold tabular-nums leading-none transition-colors duration-300 ${
                    clockUrgent
                      ? 'draft-board-clock-urgent'
                      : clockActive
                        ? 'bg-mcl-lime-500/10 border-mcl-lime-500 text-mcl-lime-400'
                        : 'bg-mcl-forest-800 border-mcl-forest-600 text-mcl-silver-400'
                  }`}>
                  {formatPickClock(clockMs)}
                </div>
                <p
                  className={`mt-6 text-sm md:text-lg font-semibold ${
                    clockUrgent
                      ? 'text-red-400'
                      : 'text-mcl-silver-400'
                  }`}>
                  {clockUrgent
                    ? 'Hurry — under 30 seconds'
                    : clockActive
                      ? 'Pick clock running'
                      : 'Waiting for clock / pick'}
                </p>
                <div className="mt-8 w-full max-w-xl">
                  <div className="flex items-end justify-between gap-2 mb-2 px-1">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-mcl-silver-400">
                      Progress
                    </h3>
                    <p className="text-lg font-extrabold text-white tabular-nums">
                      {draftedPicks.length}
                      <span className="text-mcl-silver-400 text-xs font-semibold">
                        /{session?.totalPicks || '—'}
                      </span>
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-mcl-forest-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-mcl-lime-600 to-mcl-lime-400 transition-all duration-500"
                      style={{
                        width: `${
                          session?.totalPicks
                            ? Math.min(
                                100,
                                (draftedPicks.length / session.totalPicks) * 100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center draft-board-fade-in">
                <p className="text-mcl-silver-400 text-sm md:text-base font-bold uppercase tracking-[0.3em] mb-4">
                  Draft Board
                </p>
                <h2 className="text-4xl md:text-6xl font-extrabold mb-3">
                  {session ? 'Waiting to start' : 'Connecting…'}
                </h2>
                <p className="text-mcl-silver-400 text-lg md:text-xl max-w-xl mx-auto">
                  When the draft begins on the admin app, this screen will show
                  the franchise on the clock and every live pick.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-mcl-forest-600 bg-mcl-forest-900/80 p-3 md:p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-mcl-silver-400 mb-2 px-1">
            Recent picks
          </h3>
          {recentPicks.length === 0 ? (
            <p className="text-mcl-silver-400 text-xs px-1 py-3">
              Picks will appear here as franchises select players.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {recentPicks.map(pick => {
                const photo = resolvePhoto(pick);
                return (
                  <div
                    key={pick.id}
                    className="rounded-xl border border-mcl-forest-600 bg-mcl-forest-800/50 p-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      {photo ? (
                        <img
                          src={photo}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-mcl-forest-600"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-mcl-forest-700 text-mcl-lime-500 flex items-center justify-center text-[10px] font-bold">
                          {shortName(pick.playerName)}
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-mcl-silver-400">
                        #{pick.pickNumber}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white truncate">
                      {pick.playerName}
                    </p>
                    <p className="text-[10px] text-mcl-lime-500 truncate mt-0.5">
                      {franchiseLabel(
                        franchiseById.get(pick.franchiseId),
                        pick.franchiseName,
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
