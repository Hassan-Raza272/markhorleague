import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type {
  Player,
  LeagueSettings,
  AuditLog,
  PlayerFilters,
  DashboardStats,
} from '../types';

const COLLECTIONS = {
  PLAYERS: 'players',
  SETTINGS: 'settings',
  PUBLIC_PLAYERS: 'publicPlayers',
  ADMINS: 'admins',
  AUDIT_LOGS: 'auditLogs',
  USERS: 'users',
};

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return new Date();
}

function mapPlayer(id: string, data: Record<string, unknown>): Player {
  return {
    id,
    userId: data.userId as string,
    playerId: data.playerId as string,
    fullName: data.fullName as string,
    fatherName: data.fatherName as string,
    profileImage: data.profileImage as string | undefined,
    phone: data.phone as string,
    email: data.email as string,
    cnic: data.cnic as string,
    dateOfBirth: data.dateOfBirth as string,
    age: data.age as number,
    city: data.city as string,
    address: (data.address as string | undefined) || undefined,
    role: data.role as Player['role'],
    battingStyle: data.battingStyle as Player['battingStyle'],
    bowlingStyle: data.bowlingStyle as Player['bowlingStyle'],
    yearsOfExperience: data.yearsOfExperience as number,
    previousClub: data.previousClub as string | undefined,
    achievements: data.achievements as string | undefined,
    shirtNumber: (data.shirtNumber ?? data.jerseyNumber) as string | undefined,
    kitSize: (() => {
      const value = data.kitSize as string | undefined;
      if (
        value === 'S' ||
        value === 'M' ||
        value === 'L' ||
        value === 'XL' ||
        value === '2XL' ||
        value === '3XL' ||
        value === '4XL'
      ) {
        return value;
      }
      return undefined;
    })(),
    currentClub: data.currentClub as string | undefined,
    description: data.description as string | undefined,
    videoUrl: data.videoUrl as string | undefined,
    status: ((data.status as string) === 'SUSPENDED'
      ? 'REJECTED'
      : data.status) as Player['status'],
    category: (() => {
      const value = data.category as string | undefined;
      if (value === 'JUNIOR' || value === 'SENIOR' || value === 'EMERGING') {
        return value;
      }
      return undefined;
    })(),
    rejectionReason: data.rejectionReason as string | undefined,
    draftEligible: (data.draftEligible as boolean) ?? false,
    feeReceiptUrl: data.feeReceiptUrl as string | undefined,
    feeReceiptSubmittedAt: data.feeReceiptSubmittedAt
      ? toDate(data.feeReceiptSubmittedAt)
      : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    approvedAt: data.approvedAt ? toDate(data.approvedAt) : undefined,
    approvedBy: data.approvedBy as string | undefined,
    rejectedAt: data.rejectedAt ? toDate(data.rejectedAt) : undefined,
    rejectedBy: data.rejectedBy as string | undefined,
  };
}

export async function isSuperAdmin(uid: string): Promise<boolean> {
  const adminSnap = await getDoc(doc(db, COLLECTIONS.ADMINS, uid));
  if (adminSnap.exists()) return true;
  const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  return userSnap.exists() && userSnap.data().role === 'SUPER_ADMIN';
}

export async function getAllPlayers(): Promise<Player[]> {
  const q = query(collection(db, COLLECTIONS.PLAYERS), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => mapPlayer(d.id, d.data()));
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.PLAYERS, id));
  if (!snap.exists()) return null;
  return mapPlayer(snap.id, snap.data());
}

export async function approvePlayer(
  playerDocId: string,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const playerRef = doc(db, COLLECTIONS.PLAYERS, playerDocId);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) throw new Error('Player not found');
  const data = playerSnap.data();

  await updateDoc(playerRef, {
    status: 'APPROVED',
    approvedAt: serverTimestamp(),
    approvedBy: adminId,
    rejectionReason: null,
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, COLLECTIONS.PUBLIC_PLAYERS, playerDocId), {
    playerId: data.playerId,
    fullName: data.fullName,
    profileImage: data.profileImage ?? null,
    age: data.age,
    city: data.city,
    role: data.role,
    battingStyle: data.battingStyle,
    bowlingStyle: data.bowlingStyle,
    yearsOfExperience: data.yearsOfExperience,
  });

  await createAuditLog({ adminId, adminEmail, action: 'PLAYER_APPROVED', playerId: data.playerId as string });
}

export async function rejectPlayer(
  playerDocId: string,
  adminId: string,
  adminEmail: string,
  reason: string,
): Promise<void> {
  const playerRef = doc(db, COLLECTIONS.PLAYERS, playerDocId);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) throw new Error('Player not found');

  await updateDoc(playerRef, {
    status: 'REJECTED',
    rejectedAt: serverTimestamp(),
    rejectedBy: adminId,
    rejectionReason: reason,
    updatedAt: serverTimestamp(),
  });

  await deleteDoc(doc(db, COLLECTIONS.PUBLIC_PLAYERS, playerDocId)).catch(() => {});
  await createAuditLog({
    adminId,
    adminEmail,
    action: 'PLAYER_REJECTED',
    playerId: playerSnap.data().playerId as string,
    reason,
  });
}

export async function deletePlayer(
  playerDocId: string,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const playerRef = doc(db, COLLECTIONS.PLAYERS, playerDocId);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) throw new Error('Player not found');
  const playerId = playerSnap.data().playerId as string;

  await deleteDoc(playerRef);
  await deleteDoc(doc(db, COLLECTIONS.PUBLIC_PLAYERS, playerDocId)).catch(() => {});
  await createAuditLog({ adminId, adminEmail, action: 'PLAYER_DELETED', playerId });
}

export async function updatePlayer(
  playerDocId: string,
  data: Partial<Player>,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const { id, createdAt, ...rest } = data;
  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  (Object.keys(rest) as Array<keyof typeof rest>).forEach(key => {
    const value = rest[key];
    updateData[key as string] = value === undefined ? null : value;
  });
  await updateDoc(doc(db, COLLECTIONS.PLAYERS, playerDocId), updateData);
  await createAuditLog({
    adminId,
    adminEmail,
    action: 'PLAYER_EDITED',
    playerId: data.playerId,
  });
}

export async function setDraftEligibility(
  playerDocId: string,
  eligible: boolean,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const playerRef = doc(db, COLLECTIONS.PLAYERS, playerDocId);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) throw new Error('Player not found');

  await updateDoc(playerRef, {
    draftEligible: eligible,
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    adminId,
    adminEmail,
    action: eligible ? 'DRAFT_ELIGIBLE' : 'DRAFT_NOT_ELIGIBLE',
    playerId: playerSnap.data().playerId as string,
  });
}

export async function setPlayerCategory(
  playerDocId: string,
  category: Player['category'] | null,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const playerRef = doc(db, COLLECTIONS.PLAYERS, playerDocId);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) throw new Error('Player not found');

  await updateDoc(playerRef, {
    category: category ?? null,
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    adminId,
    adminEmail,
    action: category ? 'PLAYER_CATEGORY_SET' : 'PLAYER_CATEGORY_CLEARED',
    playerId: playerSnap.data().playerId as string,
    reason: category ?? 'cleared',
  });
}

export async function getLeagueSettings(): Promise<LeagueSettings> {
  const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'league'));
  if (!snap.exists()) {
    return {
      leagueName: 'MCL 2026-27',
      season: '2026',
      registrationOpen: true,
      publicPlayerListEnabled: false,
      updatedAt: new Date(),
    };
  }
  const data = snap.data();
  return {
    leagueName: data.leagueName as string,
    season: data.season as string,
    registrationOpen: data.registrationOpen as boolean,
    registrationDeadline: data.registrationDeadline as string | undefined,
    publicPlayerListEnabled: data.publicPlayerListEnabled as boolean,
    maxRegistrations: data.maxRegistrations as number | undefined,
    updatedAt: toDate(data.updatedAt),
  };
}

export async function updateLeagueSettings(
  settings: Partial<LeagueSettings>,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.SETTINGS, 'league'),
    { ...settings, updatedAt: serverTimestamp(), updatedBy: adminId },
    { merge: true },
  );
  await createAuditLog({ adminId, adminEmail, action: 'SETTINGS_UPDATED' });
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const q = query(collection(db, COLLECTIONS.AUDIT_LOGS), orderBy('timestamp', 'desc'), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...(d.data() as Omit<AuditLog, 'id'>),
    timestamp: toDate(d.data().timestamp),
  }));
}

async function createAuditLog(
  log: Omit<AuditLog, 'id' | 'timestamp'>,
): Promise<void> {
  const payload: Record<string, unknown> = {
    adminId: log.adminId,
    adminEmail: log.adminEmail,
    action: log.action,
    timestamp: serverTimestamp(),
  };
  if (log.playerId != null) payload.playerId = log.playerId;
  if (log.reason != null && log.reason !== '') payload.reason = log.reason;
  await setDoc(doc(collection(db, COLLECTIONS.AUDIT_LOGS)), payload);
}

export function filterPlayers(players: Player[], filters: PlayerFilters): Player[] {
  return players.filter(p => {
    if (filters.status && p.status !== filters.status) return false;
    if (filters.category === 'UNASSIGNED' && p.category) return false;
    if (
      filters.category &&
      filters.category !== 'UNASSIGNED' &&
      p.category !== filters.category
    ) {
      return false;
    }
    if (filters.role && p.role !== filters.role) return false;
    if (filters.city && p.city !== filters.city) return false;
    if (filters.battingStyle && p.battingStyle !== filters.battingStyle) return false;
    if (filters.bowlingStyle && p.bowlingStyle !== filters.bowlingStyle) return false;
    if (filters.draftEligible !== undefined && p.draftEligible !== filters.draftEligible) return false;
    if (filters.ageMin !== undefined && p.age < filters.ageMin) return false;
    if (filters.ageMax !== undefined && p.age > filters.ageMax) return false;
    if (filters.dateFrom && p.createdAt < new Date(filters.dateFrom)) return false;
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59);
      if (p.createdAt > to) return false;
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const match =
        p.fullName.toLowerCase().includes(s) ||
        p.playerId.toLowerCase().includes(s) ||
        p.phone.includes(s) ||
        p.cnic.includes(s) ||
        p.city.toLowerCase().includes(s) ||
        (p.previousClub?.toLowerCase().includes(s) ?? false);
      if (!match) return false;
    }
    return true;
  });
}

export function computeStats(players: Player[]): DashboardStats {
  return {
    total: players.length,
    approved: players.filter(p => p.status === 'APPROVED').length,
    pending: players.filter(p => p.status === 'PENDING').length,
    rejected: players.filter(p => p.status === 'REJECTED').length,
  };
}

export function getUniqueCities(players: Player[]): string[] {
  return [...new Set(players.map(p => p.city))].sort();
}

export async function promoteToSuperAdmin(
  targetUserId: string,
  targetEmail: string,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.ADMINS, targetUserId),
    {
      email: targetEmail,
      role: 'SUPER_ADMIN',
      promotedAt: serverTimestamp(),
      promotedBy: adminId,
    },
    { merge: true },
  );

  await setDoc(
    doc(db, COLLECTIONS.USERS, targetUserId),
    {
      email: targetEmail,
      role: 'SUPER_ADMIN',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'PROMOTED_TO_SUPER_ADMIN',
    playerId: targetUserId,
    reason: `Promoted ${targetEmail}`,
  });
}

export async function updatePlayerStatus(
  playerDocId: string,
  status: Player['status'],
  adminId: string,
  adminEmail: string,
  reason?: string,
): Promise<void> {
  const playerRef = doc(db, COLLECTIONS.PLAYERS, playerDocId);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) throw new Error('Player not found');

  const playerData = playerSnap.data();
  const updates: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === 'APPROVED') {
    updates.approvedAt = serverTimestamp();
    updates.approvedBy = adminId;
    updates.rejectionReason = null;
  } else if (status === 'REJECTED') {
    if (!reason?.trim()) throw new Error('Rejection reason is required.');
    updates.rejectedAt = serverTimestamp();
    updates.rejectedBy = adminId;
    updates.rejectionReason = reason.trim();
  } else if (status === 'PENDING') {
    updates.rejectionReason = null;
  }

  await updateDoc(playerRef, updates);

  const publicRef = doc(db, COLLECTIONS.PUBLIC_PLAYERS, playerDocId);
  if (status === 'APPROVED') {
    await setDoc(publicRef, {
      playerId: playerData.playerId,
      fullName: playerData.fullName,
      profileImage: playerData.profileImage ?? null,
      age: playerData.age,
      city: playerData.city,
      role: playerData.role,
      battingStyle: playerData.battingStyle,
      bowlingStyle: playerData.bowlingStyle,
      yearsOfExperience: playerData.yearsOfExperience,
    });
  } else {
    await deleteDoc(publicRef).catch(() => {});
  }

  await createAuditLog({
    adminId,
    adminEmail,
    action: `STATUS_${status}`,
    playerId: playerData.playerId as string,
    reason,
  });
}
