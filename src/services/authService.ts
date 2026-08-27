import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth } from '../firebase/config';
import { createUserProfile, getUser, isSuperAdmin, getFranchiseAdminAccess } from './playerService';
import { User, UserRole } from '../types';

const SESSION_CACHE_KEY = 'mcl-auth-session-v1';

export type CachedAuthSession = {
  uid: string;
  isSuperAdmin: boolean;
  isFranchiseAdmin: boolean;
  franchiseId: string | null;
  franchiseName: string | null;
};

export async function readCachedAuthSession(): Promise<CachedAuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedAuthSession;
  } catch {
    return null;
  }
}

export async function writeCachedAuthSession(
  session: CachedAuthSession,
): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
  } catch {
    // Ignore cache write failures
  }
}

export async function clearCachedAuthSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // Ignore cache clear failures
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await createUserProfile(credential.user.uid, email, 'PLAYER');
  return credential.user;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logout(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export function subscribeToAuth(
  callback: (user: FirebaseUser | null) => void,
): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export async function getCurrentUserProfile(): Promise<User | null> {
  const auth = getFirebaseAuth();
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  return getUser(firebaseUser.uid);
}

export async function checkIsAdmin(uid: string): Promise<boolean> {
  const [superAdmin, franchiseAccess] = await Promise.all([
    isSuperAdmin(uid),
    getFranchiseAdminAccess(uid),
  ]);
  return superAdmin || franchiseAccess.isFranchiseAdmin;
}

export type { FirebaseUser, UserRole };
