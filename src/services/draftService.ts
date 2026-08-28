import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  runTransaction,
  onSnapshot,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import {
  COLLECTIONS,
  DRAFT,
} from '../constants';
import {
  DraftPick,
  DraftSession,
  Franchise,
  Player,
} from '../types';
import {
  getPickDetails,
  getFranchiseIdForPick,
  getDraftSize,
  isDraftComplete,
  getLiveDraftTotalPicks,
} from '../utils/draftOrder';
import { getPickClockRemainingMs } from '../utils/pickClock';
import { assignFranchiseAdmin, createAuditLog, mapPlayer } from './playerService';

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
    totalRounds: (data.totalRounds as number) ?? DRAFT.ROUNDS,
    picksPerFranchise: (data.picksPerFranchise as number) ?? DRAFT.PICKS_PER_FRANCHISE,
    totalPicks: (data.totalPicks as number) ?? DRAFT.TOTAL_PICKS,
    currentPickNumber: (data.currentPickNumber as number) ?? 1,
    pickClockRunning: (data.pickClockRunning as boolean) ?? false,
    pickClockStartedAt: data.pickClockStartedAt
      ? toDate(data.pickClockStartedAt)
      : undefined,
    pickClockForPickNumber: data.pickClockForPickNumber as number | undefined,
    pickClockDurationMs:
      (data.pickClockDurationMs as number) ?? DRAFT.PICK_CLOCK_MS,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    startedAt: data.startedAt ? toDate(data.startedAt) : undefined,
    completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
    createdBy: data.createdBy as string | undefined,
    squadSlideshowFranchiseId: data.squadSlideshowFranchiseId as string | undefined,
    squadSlideshowToken: data.squadSlideshowToken as number | undefined,
  };
}

function franchisesInDraftOrder(franchises: Franchise[]): Franchise[] {
  return [...franchises].sort((a, b) => a.orderIndex - b.orderIndex);
}

function franchiseIdsInDraftOrder(franchises: Franchise[]): string[] {
  return franchisesInDraftOrder(franchises).map(franchise => franchise.id);
}

/**
 * Draft rotation uses only saved/added franchises.
 * SETUP follows the current franchise list. Live drafts keep the frozen
 * order, dropping any ids that were removed from the collection.
 */
function resolveDraftFranchiseOrder(
  session: DraftSession,
  franchises: Franchise[],
): string[] {
  const liveOrder = franchiseIdsInDraftOrder(franchises);
  const liveIds = new Set(liveOrder);

  if (session.status === 'SETUP' || liveOrder.length === 0) {
    return liveOrder;
  }

  const kept = session.franchiseOrder.filter(id => liveIds.has(id));
  return kept.length > 0 ? kept : liveOrder;
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

function picksCollection(sessionId: string) {
  return collection(
    getFirebaseDb(),
    COLLECTIONS.DRAFT_SESSIONS,
    sessionId,
    'picks',
  );
}

function sessionRef(sessionId: string = DRAFT.SESSION_ID) {
  return doc(getFirebaseDb(), COLLECTIONS.DRAFT_SESSIONS, sessionId);
}

function stoppedClockFields() {
  return {
    pickClockRunning: false,
    pickClockStartedAt: null,
    pickClockForPickNumber: null,
    pickClockDurationMs: DRAFT.PICK_CLOCK_MS,
  };
}

export async function countDraftPoolPlayers(): Promise<number> {
  const [snap, franchises] = await Promise.all([
    getDocs(
      query(
        collection(getFirebaseDb(), COLLECTIONS.PLAYERS),
        where('status', '==', 'APPROVED'),
      ),
    ),
    getFranchises(),
  ]);
  return snap.docs.filter(d => {
    const player = mapPlayer(d.id, d.data() as Record<string, unknown>);
    return isPlayerDraftEligible(player, franchises);
  }).length;
}

async function getEligibleDraftPlayers(): Promise<Player[]> {
  const [snap, franchises] = await Promise.all([
    getDocs(
      query(
        collection(getFirebaseDb(), COLLECTIONS.PLAYERS),
        where('status', '==', 'APPROVED'),
      ),
    ),
    getFranchises(),
  ]);
  return snap.docs
    .map(d => mapPlayer(d.id, d.data() as Record<string, unknown>))
    .filter(player => isPlayerDraftEligible(player, franchises));
}

export async function syncDraftSizeFromApprovedPlayers(
  sessionId: string = DRAFT.SESSION_ID,
): Promise<DraftSession | null> {
  const session = await getDraftSession(sessionId);
  if (!session || session.status === 'COMPLETED') return session;

  const franchises = await getFranchises();
  const franchiseOrder = resolveDraftFranchiseOrder(session, franchises);
  const franchiseCount = Math.max(franchiseOrder.length, 1);
  const remainingEligibleCount = await countDraftPoolPlayers();
  const livePicks =
    session.status === 'IN_PROGRESS' ? await getDraftPicks(sessionId) : [];
  const totalDraftPlayers =
    session.status === 'IN_PROGRESS'
      ? remainingEligibleCount + livePicks.length
      : remainingEligibleCount;
  const size = getDraftSize(totalDraftPlayers, franchiseCount);
  const orderChanged =
    franchiseOrder.join(',') !== session.franchiseOrder.join(',');
  const completed =
    session.status === 'IN_PROGRESS' && remainingEligibleCount === 0;
  const nextStatus = completed ? 'COMPLETED' : session.status;

  if (
    !orderChanged &&
    session.totalPicks === size.totalPicks &&
    session.totalRounds === size.totalRounds &&
    session.picksPerFranchise === size.picksPerFranchise &&
    session.status === nextStatus
  ) {
    return session;
  }

  await updateDoc(sessionRef(sessionId), {
    ...size,
    franchiseOrder,
    status: nextStatus,
    completedAt: completed ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });

  return getDraftSession(sessionId);
}

export function isFranchiseOwnerPlayer(
  player: Player,
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

export function getFranchiseOwnerPlayer(
  players: Player[],
  franchise: Franchise,
): Player | undefined {
  return players.find(player => isFranchiseOwnerPlayer(player, franchise));
}

export function extraLockedPlayerIds(
  franchise: Franchise,
  ownerPlayerId?: string,
): string[] {
  return franchise.lockedPlayerIds.filter(id => id !== ownerPlayerId);
}

export function getExtraLockedPlayers(
  players: Player[],
  franchise: Franchise,
): Player[] {
  return players.filter(
    player =>
      player.lockedFranchiseId === franchise.id &&
      !isFranchiseOwnerPlayer(player, franchise),
  );
}

export function getFranchisesMissingExtraLocks(
  franchises: Franchise[],
  players: Player[],
): Array<{ franchise: Franchise; locked: number }> {
  return franchises
    .map(franchise => ({
      franchise,
      locked: getExtraLockedPlayers(players, franchise).length,
    }))
    .filter(item => item.locked < DRAFT.LOCKS_PER_FRANCHISE);
}

export function isAnyFranchiseOwnerPlayer(
  player: Player,
  franchises: Franchise[],
): boolean {
  return franchises.some(franchise =>
    isFranchiseOwnerPlayer(player, franchise),
  );
}

export function isPlayerDraftEligible(
  player: Player,
  franchises: Franchise[] = [],
): boolean {
  return (
    player.status === 'APPROVED' &&
    !player.draftedFranchiseId &&
    player.draftPickNumber == null &&
    !player.lockedFranchiseId &&
    !isAnyFranchiseOwnerPlayer(player, franchises)
  );
}

export function buildLockedPicksForFranchise(
  players: Player[],
  franchise: Franchise,
): DraftPick[] {
  return players
    .filter(player => player.lockedFranchiseId === franchise.id)
    .sort((a, b) => {
      const aOwner = isFranchiseOwnerPlayer(a, franchise) ? 0 : 1;
      const bOwner = isFranchiseOwnerPlayer(b, franchise) ? 0 : 1;
      if (aOwner !== bOwner) return aOwner - bOwner;
      return (a.lockedAt?.getTime() ?? 0) - (b.lockedAt?.getTime() ?? 0);
    })
    .map((player, index) => ({
      id: `lock-${player.id}`,
      pickNumber: 0,
      round: 0,
      positionInRound: index,
      franchiseId: franchise.id,
      franchiseName: franchise.name,
      playerDocId: player.id,
      playerId: player.playerId,
      playerName: player.fullName,
      playerRole: player.role,
      playerCategory: player.category,
      shirtNumber: player.shirtNumber,
      kitSize: player.kitSize,
      profileImage: player.profileImage,
      pickedAt: player.lockedAt ?? new Date(),
      pickedBy: 'lock',
      isLock: true,
    }));
}

export async function lockPlayerForFranchise(
  playerDocId: string,
  franchiseId: string,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const session = await getDraftSession();
  if (session && session.status !== 'SETUP') {
    throw new Error('Players can only be locked before the draft starts');
  }

  const db = getFirebaseDb();
  const franchiseRef = doc(db, COLLECTIONS.FRANCHISES, franchiseId);
  const playerRef = doc(db, COLLECTIONS.PLAYERS, playerDocId);

  await runTransaction(db, async transaction => {
    const franchiseSnap = await transaction.get(franchiseRef);
    const playerSnap = await transaction.get(playerRef);
    if (!franchiseSnap.exists()) {
      throw new Error('Franchise not found');
    }
    if (!playerSnap.exists()) {
      throw new Error('Player not found');
    }

    const franchise = mapFranchise(
      franchiseSnap.id,
      franchiseSnap.data() as Record<string, unknown>,
    );
    const player = mapPlayer(
      playerSnap.id,
      playerSnap.data() as Record<string, unknown>,
    );

    if (player.status !== 'APPROVED') {
      throw new Error('Only approved players can be locked');
    }
    if (player.draftedFranchiseId || player.draftPickNumber != null) {
      throw new Error('This player has already been drafted');
    }
    if (
      player.lockedFranchiseId &&
      player.lockedFranchiseId !== franchiseId
    ) {
      throw new Error('This player is already locked by another franchise');
    }

    const isOwner = isFranchiseOwnerPlayer(player, franchise);
    if (isOwner) {
      if (player.lockedFranchiseId === franchiseId) return;
      transaction.update(playerRef, {
        lockedFranchiseId: franchiseId,
        lockedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      transaction.update(franchiseRef, {
        lockedPlayerIds: extraLockedPlayerIds(franchise, player.id),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    if (franchise.lockedPlayerIds.includes(playerDocId)) {
      return;
    }
    const extraLocks = extraLockedPlayerIds(franchise);
    if (extraLocks.length >= DRAFT.LOCKS_PER_FRANCHISE) {
      throw new Error(
        `You can lock only ${DRAFT.LOCKS_PER_FRANCHISE} more players besides the team owner`,
      );
    }

    transaction.update(playerRef, {
      lockedFranchiseId: franchiseId,
      lockedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(franchiseRef, {
      lockedPlayerIds: [...extraLocks, playerDocId],
      updatedAt: serverTimestamp(),
    });
  });

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'PLAYER_LOCKED',
    metadata: { franchiseId, playerDocId },
  });
}

export async function unlockPlayerForFranchise(
  playerDocId: string,
  franchiseId: string,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const session = await getDraftSession();
  if (session && session.status !== 'SETUP') {
    throw new Error('Locked players can only be changed before the draft starts');
  }

  const db = getFirebaseDb();
  const franchiseRef = doc(db, COLLECTIONS.FRANCHISES, franchiseId);
  const playerRef = doc(db, COLLECTIONS.PLAYERS, playerDocId);

  await runTransaction(db, async transaction => {
    const franchiseSnap = await transaction.get(franchiseRef);
    const playerSnap = await transaction.get(playerRef);
    if (!franchiseSnap.exists() || !playerSnap.exists()) {
      throw new Error('Franchise or player not found');
    }

    const franchise = mapFranchise(
      franchiseSnap.id,
      franchiseSnap.data() as Record<string, unknown>,
    );
    const player = mapPlayer(
      playerSnap.id,
      playerSnap.data() as Record<string, unknown>,
    );

    if (isFranchiseOwnerPlayer(player, franchise)) {
      throw new Error('The franchise owner is auto-locked and cannot be unlocked');
    }

    if (player.lockedFranchiseId && player.lockedFranchiseId !== franchiseId) {
      throw new Error('This player is locked by another franchise');
    }

    transaction.update(playerRef, {
      lockedFranchiseId: null,
      lockedAt: null,
      updatedAt: serverTimestamp(),
    });
    const franchiseUpdate: Record<string, unknown> = {
      lockedPlayerIds: franchise.lockedPlayerIds.filter(id => id !== playerDocId),
      updatedAt: serverTimestamp(),
    };
    if (franchise.captainPlayerId === playerDocId) {
      franchiseUpdate.captainPlayerId = null;
    }
    transaction.update(franchiseRef, franchiseUpdate);
  });

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'PLAYER_UNLOCKED',
    metadata: { franchiseId, playerDocId },
  });
}

/**
 * Set franchise captain to the owner or any player locked to that franchise.
 * Super admin or that franchise's admin may call this.
 */
export async function setFranchiseCaptain(
  franchiseId: string,
  playerDocId: string,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const db = getFirebaseDb();
  const franchiseRef = doc(db, COLLECTIONS.FRANCHISES, franchiseId);
  const playerRef = doc(db, COLLECTIONS.PLAYERS, playerDocId);

  await runTransaction(db, async transaction => {
    const franchiseSnap = await transaction.get(franchiseRef);
    const playerSnap = await transaction.get(playerRef);
    if (!franchiseSnap.exists()) {
      throw new Error('Franchise not found');
    }
    if (!playerSnap.exists()) {
      throw new Error('Player not found');
    }

    const franchise = mapFranchise(
      franchiseSnap.id,
      franchiseSnap.data() as Record<string, unknown>,
    );
    const player = mapPlayer(
      playerSnap.id,
      playerSnap.data() as Record<string, unknown>,
    );

    if (player.status !== 'APPROVED') {
      throw new Error('Only approved players can be captain');
    }

    const isOwner = isFranchiseOwnerPlayer(player, franchise);
    const isLockedHere = player.lockedFranchiseId === franchiseId;
    if (!isOwner && !isLockedHere) {
      throw new Error(
        'Captain must be the franchise owner or a locked player on this team',
      );
    }

    if (franchise.captainPlayerId === playerDocId) {
      return;
    }

    transaction.update(franchiseRef, {
      captainPlayerId: playerDocId,
      updatedAt: serverTimestamp(),
    });
  });

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'CAPTAIN_SET',
    metadata: { franchiseId, playerDocId },
  });
}

export async function ensureFranchiseOwnerLocked(
  franchiseId: string,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const session = await getDraftSession();
  if (session && session.status !== 'SETUP') return;

  const db = getFirebaseDb();
  const franchiseRef = doc(db, COLLECTIONS.FRANCHISES, franchiseId);
  const franchiseSnap = await getDoc(franchiseRef);
  if (!franchiseSnap.exists()) return;

  const franchise = mapFranchise(
    franchiseSnap.id,
    franchiseSnap.data() as Record<string, unknown>,
  );
  if (!franchise.adminUserId && !franchise.adminEmail) return;

  const playersSnap = await getDocs(collection(db, COLLECTIONS.PLAYERS));
  const owner = playersSnap.docs
    .map(d => mapPlayer(d.id, d.data() as Record<string, unknown>))
    .find(player => isFranchiseOwnerPlayer(player, franchise));
  if (!owner || owner.status !== 'APPROVED') return;
  if (owner.lockedFranchiseId === franchiseId) return;

  await updateDoc(doc(db, COLLECTIONS.PLAYERS, owner.id), {
    lockedFranchiseId: franchiseId,
    lockedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function ensureAllFranchiseOwnersLocked(
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const franchises = await getFranchises();
  for (const franchise of franchises) {
    await ensureFranchiseOwnerLocked(franchise.id, adminId, adminEmail);
  }
}

export async function getFranchises(): Promise<Franchise[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(collection(db, COLLECTIONS.FRANCHISES));
  return snap.docs
    .map(d => mapFranchise(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export function subscribeFranchises(
  onData: (franchises: Franchise[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(getFirebaseDb(), COLLECTIONS.FRANCHISES),
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

export async function getDraftSession(
  sessionId: string = DRAFT.SESSION_ID,
): Promise<DraftSession | null> {
  const snap = await getDoc(sessionRef(sessionId));
  if (!snap.exists()) return null;
  return mapDraftSession(snap.id, snap.data() as Record<string, unknown>);
}

export async function getDraftPicks(
  sessionId: string = DRAFT.SESSION_ID,
): Promise<DraftPick[]> {
  const q = query(picksCollection(sessionId), orderBy('pickNumber', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d =>
    mapDraftPick(d.id, d.data() as Record<string, unknown>),
  );
}

export function subscribeDraftSession(
  sessionId: string,
  onData: (session: DraftSession | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    sessionRef(sessionId),
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
  sessionId: string,
  onData: (picks: DraftPick[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(picksCollection(sessionId), orderBy('pickNumber', 'asc'));
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

export type FranchiseSetupEntry = {
  id: string;
  name: string;
};

export function nextFranchiseId(existingIds: string[]): string {
  let max = 0;
  for (const id of existingIds) {
    const match = /^f(\d+)$/i.exec(id.trim());
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `f${max + 1}`;
}

async function cleanupRemovedFranchise(
  franchise: Franchise,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (franchise.adminUserId || franchise.adminEmail) {
    await assignFranchiseAdmin(franchise.id, '', adminId, adminEmail);
  }

  const lockedSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.PLAYERS),
      where('lockedFranchiseId', '==', franchise.id),
    ),
  );
  for (const playerDoc of lockedSnap.docs) {
    await updateDoc(playerDoc.ref, {
      lockedFranchiseId: null,
      lockedAt: null,
      updatedAt: serverTimestamp(),
    });
  }

  await deleteDoc(doc(db, COLLECTIONS.FRANCHISES, franchise.id));
}

export async function setupDraftFranchises(
  entries: FranchiseSetupEntry[],
  adminId: string,
  adminEmail: string,
): Promise<Franchise[]> {
  const session = await getDraftSession();
  if (session && session.status !== 'SETUP') {
    throw new Error('Franchises can only be changed before the draft starts');
  }

  if (entries.length < DRAFT.MIN_FRANCHISES) {
    throw new Error(
      `Add at least ${DRAFT.MIN_FRANCHISES} franchises before saving`,
    );
  }
  if (entries.length > DRAFT.MAX_FRANCHISES) {
    throw new Error(
      `You can have at most ${DRAFT.MAX_FRANCHISES} franchises`,
    );
  }

  const trimmed = entries.map(entry => ({
    id: entry.id.trim(),
    name: entry.name.trim(),
  }));
  if (trimmed.some(entry => !entry.id || !entry.name)) {
    throw new Error('All franchise names are required');
  }
  if (new Set(trimmed.map(entry => entry.id)).size !== trimmed.length) {
    throw new Error('Each franchise must have a unique id');
  }

  const existing = await getFranchises();
  const keepIds = new Set(trimmed.map(entry => entry.id));
  const removed = existing.filter(franchise => !keepIds.has(franchise.id));
  for (const franchise of removed) {
    await cleanupRemovedFranchise(franchise, adminId, adminEmail);
  }

  const remaining = await getFranchises();
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  const franchises: Franchise[] = [];
  const now = new Date();

  for (let i = 0; i < trimmed.length; i += 1) {
    const { id, name } = trimmed[i];
    const current = remaining.find(franchise => franchise.id === id);
    const ref = doc(db, COLLECTIONS.FRANCHISES, id);
    const shortCode = `F${i + 1}`;
    batch.set(
      ref,
      {
        name,
        orderIndex: i,
        shortCode,
        updatedAt: serverTimestamp(),
        ...(current
          ? {}
          : { createdAt: serverTimestamp(), lockedPlayerIds: [] }),
      },
      { merge: true },
    );
    franchises.push({
      id,
      name,
      orderIndex: i,
      shortCode,
      adminUserId: current?.adminUserId,
      adminEmail: current?.adminEmail,
      lockedPlayerIds: current?.lockedPlayerIds ?? [],
      captainPlayerId: current?.captainPlayerId,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    });
  }

  const franchiseOrder = franchises.map(franchise => franchise.id);
  const size = getDraftSize(
    await countDraftPoolPlayers(),
    franchiseOrder.length,
  );
  const sessionPayload = {
    status: 'SETUP',
    franchiseOrder,
    totalRounds: size.totalRounds,
    picksPerFranchise: size.picksPerFranchise,
    totalPicks: size.totalPicks,
    currentPickNumber: 1,
    ...stoppedClockFields(),
    createdBy: adminId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  batch.set(sessionRef(), sessionPayload, { merge: true });

  await batch.commit();

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'DRAFT_SETUP',
    metadata: {
      franchiseNames: trimmed.map(entry => entry.name),
      franchiseIds: franchiseOrder,
    },
  });

  return franchises;
}

export async function ensureDefaultDraftSetup(
  adminId: string,
  adminEmail: string,
): Promise<{ franchises: Franchise[]; session: DraftSession }> {
  const existingFranchises = await getFranchises();
  const existingSession = await getDraftSession();

  if (
    existingFranchises.length >= DRAFT.MIN_FRANCHISES &&
    existingSession
  ) {
    if (existingSession.status === 'SETUP') {
      const synced = await syncDraftSizeFromApprovedPlayers();
      return {
        franchises: existingFranchises,
        session: synced ?? existingSession,
      };
    }
    return { franchises: existingFranchises, session: existingSession };
  }

  const entries =
    existingFranchises.length > 0
      ? existingFranchises.map(franchise => ({
          id: franchise.id,
          name: franchise.name,
        }))
      : [
          { id: 'f1', name: 'Franchise 1' },
          { id: 'f2', name: 'Franchise 2' },
        ];

  while (entries.length < DRAFT.MIN_FRANCHISES) {
    entries.push({
      id: nextFranchiseId(entries.map(entry => entry.id)),
      name: `Franchise ${entries.length + 1}`,
    });
  }

  const franchises = await setupDraftFranchises(
    entries,
    adminId,
    adminEmail,
  );
  const session = await getDraftSession();
  if (!session) throw new Error('Failed to create draft session');
  return { franchises, session };
}

export async function startDraft(
  adminId: string,
  adminEmail: string,
  sessionId: string = DRAFT.SESSION_ID,
): Promise<void> {
  const session = await getDraftSession(sessionId);
  if (!session) throw new Error('Draft session not found');
  if (session.status === 'IN_PROGRESS') {
    await syncDraftSizeFromApprovedPlayers(sessionId);
    return;
  }
  if (session.status === 'COMPLETED') {
    throw new Error('Draft is already completed. Reset to start again.');
  }

  const franchises = await getFranchises();
  const franchiseOrder = franchiseIdsInDraftOrder(franchises);
  if (franchiseOrder.length < DRAFT.MIN_FRANCHISES) {
    throw new Error(
      `Set up at least ${DRAFT.MIN_FRANCHISES} franchises before starting`,
    );
  }

  const approvedSnap = await getDocs(
    query(
      collection(getFirebaseDb(), COLLECTIONS.PLAYERS),
      where('status', '==', 'APPROVED'),
    ),
  );
  const approvedPlayers = approvedSnap.docs.map(d =>
    mapPlayer(d.id, d.data() as Record<string, unknown>),
  );
  const missingLocks = getFranchisesMissingExtraLocks(
    franchises,
    approvedPlayers,
  );
  if (missingLocks.length > 0) {
    const details = missingLocks
      .map(
        item =>
          `${item.franchise.name} (${item.locked}/${DRAFT.LOCKS_PER_FRANCHISE})`,
      )
      .join(', ');
    throw new Error(
      `Assign ${DRAFT.LOCKS_PER_FRANCHISE} locked players to every franchise before starting the draft. Incomplete: ${details}`,
    );
  }

  const size = getDraftSize(
    await countDraftPoolPlayers(),
    franchiseOrder.length,
  );
  if (size.totalPicks < 1) {
    throw new Error('Approve at least one player before starting the draft');
  }

  await updateDoc(sessionRef(sessionId), {
    status: 'IN_PROGRESS',
    franchiseOrder,
    currentPickNumber: 1,
    totalPicks: size.totalPicks,
    totalRounds: size.totalRounds,
    picksPerFranchise: size.picksPerFranchise,
    startedAt: serverTimestamp(),
    ...stoppedClockFields(),
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'DRAFT_STARTED',
  });
}

export async function startPickClock(
  adminId: string,
  adminEmail: string,
  sessionId: string = DRAFT.SESSION_ID,
): Promise<void> {
  const session = await getDraftSession(sessionId);
  if (!session) throw new Error('Draft session not found');
  if (session.status !== 'IN_PROGRESS') {
    throw new Error('Draft is not in progress');
  }
  if (isDraftComplete(session.currentPickNumber, session.totalPicks)) {
    throw new Error('Draft is already complete');
  }

  const resume =
    session.pickClockForPickNumber === session.currentPickNumber &&
    !session.pickClockRunning &&
    (session.pickClockDurationMs ?? 0) > 0;
  const duration = resume
    ? session.pickClockDurationMs
    : DRAFT.PICK_CLOCK_MS;

  await updateDoc(sessionRef(sessionId), {
    pickClockRunning: true,
    pickClockStartedAt: serverTimestamp(),
    pickClockForPickNumber: session.currentPickNumber,
    pickClockDurationMs: duration,
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    adminId,
    adminEmail,
    action: resume ? 'PICK_CLOCK_RESUMED' : 'PICK_CLOCK_STARTED',
    metadata: { pickNumber: session.currentPickNumber, duration },
  });
}

export async function stopPickClock(
  adminId: string,
  adminEmail: string,
  sessionId: string = DRAFT.SESSION_ID,
): Promise<void> {
  const session = await getDraftSession(sessionId);
  if (!session) throw new Error('Draft session not found');

  const remaining = getPickClockRemainingMs(session, Date.now());

  await updateDoc(sessionRef(sessionId), {
    pickClockRunning: false,
    pickClockStartedAt: null,
    pickClockForPickNumber: session.currentPickNumber,
    pickClockDurationMs: remaining,
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'PICK_CLOCK_STOPPED',
    metadata: {
      pickNumber: session.currentPickNumber,
      remainingMs: remaining,
    },
  });
}

export async function autoPickRandomEligiblePlayer(
  adminId: string,
  adminEmail: string,
  sessionId: string = DRAFT.SESSION_ID,
  restrictToFranchiseId?: string,
): Promise<DraftPick> {
  const eligible = await getEligibleDraftPlayers();

  if (eligible.length === 0) {
    throw new Error('No eligible players remain for auto-pick');
  }

  const player = eligible[Math.floor(Math.random() * eligible.length)];
  return submitDraftPick(
    player.id,
    adminId,
    adminEmail,
    sessionId,
    restrictToFranchiseId,
    true,
  );
}

export function getOnClockFranchise(
  session: DraftSession,
  franchises: Franchise[],
): Franchise | null {
  if (session.status !== 'IN_PROGRESS') return null;
  if (isDraftComplete(session.currentPickNumber, session.totalPicks)) {
    return null;
  }

  const franchiseOrder = resolveDraftFranchiseOrder(session, franchises);
  if (franchiseOrder.length < 1) return null;

  const franchiseId = getFranchiseIdForPick(
    session.currentPickNumber,
    franchiseOrder,
  );
  return franchises.find(f => f.id === franchiseId) ?? null;
}

export async function submitDraftPick(
  playerDocId: string,
  adminId: string,
  adminEmail: string,
  sessionId: string = DRAFT.SESSION_ID,
  restrictToFranchiseId?: string,
  autoPick: boolean = false,
): Promise<DraftPick> {
  const db = getFirebaseDb();
  const playerRef = doc(db, COLLECTIONS.PLAYERS, playerDocId);
  const sessionDocRef = sessionRef(sessionId);

  if (!restrictToFranchiseId) {
    await syncDraftSizeFromApprovedPlayers(sessionId);
  }

  const franchises = await getFranchises();
  const franchiseMap = new Map(franchises.map(f => [f.id, f]));

  return runTransaction(db, async transaction => {
    const sessionSnap = await transaction.get(sessionDocRef);
    if (!sessionSnap.exists()) {
      throw new Error('Draft session not found');
    }

    const session = mapDraftSession(
      sessionSnap.id,
      sessionSnap.data() as Record<string, unknown>,
    );

    if (session.status !== 'IN_PROGRESS') {
      throw new Error('Draft is not in progress');
    }
    if (isDraftComplete(session.currentPickNumber, session.totalPicks)) {
      throw new Error('Draft is already complete');
    }

    const playerSnap = await transaction.get(playerRef);
    if (!playerSnap.exists()) {
      throw new Error('Player not found');
    }

    const player = mapPlayer(
      playerSnap.id,
      playerSnap.data() as Record<string, unknown>,
    );

    if (!isPlayerDraftEligible(player, franchises)) {
      throw new Error('Player is not eligible for the draft');
    }

    const pickNumber = session.currentPickNumber;
    const franchiseOrder = resolveDraftFranchiseOrder(session, franchises);
    if (franchiseOrder.length < 1) {
      throw new Error('No franchises are set up for this draft');
    }
    const details = getPickDetails(pickNumber, franchiseOrder.length);
    const franchiseId = getFranchiseIdForPick(pickNumber, franchiseOrder);
    const franchise = franchiseMap.get(franchiseId);
    if (!franchise) {
      throw new Error('Franchise not found for this pick');
    }

    if (
      restrictToFranchiseId &&
      restrictToFranchiseId !== franchiseId
    ) {
      throw new Error('It is not your franchise\'s turn to pick');
    }

    if (restrictToFranchiseId && !session.pickClockRunning) {
      throw new Error('Wait for super admin to start the pick clock');
    }

    const pickRef = doc(picksCollection(sessionId), String(pickNumber));
    const existingPick = await transaction.get(pickRef);
    if (existingPick.exists()) {
      throw new Error('This pick has already been made');
    }

    const pickData = {
      pickNumber,
      round: details.round,
      positionInRound: details.positionInRound,
      franchiseId,
      franchiseName: franchise.name,
      playerDocId: player.id,
      playerId: player.playerId,
      playerName: player.fullName,
      playerRole: player.role,
      playerCategory: player.category ?? null,
      shirtNumber: player.shirtNumber ?? null,
      kitSize: player.kitSize ?? null,
      profileImage: player.profileImage ?? null,
      pickedAt: serverTimestamp(),
      pickedBy: adminId,
      isAutoPick: autoPick,
    };

    transaction.set(pickRef, pickData);

    transaction.update(playerRef, {
      draftedFranchiseId: franchiseId,
      draftPickNumber: pickNumber,
      draftedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const nextPickNumber = pickNumber + 1;

    transaction.update(sessionDocRef, {
      currentPickNumber: nextPickNumber,
      franchiseOrder,
      status: 'IN_PROGRESS',
      completedAt: null,
      ...stoppedClockFields(),
      updatedAt: serverTimestamp(),
    });

    return mapDraftPick(String(pickNumber), {
      ...pickData,
      pickedAt: new Date(),
    });
  }).then(async pick => {
    await createAuditLog({
      adminId,
      adminEmail,
      action: autoPick ? 'DRAFT_AUTO_PICK' : 'DRAFT_PICK',
      playerId: pick.playerId,
      metadata: {
        pickNumber: pick.pickNumber,
        franchiseId: pick.franchiseId,
        franchiseName: pick.franchiseName,
        autoPick,
      },
    });

    const updatedSession = await getDraftSession(sessionId);
    if (!updatedSession || updatedSession.status !== 'IN_PROGRESS') {
      return pick;
    }

    const remainingEligible = await getEligibleDraftPlayers();
    const liveTotal = getLiveDraftTotalPicks(
      pick.pickNumber,
      remainingEligible.length,
      updatedSession.totalPicks,
    );
    const size = getDraftSize(
      liveTotal,
      Math.max(updatedSession.franchiseOrder.length, 1),
    );

    if (remainingEligible.length === 0) {
      await updateDoc(sessionRef(sessionId), {
        ...size,
        status: 'COMPLETED',
        completedAt: serverTimestamp(),
        ...stoppedClockFields(),
        updatedAt: serverTimestamp(),
      });
      return pick;
    }

    await updateDoc(sessionRef(sessionId), {
      ...size,
      status: 'IN_PROGRESS',
      completedAt: null,
      ...stoppedClockFields(),
      updatedAt: serverTimestamp(),
    });

    if (remainingEligible.length === 1) {
      await submitDraftPick(
        remainingEligible[0].id,
        adminId,
        adminEmail,
        sessionId,
        undefined,
        true,
      );
    }

    return pick;
  });
}

export async function completeDraft(
  adminId: string,
  adminEmail: string,
  sessionId: string = DRAFT.SESSION_ID,
): Promise<void> {
  const session = await getDraftSession(sessionId);
  if (!session) throw new Error('Draft session not found');
  if (session.status === 'COMPLETED') {
    return;
  }
  if (session.status !== 'IN_PROGRESS') {
    throw new Error('Draft must be in progress to complete');
  }

  const picksMade = Math.max(session.currentPickNumber - 1, 0);
  const remainingEligible = await countDraftPoolPlayers();

  await updateDoc(sessionRef(sessionId), {
    status: 'COMPLETED',
    completedAt: serverTimestamp(),
    ...stoppedClockFields(),
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'DRAFT_COMPLETED',
    metadata: {
      forceCompleted: true,
      picksMade,
      remainingEligible,
    },
  });
}

export async function startSquadSlideshowOnBoard(
  franchiseId: string,
  adminId: string,
  adminEmail: string,
  sessionId: string = DRAFT.SESSION_ID,
): Promise<void> {
  const session = await getDraftSession(sessionId);
  if (!session) throw new Error('Draft session not found');
  if (session.status !== 'COMPLETED') {
    throw new Error('Squad slideshow is available after the draft is complete');
  }

  await updateDoc(sessionRef(sessionId), {
    squadSlideshowFranchiseId: franchiseId,
    squadSlideshowToken: Date.now(),
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'SQUAD_SLIDESHOW_STARTED',
    metadata: { franchiseId },
  });
}

export async function stopSquadSlideshowOnBoard(
  adminId: string,
  adminEmail: string,
  sessionId: string = DRAFT.SESSION_ID,
): Promise<void> {
  const session = await getDraftSession(sessionId);
  if (!session) throw new Error('Draft session not found');

  await updateDoc(sessionRef(sessionId), {
    squadSlideshowFranchiseId: null,
    squadSlideshowToken: null,
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'SQUAD_SLIDESHOW_STOPPED',
  });
}

export async function resetDraft(
  adminId: string,
  adminEmail: string,
  sessionId: string = DRAFT.SESSION_ID,
): Promise<void> {
  const db = getFirebaseDb();
  const picksSnap = await getDocs(picksCollection(sessionId));
  const playersSnap = await getDocs(
    query(collection(db, COLLECTIONS.PLAYERS)),
  );

  const batch = writeBatch(db);

  picksSnap.docs.forEach(pickDoc => {
    batch.delete(pickDoc.ref);
  });

  playersSnap.docs.forEach(playerDoc => {
    const data = playerDoc.data();
    if (data.draftedFranchiseId || data.draftPickNumber) {
      batch.update(playerDoc.ref, {
        draftedFranchiseId: null,
        draftPickNumber: null,
        draftedAt: null,
        updatedAt: serverTimestamp(),
      });
    }
  });

  const franchises = await getFranchises();
  const franchiseOrder = franchiseIdsInDraftOrder(franchises);
  const size = getDraftSize(
    await countDraftPoolPlayers(),
    Math.max(franchiseOrder.length, 1),
  );

  batch.set(
    sessionRef(sessionId),
    {
      status: 'SETUP',
      franchiseOrder,
      currentPickNumber: 1,
      totalPicks: size.totalPicks,
      totalRounds: size.totalRounds,
      picksPerFranchise: size.picksPerFranchise,
      startedAt: null,
      completedAt: null,
      squadSlideshowFranchiseId: null,
      squadSlideshowToken: null,
      ...stoppedClockFields(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'DRAFT_RESET',
  });
}

export async function undoLastDraftPick(
  adminId: string,
  adminEmail: string,
  sessionId: string = DRAFT.SESSION_ID,
): Promise<void> {
  const db = getFirebaseDb();
  const picks = await getDraftPicks(sessionId);
  if (picks.length === 0) {
    throw new Error('No picks to undo');
  }

  const lastPick = picks[picks.length - 1];
  const batch = writeBatch(db);

  batch.delete(doc(picksCollection(sessionId), String(lastPick.pickNumber)));

  batch.update(doc(db, COLLECTIONS.PLAYERS, lastPick.playerDocId), {
    draftedFranchiseId: null,
    draftPickNumber: null,
    draftedAt: null,
    updatedAt: serverTimestamp(),
  });

  batch.update(sessionRef(sessionId), {
    status: 'IN_PROGRESS',
    currentPickNumber: lastPick.pickNumber,
    completedAt: null,
    ...stoppedClockFields(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'DRAFT_UNDO',
    playerId: lastPick.playerId,
    metadata: { pickNumber: lastPick.pickNumber },
  });
}

export function groupPicksByFranchise(
  picks: DraftPick[],
  franchises: Franchise[],
): Map<string, DraftPick[]> {
  const grouped = new Map<string, DraftPick[]>();
  franchises.forEach(f => grouped.set(f.id, []));
  picks.forEach(pick => {
    const list = grouped.get(pick.franchiseId) ?? [];
    list.push(pick);
    grouped.set(pick.franchiseId, list);
  });
  grouped.forEach((list, id) => {
    grouped.set(
      id,
      [...list].sort((a, b) => a.pickNumber - b.pickNumber),
    );
  });
  return grouped;
}
