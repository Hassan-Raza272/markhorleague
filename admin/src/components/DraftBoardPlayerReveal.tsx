import type { SquadSlideshowPlayer } from '../utils/squadSlideshow';

const REVEAL_MS = 15_000;
export const SQUAD_SLIDE_MS = 4_000;

function shortName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

type Props = {
  mode: 'pick' | 'squad';
  franchiseName: string;
  playerName: string;
  playerRole: string;
  playerCategory?: string;
  shirtNumber?: string;
  photoUrl?: string;
  pickNumber?: number;
  isAutoPick?: boolean;
  squadIndex?: number;
  squadTotal?: number;
  squadBadge?: 'OWNER' | 'LOCK' | 'PICK';
};

export function DraftBoardPlayerReveal({
  mode,
  franchiseName,
  playerName,
  playerRole,
  playerCategory,
  shirtNumber,
  photoUrl,
  pickNumber,
  isAutoPick,
  squadIndex,
  squadTotal,
  squadBadge,
}: Props) {
  const badgeLabel =
    mode === 'pick'
      ? isAutoPick
        ? 'Auto Pick'
        : 'New Pick'
      : 'Squad Player';

  return (
    <div className="fixed inset-0 z-50 draft-board-reveal overflow-y-auto overflow-x-hidden bg-[#020805]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(212,175,55,0.22)_0%,_transparent_52%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(163,207,45,0.14)_0%,_transparent_42%)]" />
      <div className="pointer-events-none fixed -left-24 top-1/4 h-[55vh] w-[55vh] rounded-full bg-mcl-lime-500/10 blur-3xl" />
      <div className="pointer-events-none fixed -right-24 bottom-1/4 h-[50vh] w-[50vh] rounded-full bg-mcl-gold-500/10 blur-3xl" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-mcl-gold-500/70 to-transparent" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-mcl-lime-500/50 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full flex-col items-center justify-center px-6 pb-8 sm:px-10 md:px-16 lg:px-20 xl:px-24">
        <div className="draft-board-reveal-badge flex shrink-0 items-center gap-2 sm:gap-3">
          <img
            src="/mcl-logo.png"
            alt=""
            className="h-8 w-8 rounded-full object-cover ring-2 ring-mcl-gold-500/60 sm:h-10 sm:w-10 md:h-12 md:w-12"
          />
          <div className="text-left">
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-mcl-gold-400 sm:text-[10px] md:text-xs">
              Markhor Cricket League
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mcl-silver-400 sm:text-xs md:text-sm">
              Season 4 · {mode === 'pick' ? 'Live Draft' : 'Official Squad'}
            </p>
          </div>
        </div>

        <div className="draft-board-reveal-badge mt-3 inline-flex max-w-full shrink-0 flex-wrap items-center justify-center gap-2 rounded-full border border-mcl-gold-500/50 bg-mcl-gold-500/10 px-3 py-2 backdrop-blur-sm sm:mt-4 sm:gap-3 sm:px-5 sm:py-2.5 md:px-7 md:py-3">
          <span className="h-2 w-2 shrink-0 rounded-full bg-mcl-lime-500 draft-board-live-pulse" />
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-mcl-gold-400 sm:text-sm md:text-lg">
            {badgeLabel}
          </p>
          {mode === 'pick' && pickNumber != null ? (
            <span className="rounded-full bg-mcl-forest-900/80 px-2.5 py-0.5 text-xs font-extrabold text-white sm:px-3 sm:py-1 sm:text-sm md:text-base">
              #{pickNumber}
            </span>
          ) : null}
          {mode === 'squad' && squadIndex != null && squadTotal != null ? (
            <span className="rounded-full bg-mcl-forest-900/80 px-2.5 py-0.5 text-xs font-extrabold text-white sm:px-3 sm:py-1 sm:text-sm md:text-base">
              {squadIndex + 1}/{squadTotal}
            </span>
          ) : null}
          {mode === 'squad' && squadBadge ? (
            <span className="rounded-full border border-mcl-gold-500/40 bg-mcl-gold-500/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-mcl-gold-400 sm:px-3 sm:py-1 sm:text-xs">
              {squadBadge}
            </span>
          ) : null}
        </div>

        <div className="mx-auto mt-10 flex w-fit max-w-full flex-row items-center justify-center gap-4 sm:mt-12 sm:gap-6 md:mt-16 md:gap-10 lg:mt-20 lg:gap-14">
          <div className="draft-board-reveal-photo relative shrink-0">
            <div className="absolute -inset-3 rounded-[28px] border border-mcl-lime-500/25 sm:-inset-4 sm:rounded-[32px] md:-inset-6 md:rounded-[40px] lg:-inset-8 lg:rounded-[48px]" />
            <div className="absolute -inset-1.5 rounded-[24px] border border-mcl-gold-500/40 sm:-inset-2.5 sm:rounded-[28px] md:-inset-4 md:rounded-[36px]" />
            <div className="draft-board-reveal-ring relative aspect-square overflow-hidden rounded-[24px] sm:rounded-[28px] md:rounded-[36px] lg:rounded-[44px] xl:rounded-[52px]">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={playerName}
                  className="aspect-square h-[clamp(200px,42dvh,620px)] w-[clamp(200px,42dvh,620px)] rounded-[24px] object-cover sm:h-[clamp(260px,48dvh,700px)] sm:w-[clamp(260px,48dvh,700px)] sm:rounded-[28px] md:h-[clamp(320px,58dvh,780px)] md:w-[clamp(320px,58dvh,780px)] md:rounded-[36px] lg:h-[clamp(380px,66dvh,860px)] lg:w-[clamp(380px,66dvh,860px)] lg:rounded-[44px] xl:h-[clamp(420px,72dvh,920px)] xl:w-[clamp(420px,72dvh,920px)] xl:rounded-[52px]"
                />
              ) : (
                <div className="flex aspect-square h-[clamp(200px,42dvh,620px)] w-[clamp(200px,42dvh,620px)] items-center justify-center rounded-[24px] bg-gradient-to-b from-mcl-forest-700 to-mcl-forest-900 sm:h-[clamp(260px,48dvh,700px)] sm:w-[clamp(260px,48dvh,700px)] sm:rounded-[28px] md:h-[clamp(320px,58dvh,780px)] md:w-[clamp(320px,58dvh,780px)] md:rounded-[36px] lg:h-[clamp(380px,66dvh,860px)] lg:w-[clamp(380px,66dvh,860px)] lg:rounded-[44px] xl:h-[clamp(420px,72dvh,920px)] xl:w-[clamp(420px,72dvh,920px)] xl:rounded-[52px]">
                  <span className="text-6xl font-extrabold tracking-tight text-mcl-lime-500 sm:text-7xl md:text-8xl lg:text-9xl">
                    {shortName(playerName)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex max-w-[min(100%,520px)] shrink-0 flex-col items-start justify-center gap-3 text-left sm:gap-4 md:max-w-[560px] md:gap-4 lg:max-w-[640px]">
            <div className="draft-board-reveal-text w-full">
              <h2 className="text-xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl">
                {playerName}
              </h2>
            </div>

            <div className="draft-board-reveal-text-delay flex w-full flex-col items-start gap-3 md:gap-4">
              <p className="text-base font-extrabold leading-snug text-mcl-lime-500 sm:text-xl md:text-3xl lg:text-4xl xl:text-5xl">
                {franchiseName}
              </p>

              <div className="flex max-w-full flex-wrap items-center justify-start gap-1.5 sm:gap-2 md:gap-3">
                <span className="rounded-full border border-mcl-forest-600 bg-mcl-forest-900/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-mcl-silver-100 sm:px-4 sm:py-1.5 sm:text-sm md:text-base">
                  {playerRole}
                </span>
                {playerCategory ? (
                  <span className="rounded-full border border-mcl-gold-500/35 bg-mcl-gold-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-mcl-gold-400 sm:px-4 sm:py-1.5 sm:text-sm md:text-base">
                    {playerCategory}
                  </span>
                ) : null}
                {shirtNumber ? (
                  <span className="rounded-full border border-mcl-lime-500/40 bg-mcl-lime-500/10 px-3 py-1 text-[11px] font-extrabold text-mcl-lime-400 sm:px-4 sm:py-1.5 sm:text-sm md:text-base">
                    #{shirtNumber}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { REVEAL_MS };

export function squadPlayerToRevealProps(
  player: SquadSlideshowPlayer,
  franchiseName: string,
  index: number,
  total: number,
  photoUrl?: string,
) {
  return {
    mode: 'squad' as const,
    franchiseName,
    playerName: player.name,
    playerRole: player.role,
    playerCategory: player.category,
    shirtNumber: player.shirtNumber,
    photoUrl: photoUrl ?? player.profileImage,
    squadIndex: index,
    squadTotal: total,
    squadBadge: player.badge,
  };
}
