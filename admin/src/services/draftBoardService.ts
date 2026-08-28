import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS, DRAFT_PICK_CLOCK_MS, DRAFT_SESSION_ID } from '../constants/draft';
import type { DraftPick, DraftSession, Franchise, Player } from '../types';
import type { LockedSquadPlayer } from '../utils/squadSlideshow';

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return new Date();
}

function mapFranchise(id: string, data: Record<string, unknown>): Franchise {
  return {
    id,
    name: data.name as string,
    orderIndex: data.orderIndex as number,
    shortCode: data.shortCode as string | undefined,
    adminUserId: data.adminUserId as string | undefined,
    adminEmail: data.adminEmail as string | undefined,
    lockedPlayerIds: (data.lockedPlayerIds as string[]) ?? [],
    captainPlayerId: data.captainPlayerId as string | undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function mapDraftSession(id: string, data: Record<string, unknown>): DraftSession {
  return {
    id,
    status: data.status as DraftSession['status'],
    franchiseOrder: (data.franchiseOrder as string[]) ?? [],
    totalRounds: (data.totalRounds as number) ?? 0,
    picksPerFranchise: (data.picksPerFranchise as number) ?? 0,
    totalPicks: (data.totalPicks as number) ?? 0,
    currentPickNumber: (data.currentPickNumber as number) ?? 1,
    pickClockRunning: (data.pickClockRunning as boolean) ?? false,
    pickClockStartedAt: data.pickClockStartedAt
      ? toDate(data.pickClockStartedAt)
      : undefined,
    pickClockForPickNumber: data.pickClockForPickNumber as number | undefined,
    pickClockDurationMs:
      (data.pickClockDurationMs as number) ?? DRAFT_PICK_CLOCK_MS,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    startedAt: data.startedAt ? toDate(data.startedAt) : undefined,
    completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
    createdBy: data.createdBy as string | undefined,
    squadSlideshowFranchiseId: data.squadSlideshowFranchiseId as string | undefined,
    squadSlideshowToken: data.squadSlideshowToken as number | undefined,
  };
}

function mapDraftPick(id: string, data: Record<string, unknown>): DraftPick {
  return {
    id,
    pickNumber: data.pickNumber as number,
    round: data.round as number,
    positionInRound: data.positionInRound as number,
    franchiseId: data.franchiseId as string,
    franchiseName: data.franchiseName as string,
    playerDocId: data.playerDocId as string,
    playerId: data.playerId as string,
    playerName: data.playerName as string,
    playerRole: data.playerRole as DraftPick['playerRole'],
    playerCategory: data.playerCategory as DraftPick['playerCategory'],
    shirtNumber: data.shirtNumber as string | undefined,
    kitSize: data.kitSize as DraftPick['kitSize'],
    profileImage: (data.profileImage as string | undefined) || undefined,
    pickedAt: toDate(data.pickedAt),
    pickedBy: data.pickedBy as string,
    isAutoPick: (data.isAutoPick as boolean) ?? false,
    isLock: (data.isLock as boolean) ?? false,
  };
}

function mapPlayer(id: string, data: Record<string, unknown>): Pick<Player, 'id' | 'profileImage' | 'fullName'> {
  return {
    id,
    fullName: (data.fullName as string) ?? '',
    profileImage: data.profileImage as string | undefined,
  };
}

export function subscribeDraftSession(
  onData: (session: DraftSession | null) => void,
  onError?: (error: Error) => void,
  sessionId: string = DRAFT_SESSION_ID,
): () => void {
  return onSnapshot(
    doc(db, COLLECTIONS.DRAFT_SESSIONS, sessionId),
    snap => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(mapDraftSession(snap.id, snap.data() as Record<string, unknown>));
    },
    err => onError?.(err),
  );
}

export function subscribeDraftPicks(
  onData: (picks: DraftPick[]) => void,
  onError?: (error: Error) => void,
  sessionId: string = DRAFT_SESSION_ID,
): () => void {
  const q = query(
    collection(db, COLLECTIONS.DRAFT_SESSIONS, sessionId, 'picks'),
    orderBy('pickNumber', 'asc'),
  );
  return onSnapshot(
    q,
    snap => {
      onData(
        snap.docs.map(d =>
          mapDraftPick(d.id, d.data() as Record<string, unknown>),
        ),
      );
    },
    err => onError?.(err),
  );
}

export function subscribeFranchises(
  onData: (franchises: Franchise[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, COLLECTIONS.FRANCHISES),
    snap => {
      onData(
        snap.docs
          .map(d => mapFranchise(d.id, d.data() as Record<string, unknown>))
          .sort((a, b) => a.orderIndex - b.orderIndex),
      );
    },
    err => onError?.(err),
  );
}

function mapLockedSquadPlayer(
  id: string,
  data: Record<string, unknown>,
): LockedSquadPlayer {
  return {
    id,
    playerId: (data.playerId as string) ?? '',
    fullName: (data.fullName as string) ?? '',
    role: (data.role as string) ?? '',
    category: data.category as string | undefined,
    shirtNumber: data.shirtNumber as string | undefined,
    profileImage: data.profileImage as string | undefined,
    lockedFranchiseId: data.lockedFranchiseId as string | undefined,
    lockedAt: data.lockedAt ? toDate(data.lockedAt) : undefined,
    userId: data.userId as string | undefined,
    email: data.email as string | undefined,
  };
}

export function subscribeLockedSquadPlayers(
  onData: (players: LockedSquadPlayer[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, COLLECTIONS.PLAYERS),
    snap => {
      onData(
        snap.docs
          .map(d =>
            mapLockedSquadPlayer(d.id, d.data() as Record<string, unknown>),
          )
          .filter(player => !!player.lockedFranchiseId),
      );
    },
    err => onError?.(err),
  );
}

/** Player photos for the LED board (admin session or public list). */
export function subscribePlayerPhotos(
  onData: (byId: Record<string, string>) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, COLLECTIONS.PLAYERS),
    snap => {
      const map: Record<string, string> = {};
      for (const d of snap.docs) {
        const player = mapPlayer(d.id, d.data() as Record<string, unknown>);
        if (player.profileImage) {
          map[player.id] = player.profileImage;
        }
      }
      onData(map);
    },
    err => onError?.(err),
  );
}

export function subscribePublicPlayerPhotos(
  onData: (byId: Record<string, string>) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, 'publicPlayers'),
    snap => {
      const map: Record<string, string> = {};
      for (const d of snap.docs) {
        const data = d.data() as Record<string, unknown>;
        const image = data.profileImage as string | undefined;
        if (image) {
          map[d.id] = image;
        }
      }
      onData(map);
    },
    err => onError?.(err),
  );
}
