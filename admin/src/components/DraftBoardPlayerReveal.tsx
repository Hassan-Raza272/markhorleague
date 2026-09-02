import { memo } from 'react';
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
  revealKey: string;
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

export const DraftBoardPlayerReveal = memo(function DraftBoardPlayerReveal({
  revealKey,
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

  const hasNextSlide =
    mode === 'squad' &&
    squadIndex != null &&
    squadTotal != null &&
    squadIndex + 1 < squadTotal;

  const metaItems = [
    { label: 'Role', value: playerRole },
    ...(playerCategory ? [{ label: 'Category', value: playerCategory }] : []),
    ...(shirtNumber ? [{ label: 'Shirt', value: `#${shirtNumber}` }] : []),
  ];

  return (
    <div className="draft-board-reveal fixed inset-0 z-50 overflow-hidden">
      <div className="draft-board-reveal-bg" aria-hidden />

      <div className="draft-board-reveal-stage">
        {/* Top brand bar */}
        <header className="draft-board-reveal-header draft-board-reveal-badge">
          <div className="draft-board-reveal-brand">
            <img src="/mcl-logo.png" alt="" className="draft-board-reveal-logo" />
            <div>
              <p className="draft-board-reveal-league">Markhor Cricket League</p>
              <p className="draft-board-reveal-season">
                Season 4 · {mode === 'pick' ? 'Live Draft' : 'Official Squad'}
              </p>
            </div>
          </div>

          <div className="draft-board-reveal-status">
            <span className="draft-board-reveal-live-dot" aria-hidden />
            <span>{badgeLabel}</span>
            {mode === 'pick' && pickNumber != null ? (
              <span className="draft-board-reveal-status-chip">#{pickNumber}</span>
            ) : null}
            {mode === 'squad' && squadIndex != null && squadTotal != null ? (
              <span className="draft-board-reveal-status-chip">
                {squadIndex + 1}/{squadTotal}
              </span>
            ) : null}
            {mode === 'squad' && squadBadge ? (
              <span className="draft-board-reveal-status-tag">{squadBadge}</span>
            ) : null}
          </div>
        </header>

        {/* Main card */}
        <div className="draft-board-reveal-card">
          <div className="draft-board-reveal-photo-wrap draft-board-reveal-photo">
            <div className="draft-board-reveal-photo-frame">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={playerName}
                  loading="eager"
                  decoding="async"
                  className="draft-board-reveal-photo-img"
                />
              ) : (
                <div className="draft-board-reveal-photo-fallback">
                  {shortName(playerName)}
                </div>
              )}
            </div>
          </div>

          <div className="draft-board-reveal-info draft-board-reveal-text">
            <p className="draft-board-reveal-eyebrow">Selected for</p>
            <h2 className="draft-board-reveal-name">{playerName}</h2>
            <p className="draft-board-reveal-franchise">{franchiseName}</p>

            <div className="draft-board-reveal-meta draft-board-reveal-text-delay">
              {metaItems.map(item => (
                <div key={item.label} className="draft-board-reveal-meta-item">
                  <span className="draft-board-reveal-meta-label">{item.label}</span>
                  <span className="draft-board-reveal-meta-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {hasNextSlide ? (
          <div className="draft-board-reveal-slide-progress draft-board-reveal-text-delay" aria-hidden>
            <p className="draft-board-reveal-slide-progress-label">
              <span className="draft-board-reveal-next-chevron">›</span>
              Next player
              <span className="draft-board-reveal-next-chevron draft-board-reveal-next-chevron-delay">›</span>
            </p>
            <div className="draft-board-reveal-slide-progress-track">
              <div
                key={revealKey}
                className="draft-board-reveal-slide-progress-bar"
                style={{ animationDuration: `${SQUAD_SLIDE_MS}ms` }}
              />
            </div>
            {squadTotal != null && squadTotal <= 12 ? (
              <div className="draft-board-reveal-slide-dots">
                {Array.from({ length: squadTotal }, (_, i) => (
                  <span
                    key={i}
                    className={`draft-board-reveal-slide-dot${
                      i === squadIndex
                        ? ' draft-board-reveal-slide-dot-active'
                        : i < (squadIndex ?? 0)
                          ? ' draft-board-reveal-slide-dot-done'
                          : ''
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});

export { REVEAL_MS };

export function squadPlayerToRevealProps(
  player: SquadSlideshowPlayer,
  franchiseName: string,
  index: number,
  total: number,
  photoUrl?: string,
  revealKey?: string,
) {
  return {
    revealKey: revealKey ?? `${player.id}-${index}`,
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
