import type { DraftPick, Franchise } from '../types';

export type SquadSlideshowPlayer = {
  id: string;
  playerId: string;
  name: string;
  role: string;
  category?: string;
  shirtNumber?: string;
  profileImage?: string;
  isLock?: boolean;
  pickNumber?: number;
  badge?: 'OWNER' | 'LOCK' | 'PICK';
};

export type LockedSquadPlayer = {
  id: string;
  playerId: string;
  fullName: string;
  role: string;
  category?: string;
  shirtNumber?: string;
  profileImage?: string;
  lockedFranchiseId?: string;
  lockedAt?: Date;
  userId?: string;
  email?: string;
};

function isFranchiseOwnerPlayer(
  player: LockedSquadPlayer,
  franchise: Franchise,
): boolean {
  if (franchise.adminUserId && player.userId === franchise.adminUserId) {
    return true;
  }
  if (
    franchise.adminEmail &&
    player.email?.toLowerCase() === franchise.adminEmail.toLowerCase()
  ) {
    return true;
  }
  return false;
}

export function buildFranchiseSquadSlideshow(
  franchise: Franchise,
  picks: DraftPick[],
  lockedPlayers: LockedSquadPlayer[],
): SquadSlideshowPlayer[] {
  const franchiseLocks = lockedPlayers.filter(
    player => player.lockedFranchiseId === franchise.id,
  );

  const lockEntries: SquadSlideshowPlayer[] = franchiseLocks
    .sort((a, b) => {
      const aOwner = isFranchiseOwnerPlayer(a, franchise) ? 0 : 1;
      const bOwner = isFranchiseOwnerPlayer(b, franchise) ? 0 : 1;
      if (aOwner !== bOwner) return aOwner - bOwner;
      return (a.lockedAt?.getTime() ?? 0) - (b.lockedAt?.getTime() ?? 0);
    })
    .map(player => ({
      id: player.id,
      playerId: player.playerId,
      name: player.fullName,
      role: player.role,
      category: player.category,
      shirtNumber: player.shirtNumber,
      profileImage: player.profileImage,
      isLock: true,
      badge: isFranchiseOwnerPlayer(player, franchise) ? 'OWNER' : 'LOCK',
    }));

  const draftedEntries: SquadSlideshowPlayer[] = picks
    .filter(pick => pick.franchiseId === franchise.id && !pick.isLock)
    .sort((a, b) => a.pickNumber - b.pickNumber)
    .map(pick => ({
      id: pick.playerDocId,
      playerId: pick.playerId,
      name: pick.playerName,
      role: pick.playerRole,
      category: pick.playerCategory,
      shirtNumber: pick.shirtNumber,
      profileImage: pick.profileImage,
      pickNumber: pick.pickNumber,
      badge: 'PICK' as const,
    }));

  return [...lockEntries, ...draftedEntries];
}
