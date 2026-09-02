import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  subscribeDraftPicks,
  subscribeDraftSession,
  subscribeFranchises,
  subscribeLockedSquadPlayers,
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
import { Maximize2, Minimize2, Square } from 'lucide-react';
import {
  DraftBoardPlayerReveal,
  REVEAL_MS,
  squadPlayerToRevealProps,
  SQUAD_SLIDE_MS,
} from '../components/DraftBoardPlayerReveal';
import {
  buildFranchiseSquadSlideshow,
  type LockedSquadPlayer,
} from '../utils/squadSlideshow';
import { preloadImage, waitForPhotoUrl } from '../utils/preloadImage';

type PickRevealState = {
  pick: DraftPick;
  photoUrl?: string;
};

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
  const [lockedPlayers, setLockedPlayers] = useState<LockedSquadPlayer[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [pickReveal, setPickReveal] = useState<PickRevealState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localSlideshowFranchiseId, setLocalSlideshowFranchiseId] = useState<
    string | null
  >(null);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [slideshowPlaying, setSlideshowPlaying] = useState(false);
  const [squadSlideReveal, setSquadSlideReveal] = useState<{
    key: string;
    props: ReturnType<typeof squadPlayerToRevealProps>;
  } | null>(null);
  const lastPickCount = useRef(0);
  const revealTimer = useRef<number | null>(null);
  const revealRunId = useRef(0);
  const revealPickIdRef = useRef<string | null>(null);
  const boardReady = useRef(false);
  const photosRef = useRef(photos);
  const slideshowKeyRef = useRef('');
  const squadSlideRunId = useRef(0);

  photosRef.current = photos;

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
    const unsubLocked = subscribeLockedSquadPlayers(setLockedPlayers, () => {
      /* board may lack player read access */
    });
    return () => {
      unsubSession();
      unsubPicks();
      unsubFranchises();
      unsubLocked();
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
    if (!boardReady.current) {
      lastPickCount.current = nonLocks.length;
      boardReady.current = true;
      return;
    }
    if (
      session?.status !== 'IN_PROGRESS' ||
      nonLocks.length <= lastPickCount.current ||
      nonLocks.length === 0
    ) {
      lastPickCount.current = nonLocks.length;
      return;
    }

    const latest = nonLocks[nonLocks.length - 1];
    const runId = ++revealRunId.current;
    lastPickCount.current = nonLocks.length;

    void (async () => {
      const photoUrl = await waitForPhotoUrl(
        latest.playerDocId,
        latest.profileImage,
        () => photosRef.current,
      );
      if (runId !== revealRunId.current) return;

      if (photoUrl) {
        await preloadImage(photoUrl);
        if (runId !== revealRunId.current) return;
      }

      setPickReveal({ pick: latest, photoUrl });
      revealPickIdRef.current = latest.id;
      if (revealTimer.current) window.clearTimeout(revealTimer.current);
      revealTimer.current = window.setTimeout(() => {
        if (revealPickIdRef.current === latest.id) {
          setPickReveal(null);
          revealPickIdRef.current = null;
        }
        revealTimer.current = null;
      }, REVEAL_MS);
    })();
  }, [picks, session?.status]);

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

  const remoteSlideshowFranchiseId =
    session?.status === 'COMPLETED'
      ? session.squadSlideshowFranchiseId ?? null
      : null;

  const activeSlideshowFranchiseId =
    localSlideshowFranchiseId ?? remoteSlideshowFranchiseId;

  const activeSlideshowFranchise = activeSlideshowFranchiseId
    ? franchiseById.get(activeSlideshowFranchiseId) ?? null
    : null;

  const squadPlayers = useMemo(() => {
    if (!activeSlideshowFranchise) return [];
    return buildFranchiseSquadSlideshow(
      activeSlideshowFranchise,
      picks,
      lockedPlayers,
    );
  }, [activeSlideshowFranchise, lockedPlayers, picks]);

  const startLocalSlideshow = (franchiseId: string) => {
    setLocalSlideshowFranchiseId(franchiseId);
    setSlideshowIndex(0);
    setSlideshowPlaying(true);
  };

  const stopSlideshow = () => {
    setLocalSlideshowFranchiseId(null);
    setSlideshowIndex(0);
    setSlideshowPlaying(false);
    slideshowKeyRef.current = '';
  };

  useEffect(() => {
    if (!activeSlideshowFranchiseId) {
      setSlideshowPlaying(false);
      setSlideshowIndex(0);
      return;
    }

    const token = session?.squadSlideshowToken ?? 0;
    const key = localSlideshowFranchiseId
      ? `local:${activeSlideshowFranchiseId}`
      : `remote:${activeSlideshowFranchiseId}:${token}`;

    if (slideshowKeyRef.current !== key) {
      slideshowKeyRef.current = key;
      setSlideshowIndex(0);
      setSlideshowPlaying(squadPlayers.length > 0);
    }
  }, [
    activeSlideshowFranchiseId,
    localSlideshowFranchiseId,
    session?.squadSlideshowToken,
    squadPlayers.length,
  ]);

  useEffect(() => {
    if (!slideshowPlaying || !activeSlideshowFranchiseId) return;
    if (squadPlayers.length === 0) {
      setSlideshowPlaying(false);
      return;
    }
    if (slideshowIndex >= squadPlayers.length) {
      setSlideshowPlaying(false);
      if (localSlideshowFranchiseId) {
        setLocalSlideshowFranchiseId(null);
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setSlideshowIndex(prev => prev + 1);
    }, SQUAD_SLIDE_MS);

    return () => window.clearTimeout(timer);
  }, [
    activeSlideshowFranchiseId,
    localSlideshowFranchiseId,
    slideshowIndex,
    slideshowPlaying,
    squadPlayers.length,
  ]);

  const currentSlideshowPlayer =
    slideshowPlaying && slideshowIndex < squadPlayers.length
      ? squadPlayers[slideshowIndex]
      : null;

  useEffect(() => {
    if (!currentSlideshowPlayer || !activeSlideshowFranchise) {
      setSquadSlideReveal(null);
      return;
    }

    const runId = ++squadSlideRunId.current;
    const player = currentSlideshowPlayer;
    const franchiseName = activeSlideshowFranchise.name;
    const slideKey = `${activeSlideshowFranchiseId}:${slideshowIndex}:${player.id}`;

    void (async () => {
      const photoUrl = await waitForPhotoUrl(
        player.id,
        player.profileImage,
        () => photosRef.current,
        800,
      );
      if (runId !== squadSlideRunId.current) return;

      const resolvedPhoto = photoUrl ?? player.profileImage;
      if (resolvedPhoto) {
        await preloadImage(resolvedPhoto);
        if (runId !== squadSlideRunId.current) return;
      }

      setSquadSlideReveal({
        key: slideKey,
        props: squadPlayerToRevealProps(
          player,
          franchiseName,
          slideshowIndex,
          squadPlayers.length,
          resolvedPhoto,
          slideKey,
        ),
      });
    })();
  }, [
    activeSlideshowFranchise,
    activeSlideshowFranchiseId,
    currentSlideshowPlayer,
    slideshowIndex,
    squadPlayers.length,
  ]);

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

  return (
    <div className="draft-board flex min-h-screen flex-col bg-mcl-forest-950 text-white overflow-hidden relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(163,207,45,0.12),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(212,175,55,0.08),_transparent_50%)]" />

      {pickReveal && !currentSlideshowPlayer ? (
        <DraftBoardPlayerReveal
          key={pickReveal.pick.id}
          revealKey={pickReveal.pick.id}
          mode="pick"
          franchiseName={pickReveal.pick.franchiseName}
          playerName={pickReveal.pick.playerName}
          playerRole={pickReveal.pick.playerRole}
          playerCategory={pickReveal.pick.playerCategory}
          shirtNumber={pickReveal.pick.shirtNumber}
          photoUrl={pickReveal.photoUrl}
          pickNumber={pickReveal.pick.pickNumber}
          isAutoPick={pickReveal.pick.isAutoPick}
        />
      ) : null}

      {squadSlideReveal ? (
        <DraftBoardPlayerReveal key={squadSlideReveal.key} {...squadSlideReveal.props} />
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

      <main className="relative z-10 flex flex-1 flex-col px-6 md:px-10 pb-6 min-h-0">
        <section className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col justify-center overflow-hidden rounded-3xl border border-mcl-forest-600 bg-mcl-forest-900/80 p-6 md:p-12 min-h-[calc(100vh-7rem)]">
            {session?.status === 'COMPLETED' ? (
              <div className="text-center draft-board-fade-in">
                <p className="text-mcl-lime-500 text-sm md:text-base font-bold uppercase tracking-[0.25em] mb-3">
                  Draft Complete
                </p>
                <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-4">
                  All picks are in
                </h2>
                {lastPick ? (
                  <p className="text-mcl-silver-400 text-lg md:text-2xl mb-8">
                    Final pick · {lastPick.playerName} → {lastPick.franchiseName}
                  </p>
                ) : null}

                <div className="mx-auto max-w-5xl text-left">
                  <div className="rounded-3xl border border-mcl-gold-500/30 bg-gradient-to-b from-mcl-forest-900/95 to-mcl-forest-950/90 p-5 shadow-[0_0_40px_rgba(212,175,55,0.08)] sm:p-7 md:p-9">
                    <div className="mb-2 h-1 w-14 rounded-full bg-gradient-to-r from-mcl-gold-500 to-mcl-lime-500" />
                    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-[0.28em] text-mcl-gold-400 sm:text-sm md:text-base">
                          Show Franchise Squad on Screen
                        </h3>
                        <p className="mt-2 text-sm text-mcl-silver-400 sm:text-base md:text-lg">
                          Select a franchise to showcase every player on the LED board.
                        </p>
                      </div>
                      {slideshowPlaying || activeSlideshowFranchiseId ? (
                        <button
                          type="button"
                          onClick={stopSlideshow}
                          className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/20 transition sm:text-sm">
                          <Square size={14} />
                          Stop
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                      {franchises.map(franchise => {
                        const squad = buildFranchiseSquadSlideshow(
                          franchise,
                          picks,
                          lockedPlayers,
                        );
                        const isActive =
                          activeSlideshowFranchiseId === franchise.id &&
                          slideshowPlaying;
                        return (
                          <button
                            key={franchise.id}
                            type="button"
                            disabled={squad.length === 0}
                            onClick={() => startLocalSlideshow(franchise.id)}
                            className={`group rounded-2xl border px-5 py-5 text-left transition-all duration-300 sm:px-6 sm:py-6 md:px-7 md:py-7 ${
                              isActive
                                ? 'border-mcl-lime-500 bg-mcl-lime-500/15 shadow-[0_0_32px_rgba(163,207,45,0.28)]'
                                : squad.length === 0
                                  ? 'border-mcl-forest-700 bg-mcl-forest-900/40 opacity-50 cursor-not-allowed'
                                  : 'border-mcl-forest-600 bg-mcl-forest-800/80 hover:-translate-y-0.5 hover:border-mcl-gold-500/55 hover:bg-mcl-forest-800 hover:shadow-[0_8px_28px_rgba(212,175,55,0.12)]'
                            }`}>
                            <p
                              className={`text-xl font-extrabold leading-tight sm:text-2xl md:text-3xl lg:text-[2rem] ${
                                isActive
                                  ? 'text-mcl-lime-400'
                                  : 'text-white group-hover:text-mcl-gold-400'
                              }`}>
                              {franchise.name}
                            </p>
                            <p className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-mcl-lime-500 sm:text-base">
                              {squad.length} players · 4s each
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-6 text-sm leading-relaxed text-mcl-silver-400 sm:text-base md:text-lg">
                      Tap a franchise to play each squad member on this screen — photo,
                      name, role, and details for 4 seconds, same as live picks.
                    </p>
                  </div>
                </div>
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
                    clockUrgent ? 'text-red-400' : 'text-mcl-silver-400'
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
              <div className="draft-board-fade-in flex flex-1 flex-col items-center justify-center text-center">
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
      </main>
    </div>
  );
}
