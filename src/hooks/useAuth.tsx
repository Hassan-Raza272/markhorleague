import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  subscribeToAuth,
  logout as authLogout,
  readCachedAuthSession,
  writeCachedAuthSession,
  clearCachedAuthSession,
} from '../services/authService';
import {
  getPlayerByUserId,
  getLeagueSettings,
  resolveAuthSession,
  AuthSessionProfile,
} from '../services/playerService';
import { Player, LeagueSettings } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  player: Player | null;
  settings: LeagueSettings | null;
  isSuperAdmin: boolean;
  isFranchiseAdmin: boolean;
  franchiseId: string | null;
  franchiseName: string | null;
  /** Super admin or franchise admin */
  isAdmin: boolean;
  loading: boolean;
  refreshPlayer: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [settings, setSettings] = useState<LeagueSettings | null>(null);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [isFranchiseAdminUser, setIsFranchiseAdminUser] = useState(false);
  const [franchiseId, setFranchiseId] = useState<string | null>(null);
  const [franchiseName, setFranchiseName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(
    (firebaseUser: FirebaseUser, session: AuthSessionProfile) => {
      setUser(firebaseUser);
      setPlayer(session.player);
      setSettings(session.settings);
      setIsSuperAdminUser(session.isSuperAdmin);
      setIsFranchiseAdminUser(session.isFranchiseAdmin);
      setFranchiseId(session.franchiseId);
      setFranchiseName(session.franchiseName);
    },
    [],
  );

  const resetSession = useCallback(() => {
    setUser(null);
    setPlayer(null);
    setSettings(null);
    setIsSuperAdminUser(false);
    setIsFranchiseAdminUser(false);
    setFranchiseId(null);
    setFranchiseName(null);
  }, []);

  const persistSession = useCallback(
    async (uid: string, session: AuthSessionProfile) => {
      await writeCachedAuthSession({
        uid,
        isSuperAdmin: session.isSuperAdmin,
        isFranchiseAdmin: session.isFranchiseAdmin,
        franchiseId: session.franchiseId,
        franchiseName: session.franchiseName,
      });
    },
    [],
  );

  const refreshPlayer = useCallback(async () => {
    if (!user) {
      setPlayer(null);
      return;
    }
    const p = await getPlayerByUserId(user.uid);
    setPlayer(p);
  }, [user]);

  const refreshSettings = useCallback(async () => {
    const s = await getLeagueSettings();
    setSettings(s);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let requestId = 0;

    const unsubscribe = subscribeToAuth(async firebaseUser => {
      const id = ++requestId;

      if (!firebaseUser) {
        await clearCachedAuthSession();
        if (cancelled || id !== requestId) return;
        resetSession();
        setLoading(false);
        return;
      }

      try {
        const cached = await readCachedAuthSession();
        if (cancelled || id !== requestId) return;

        const cachedAdmin =
          cached?.uid === firebaseUser.uid && cached.isSuperAdmin;

        if (cachedAdmin && cached) {
          setUser(firebaseUser);
          setIsSuperAdminUser(cached.isSuperAdmin);
          setIsFranchiseAdminUser(cached.isFranchiseAdmin);
          setFranchiseId(cached.franchiseId);
          setFranchiseName(cached.franchiseName);
          setLoading(false);
        }

        const session = await resolveAuthSession(firebaseUser.uid);
        if (cancelled || id !== requestId) return;
        applySession(firebaseUser, session);
        await persistSession(firebaseUser.uid, session);
      } catch {
        if (cancelled || id !== requestId) return;
        setUser(firebaseUser);
        setPlayer(null);
        setIsSuperAdminUser(false);
        setIsFranchiseAdminUser(false);
        setFranchiseId(null);
        setFranchiseName(null);
      } finally {
        if (!cancelled && id === requestId) {
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [applySession, persistSession, resetSession]);

  const logout = async () => {
    await authLogout();
    await clearCachedAuthSession();
    resetSession();
  };

  const isAdmin = isSuperAdminUser || isFranchiseAdminUser;

  return (
    <AuthContext.Provider
      value={{
        user,
        player,
        settings,
        isSuperAdmin: isSuperAdminUser,
        isFranchiseAdmin: isFranchiseAdminUser,
        franchiseId,
        franchiseName,
        isAdmin,
        loading,
        refreshPlayer,
        refreshSettings,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
