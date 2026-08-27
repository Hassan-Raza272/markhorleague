import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  runTransaction,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import { COLLECTIONS, LEAGUE, SETTINGS_DOC_ID } from '../constants';
import {
  Player,
  LeagueSettings,
  RegistrationFormData,
  User,
  UserRole,
  PublicPlayer,
  AuditLog,
} from '../types';

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
    draftedFranchiseId: data.draftedFranchiseId as string | undefined,
    draftPickNumber: data.draftPickNumber as number | undefined,
    draftedAt: data.draftedAt ? toDate(data.draftedAt) : undefined,
    lockedFranchiseId: data.lockedFranchiseId as string | undefined,
    lockedAt: data.lockedAt ? toDate(data.lockedAt) : undefined,
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
    suspendedAt: data.suspendedAt ? toDate(data.suspendedAt) : undefined,
    suspendedBy: data.suspendedBy as string | undefined,
    fcmToken: data.fcmToken as string | undefined,
  };
}

export async function generatePlayerId(): Promise<string> {
  const db = getFirebaseDb();
  const counterRef = doc(db, COLLECTIONS.COUNTERS, 'playerId');

  return runTransaction(db, async transaction => {
    const counterDoc = await transaction.get(counterRef);
    const current = counterDoc.exists()
      ? (counterDoc.data().current as number)
      : 0;
    const next = current + 1;
    transaction.set(counterRef, { current: next }, { merge: true });
    return `${LEAGUE.idPrefix}-${String(next).padStart(3, '0')}`;
  });
}

export async function getUser(uid: string): Promise<User | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    email: data.email as string,
    role: data.role as UserRole,
    franchiseId: data.franchiseId as string | undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getFirebaseDb();
  const trimmed = email.trim();
  if (!trimmed) return null;

  const attempts = Array.from(
    new Set([trimmed, trimmed.toLowerCase()]),
  );

  for (const value of attempts) {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where('email', '==', value),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) continue;

    const docSnap = snap.docs[0];
    const data = docSnap.data();
    return {
      uid: docSnap.id,
      email: data.email as string,
      role: data.role as UserRole,
      franchiseId: data.franchiseId as string | undefined,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }

  return null;
}

export type FranchiseAdminOption = {
  id: string;
  name: string;
  orderIndex: number;
  adminUserId?: string;
  adminEmail?: string;
};

function emailsMatch(a?: string, b?: string): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function isPlayerFranchiseAdminOf(
  player: Player,
  franchise: Pick<FranchiseAdminOption, 'adminUserId' | 'adminEmail'>,
): boolean {
  if (player.userId && franchise.adminUserId === player.userId) return true;
  return emailsMatch(franchise.adminEmail, player.email);
}

async function listFranchiseAdminOptions(): Promise<FranchiseAdminOption[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(collection(db, COLLECTIONS.FRANCHISES));
  return snap.docs
    .map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: (data.name as string) ?? d.id,
        orderIndex: (data.orderIndex as number) ?? 0,
        adminUserId: (data.adminUserId as string | undefined) ?? undefined,
        adminEmail: (data.adminEmail as string | undefined) ?? undefined,
      };
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function getFranchiseAdminOptions(): Promise<FranchiseAdminOption[]> {
  return listFranchiseAdminOptions();
}

export function findPlayerFranchiseAdmin(
  player: Player,
  franchises: FranchiseAdminOption[],
): FranchiseAdminOption | null {
  return franchises.find(franchise =>
    isPlayerFranchiseAdminOf(player, franchise),
  ) ?? null;
}

async function clearFranchiseAdminFields(franchiseId: string): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, COLLECTIONS.FRANCHISES, franchiseId), {
    adminUserId: null,
    adminEmail: null,
    updatedAt: serverTimestamp(),
  });
}

export type FranchiseAdminAccess = {
  isFranchiseAdmin: boolean;
  franchiseId: string | null;
  franchiseName: string | null;
};

export async function getFranchiseAdminAccess(
  uid: string,
): Promise<FranchiseAdminAccess> {
  const db = getFirebaseDb();
  const adminSnap = await getDoc(doc(db, COLLECTIONS.ADMINS, uid));
  const user = await getUser(uid);

  const franchiseId =
    (adminSnap.data()?.franchiseId as string | undefined) ??
    user?.franchiseId ??
    null;
  const role =
    (adminSnap.data()?.role as UserRole | undefined) ?? user?.role;

  if (role !== 'FRANCHISE_ADMIN' || !franchiseId) {
    return {
      isFranchiseAdmin: false,
      franchiseId: null,
      franchiseName: null,
    };
  }

  const franchiseSnap = await getDoc(
    doc(db, COLLECTIONS.FRANCHISES, franchiseId),
  );

  return {
    isFranchiseAdmin: true,
    franchiseId,
    franchiseName: franchiseSnap.exists()
      ? (franchiseSnap.data().name as string)
      : null,
  };
}

export type AuthSessionProfile = {
  player: Player | null;
  settings: LeagueSettings | null;
  isSuperAdmin: boolean;
  isFranchiseAdmin: boolean;
  franchiseId: string | null;
  franchiseName: string | null;
};

export async function resolveAuthSession(
  uid: string,
): Promise<AuthSessionProfile> {
  const db = getFirebaseDb();
  const [adminSnap, userSnap, settings] = await Promise.all([
    getDoc(doc(db, COLLECTIONS.ADMINS, uid)),
    getDoc(doc(db, COLLECTIONS.USERS, uid)),
    getLeagueSettings(),
  ]);

  const adminRole = adminSnap.exists()
    ? (adminSnap.data().role as UserRole | undefined)
    : undefined;
  const userRole = userSnap.exists()
    ? (userSnap.data().role as UserRole | undefined)
    : undefined;
  const franchiseId =
    (adminSnap.data()?.franchiseId as string | undefined) ??
    (userSnap.data()?.franchiseId as string | undefined) ??
    null;

  const isFranchiseAdmin =
    (adminRole === 'FRANCHISE_ADMIN' ||
      (!adminSnap.exists() && userRole === 'FRANCHISE_ADMIN')) &&
    !!franchiseId;

  if (isFranchiseAdmin && franchiseId) {
    const [franchiseSnap, player] = await Promise.all([
      getDoc(doc(db, COLLECTIONS.FRANCHISES, franchiseId)),
      getPlayerByUserId(uid),
    ]);
    return {
      player,
      settings,
      isSuperAdmin: false,
      isFranchiseAdmin: true,
      franchiseId,
      franchiseName: franchiseSnap.exists()
        ? (franchiseSnap.data().name as string)
        : null,
    };
  }

  const isSuperAdminUser =
    (adminSnap.exists() && adminRole !== 'FRANCHISE_ADMIN') ||
    userRole === 'SUPER_ADMIN';

  if (isSuperAdminUser) {
    return {
      player: null,
      settings,
      isSuperAdmin: true,
      isFranchiseAdmin: false,
      franchiseId: null,
      franchiseName: null,
    };
  }

  const player = await getPlayerByUserId(uid);
  return {
    player,
    settings,
    isSuperAdmin: false,
    isFranchiseAdmin: false,
    franchiseId: null,
    franchiseName: null,
  };
}

async function demoteUserToPlayer(uid: string): Promise<void> {
  const db = getFirebaseDb();
  await setDoc(
    doc(db, COLLECTIONS.USERS, uid),
    {
      role: 'PLAYER',
      franchiseId: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await deleteDoc(doc(db, COLLECTIONS.ADMINS, uid)).catch(() => undefined);
}

export async function assignFranchiseAdmin(
  franchiseId: string,
  targetEmail: string,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const db = getFirebaseDb();
  const franchiseRef = doc(db, COLLECTIONS.FRANCHISES, franchiseId);
  const franchiseSnap = await getDoc(franchiseRef);
  if (!franchiseSnap.exists()) throw new Error('Franchise not found');

  const trimmedEmail = targetEmail.trim();
  const previousAdminId = franchiseSnap.data().adminUserId as string | undefined;

  if (!trimmedEmail) {
    if (previousAdminId) {
      await demoteUserToPlayer(previousAdminId);
    }
    await updateDoc(franchiseRef, {
      adminUserId: null,
      adminEmail: null,
      updatedAt: serverTimestamp(),
    });
    await createAuditLog({
      adminId,
      adminEmail,
      action: 'FRANCHISE_ADMIN_CLEARED',
      metadata: { franchiseId },
    });
    return;
  }

  const targetUser = await getUserByEmail(trimmedEmail);
  if (!targetUser) {
    throw new Error(
      'No account found with this email. The user must register in the app first.',
    );
  }

  if (targetUser.role === 'SUPER_ADMIN') {
    throw new Error('A super admin cannot be assigned as a franchise admin.');
  }

  const otherAssignments = (await listFranchiseAdminOptions()).filter(
    franchise =>
      franchise.id !== franchiseId &&
      (franchise.adminUserId === targetUser.uid ||
        emailsMatch(franchise.adminEmail, targetUser.email)),
  );
  for (const franchise of otherAssignments) {
    await clearFranchiseAdminFields(franchise.id);
  }

  if (previousAdminId && previousAdminId !== targetUser.uid) {
    await demoteUserToPlayer(previousAdminId);
  }

  await setDoc(
    doc(db, COLLECTIONS.USERS, targetUser.uid),
    {
      email: targetUser.email,
      role: 'FRANCHISE_ADMIN',
      franchiseId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    doc(db, COLLECTIONS.ADMINS, targetUser.uid),
    {
      email: trimmedEmail,
      role: 'FRANCHISE_ADMIN',
      franchiseId,
      assignedAt: serverTimestamp(),
      assignedBy: adminId,
    },
    { merge: true },
  );

  await updateDoc(franchiseRef, {
    adminUserId: targetUser.uid,
    adminEmail: trimmedEmail,
    updatedAt: serverTimestamp(),
  });

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'FRANCHISE_ADMIN_ASSIGNED',
    metadata: {
      franchiseId,
      franchiseName: franchiseSnap.data().name,
      adminEmail: trimmedEmail,
      adminUserId: targetUser.uid,
    },
  });
}

export async function assignPlayerAsFranchiseAdmin(
  player: Player,
  franchiseId: string,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  let email = player.email?.trim() ?? '';
  if (player.userId) {
    const account = await getUser(player.userId);
    if (account?.role === 'SUPER_ADMIN') {
      throw new Error('A super admin cannot be assigned as a franchise admin.');
    }
    if (account?.email) {
      email = account.email;
    }
  }
  if (!email) {
    throw new Error(
      'This player must have a registered app account before becoming a franchise admin.',
    );
  }
  await assignFranchiseAdmin(franchiseId, email, adminId, adminEmail);
}

export async function removePlayerFranchiseAdmin(
  player: Player,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const franchises = await listFranchiseAdminOptions();
  const assignment = findPlayerFranchiseAdmin(player, franchises);
  if (!assignment) {
    throw new Error('This player is not a franchise admin.');
  }
  await assignFranchiseAdmin(assignment.id, '', adminId, adminEmail);
}

export async function createUserProfile(
  uid: string,
  email: string,
  role: UserRole = 'PLAYER',
): Promise<void> {
  const db = getFirebaseDb();
  await setDoc(doc(db, COLLECTIONS.USERS, uid), {
    email,
    role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getPlayerByUserId(userId: string): Promise<Player | null> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, COLLECTIONS.PLAYERS),
    where('userId', '==', userId),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return mapPlayer(docSnap.id, docSnap.data());
}

export async function checkDuplicateRegistration(
  phone: string,
  cnic: string,
  excludeUserId?: string,
): Promise<{ phoneExists: boolean; cnicExists: boolean }> {
  const db = getFirebaseDb();
  const [phoneSnap, cnicSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.PLAYERS), where('phone', '==', phone))),
    getDocs(query(collection(db, COLLECTIONS.PLAYERS), where('cnic', '==', cnic))),
  ]);

  const phoneExists = phoneSnap.docs.some(
    d => d.data().userId !== excludeUserId,
  );
  const cnicExists = cnicSnap.docs.some(
    d => d.data().userId !== excludeUserId,
  );

  return { phoneExists, cnicExists };
}

export async function submitPlayerRegistration(
  userId: string,
  email: string,
  data: RegistrationFormData,
  profileImageUrl?: string,
): Promise<Player> {
  const db = getFirebaseDb();
  const playerId = await generatePlayerId();
  const playerDocRef = doc(collection(db, COLLECTIONS.PLAYERS));

  const playerData = {
    userId,
    playerId,
    ...data,
    profileImage: profileImageUrl ?? null,
    email,
    status: 'PENDING',
    draftEligible: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(playerDocRef, playerData);

  return mapPlayer(playerDocRef.id, {
    ...playerData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function updatePlayerRegistration(
  playerDocId: string,
  data: Partial<RegistrationFormData>,
  profileImageUrl?: string,
): Promise<void> {
  const db = getFirebaseDb();
  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  (Object.keys(data) as Array<keyof RegistrationFormData>).forEach(key => {
    const value = data[key];
    updateData[key as string] = value === undefined ? null : value;
  });

  if (profileImageUrl !== undefined) {
    updateData.profileImage = profileImageUrl;
  }

  await updateDoc(doc(db, COLLECTIONS.PLAYERS, playerDocId), updateData);
}

export async function submitPaymentReceipt(
  playerDocId: string,
  receiptUrl: string,
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, COLLECTIONS.PLAYERS, playerDocId), {
    feeReceiptUrl: receiptUrl,
    feeReceiptSubmittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getAllPlayers(): Promise<Player[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, COLLECTIONS.PLAYERS),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => mapPlayer(d.id, d.data()));
}

export function subscribePlayers(
  onData: (players: Player[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(getFirebaseDb(), COLLECTIONS.PLAYERS),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    snap => {
      onData(snap.docs.map(d => mapPlayer(d.id, d.data())));
    },
    err => onError?.(err),
  );
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, COLLECTIONS.PLAYERS, id));
  if (!snap.exists()) return null;
  return mapPlayer(snap.id, snap.data());
}

export async function approvePlayer(
  playerDocId: string,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const db = getFirebaseDb();
  const playerRef = doc(db, COLLECTIONS.PLAYERS, playerDocId);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) throw new Error('Player not found');

  const playerData = playerSnap.data();

  await updateDoc(playerRef, {
    status: 'APPROVED',
    approvedAt: serverTimestamp(),
    approvedBy: adminId,
    rejectionReason: null,
    updatedAt: serverTimestamp(),
  });

  const publicPlayer: PublicPlayer = {
    playerId: playerData.playerId as string,
    fullName: playerData.fullName as string,
    profileImage: playerData.profileImage as string | undefined,
    age: playerData.age as number,
    city: playerData.city as string,
    role: playerData.role as PublicPlayer['role'],
    battingStyle: playerData.battingStyle as PublicPlayer['battingStyle'],
    bowlingStyle: playerData.bowlingStyle as PublicPlayer['bowlingStyle'],
    yearsOfExperience: playerData.yearsOfExperience as number,
  };

  await setDoc(
    doc(db, COLLECTIONS.PUBLIC_PLAYERS, playerDocId),
    publicPlayer,
  );

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'PLAYER_APPROVED',
    playerId: playerData.playerId as string,
  });
}

export async function rejectPlayer(
  playerDocId: string,
  adminId: string,
  adminEmail: string,
  reason: string,
): Promise<void> {
  const db = getFirebaseDb();
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

  await deleteDoc(doc(db, COLLECTIONS.PUBLIC_PLAYERS, playerDocId)).catch(
    () => {},
  );

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
  const db = getFirebaseDb();
  const playerRef = doc(db, COLLECTIONS.PLAYERS, playerDocId);
  const playerSnap = await getDoc(playerRef);
  if (!playerSnap.exists()) throw new Error('Player not found');

  const playerId = playerSnap.data().playerId as string;

  await deleteDoc(playerRef);
  await deleteDoc(doc(db, COLLECTIONS.PUBLIC_PLAYERS, playerDocId)).catch(
    () => {},
  );

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'PLAYER_DELETED',
    playerId,
  });
}

export async function updatePlayer(
  playerDocId: string,
  data: Partial<Player>,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const db = getFirebaseDb();
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
  const db = getFirebaseDb();
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
  const db = getFirebaseDb();
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
    metadata: { category: category ?? null },
  });
}

export async function getLeagueSettings(): Promise<LeagueSettings> {
  const db = getFirebaseDb();
  const snap = await getDoc(
    doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID),
  );

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
    updatedBy: data.updatedBy as string | undefined,
  };
}

export async function updateLeagueSettings(
  settings: Partial<LeagueSettings>,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const db = getFirebaseDb();
  await setDoc(
    doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID),
    {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy: adminId,
    },
    { merge: true },
  );

  await createAuditLog({
    adminId,
    adminEmail,
    action: 'SETTINGS_UPDATED',
    metadata: settings,
  });
}

export async function getPublicPlayers(): Promise<PublicPlayer[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(collection(db, COLLECTIONS.PUBLIC_PLAYERS));
  return snap.docs.map(d => d.data() as PublicPlayer);
}

export async function createAuditLog(
  log: Omit<AuditLog, 'id' | 'timestamp'>,
): Promise<void> {
  const db = getFirebaseDb();
  const logRef = doc(collection(db, COLLECTIONS.AUDIT_LOGS));
  const payload: Record<string, unknown> = {
    adminId: log.adminId,
    adminEmail: log.adminEmail,
    action: log.action,
    timestamp: serverTimestamp(),
  };
  if (log.playerId != null) payload.playerId = log.playerId;
  if (log.reason != null && log.reason !== '') payload.reason = log.reason;
  if (log.metadata != null) payload.metadata = log.metadata;
  await setDoc(logRef, payload);
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, COLLECTIONS.AUDIT_LOGS),
    orderBy('timestamp', 'desc'),
    limit(100),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...(d.data() as Omit<AuditLog, 'id'>),
    timestamp: toDate(d.data().timestamp),
  }));
}

export async function isSuperAdmin(uid: string): Promise<boolean> {
  const db = getFirebaseDb();
  const adminSnap = await getDoc(doc(db, COLLECTIONS.ADMINS, uid));
  if (adminSnap.exists()) {
    const role = adminSnap.data().role as UserRole | undefined;
    if (role === 'FRANCHISE_ADMIN') return false;
    return true;
  }
  const user = await getUser(uid);
  return user?.role === 'SUPER_ADMIN';
}

export async function promoteToSuperAdmin(
  targetUserId: string,
  targetEmail: string,
  adminId: string,
  adminEmail: string,
): Promise<void> {
  const db = getFirebaseDb();

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
      franchiseId: null,
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
  const db = getFirebaseDb();
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
    if (!reason?.trim()) {
      throw new Error('Rejection reason is required.');
    }
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

export { mapPlayer };
