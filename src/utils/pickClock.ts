import { DRAFT } from '../constants';
import type { DraftSession } from '../types';

export function getPickClockRemainingMs(
  session: DraftSession | null,
  now: number = Date.now(),
): number {
  const fullDuration = DRAFT.PICK_CLOCK_MS;
  if (!session) return fullDuration;

  const duration = session.pickClockDurationMs || fullDuration;
  const forCurrentPick =
    session.pickClockForPickNumber === session.currentPickNumber;

  if (!session.pickClockRunning || !session.pickClockStartedAt || !forCurrentPick) {
    return forCurrentPick ? duration : fullDuration;
  }

  const elapsed = now - session.pickClockStartedAt.getTime();
  return Math.min(duration, Math.max(0, duration - elapsed));
}

export function isPickClockActive(session: DraftSession | null): boolean {
  return (
    !!session?.pickClockRunning &&
    session.pickClockForPickNumber === session.currentPickNumber &&
    !!session.pickClockStartedAt
  );
}

export function isPickClockPaused(session: DraftSession | null): boolean {
  return (
    !!session &&
    !session.pickClockRunning &&
    session.pickClockForPickNumber === session.currentPickNumber
  );
}

export function formatPickClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
