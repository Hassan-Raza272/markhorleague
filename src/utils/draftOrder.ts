import { DRAFT } from '../constants';

export type PickDetails = {
  pickNumber: number;
  round: number;
  positionInRound: number;
  franchiseIndex: number;
};

/** One pick per added franchise, then the next round starts. */
export function getPicksPerRound(franchiseCount: number): number {
  return Math.max(0, franchiseCount);
}

/** Rotating draft: order shifts one slot each round (not snake). */
export function getPickDetails(
  pickNumber: number,
  franchiseCount: number,
): PickDetails {
  if (pickNumber < 1) {
    throw new Error('Pick number must be at least 1');
  }
  if (franchiseCount < 1) {
    throw new Error('At least one franchise is required');
  }

  const picksPerRound = getPicksPerRound(franchiseCount);
  const round = Math.floor((pickNumber - 1) / picksPerRound) + 1;
  const positionInRound = (pickNumber - 1) % picksPerRound;
  const franchiseIndex = (positionInRound + (round - 1)) % picksPerRound;

  return {
    pickNumber,
    round,
    positionInRound,
    franchiseIndex,
  };
}

export function getFranchiseIdForPick(
  pickNumber: number,
  franchiseOrder: string[],
): string {
  const { franchiseIndex } = getPickDetails(pickNumber, franchiseOrder.length);
  const franchiseId = franchiseOrder[franchiseIndex];
  if (!franchiseId) {
    throw new Error(`No franchise at index ${franchiseIndex}`);
  }
  return franchiseId;
}

export function getRoundPickOrder(
  round: number,
  franchiseOrder: string[],
): string[] {
  const count = franchiseOrder.length;
  return Array.from({ length: count }, (_, positionInRound) => {
    const franchiseIndex = (positionInRound + (round - 1)) % count;
    const franchiseId = franchiseOrder[franchiseIndex];
    if (!franchiseId) {
      throw new Error(`No franchise at index ${franchiseIndex}`);
    }
    return franchiseId;
  });
}

export function getDraftSize(
  approvedCount: number,
  franchiseCount: number,
): { totalPicks: number; totalRounds: number; picksPerFranchise: number } {
  const totalPicks = Math.max(0, approvedCount);
  const safeCount = Math.max(1, franchiseCount);
  const totalRounds =
    totalPicks === 0 ? 0 : Math.ceil(totalPicks / safeCount);
  const picksPerFranchise =
    totalPicks === 0 ? 0 : Math.ceil(totalPicks / safeCount);
  return { totalPicks, totalRounds, picksPerFranchise };
}

export function getLiveDraftTotalPicks(
  pickedCount: number,
  remainingEligible: number,
  sessionTotalPicks: number = 0,
): number {
  return Math.max(pickedCount + remainingEligible, sessionTotalPicks, 0);
}

export function isDraftComplete(
  currentPickNumber: number,
  totalPicks: number = DRAFT.TOTAL_PICKS,
): boolean {
  if (totalPicks <= 0) return false;
  return currentPickNumber > totalPicks;
}
