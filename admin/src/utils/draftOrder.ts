export type PickDetails = {
  pickNumber: number;
  round: number;
  positionInRound: number;
  franchiseIndex: number;
};

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

  const picksPerRound = franchiseCount;
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

export function resolveDraftFranchiseOrder(
  sessionFranchiseOrder: string[],
  franchiseIds: string[],
  status: string,
): string[] {
  const liveIds = new Set(franchiseIds);
  if (status === 'SETUP' || franchiseIds.length === 0) {
    return franchiseIds;
  }
  const kept = sessionFranchiseOrder.filter(id => liveIds.has(id));
  return kept.length > 0 ? kept : franchiseIds;
}
