import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput as RNTextInput,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';
import Share from 'react-native-share';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Platform } from 'react-native';
import { GradientBackground } from '../../components/GradientBackground';
import { LeagueHeader } from '../../components/LeagueHeader';
import { PremiumButton } from '../../components/PremiumButton';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { usePremiumAlert } from '../../components/PremiumAlertProvider';
import {
  getAllPlayers,
  assignFranchiseAdmin,
  subscribePlayers,
} from '../../services/playerService';
import {
  autoPickRandomEligiblePlayer,
  buildLockedPicksForFranchise,
  ensureAllFranchiseOwnersLocked,
  ensureDefaultDraftSetup,
  ensureFranchiseOwnerLocked,
  getFranchiseOwnerPlayer,
  getFranchises,
  getFranchisesMissingExtraLocks,
  getOnClockFranchise,
  isPlayerDraftEligible,
  lockPlayerForFranchise,
  nextFranchiseId,
  completeDraft,
  resetDraft,
  setFranchiseCaptain,
  setupDraftFranchises,
  startDraft,
  startPickClock,
  stopPickClock,
  subscribeFranchises,
  submitDraftPick,
  subscribeDraftPicks,
  subscribeDraftSession,
  syncDraftSizeFromApprovedPlayers,
  undoLastDraftPick,
  unlockPlayerForFranchise,
} from '../../services/draftService';
import {
  buildAllFranchiseSquadPdfs,
  buildFranchiseSquadPdfBase64,
  buildFullDraftBoardPdfBase64,
  getDraftBoardFilename,
} from '../../utils/exportDraftPdf';
import {
  buildAllOwnerSquadPosters,
  buildOwnerSquadPosterBase64,
  getOwnerSquadPosterFilename,
} from '../../utils/exportOwnerSquadPoster';
import { getDraftSize, getLiveDraftTotalPicks, getPickDetails } from '../../utils/draftOrder';
import {
  formatPickClock,
  getPickClockRemainingMs,
  isPickClockActive,
  isPickClockPaused,
} from '../../utils/pickClock';
import { DRAFT } from '../../constants';
import type { DraftPick, DraftSession, Franchise, Player } from '../../types';
import { getCategoryLabel } from '../../utils/validation';
import { FranchiseLockSection } from './FranchiseLockSection';
import { EaseView } from 'react-native-ease';
import { motion } from '../../motion';

function isShareCancelled(message: string): boolean {
  return (
    message.includes('User did not share') ||
    message.includes('User cancelled') ||
    message.includes('canceled')
  );
}

type FranchiseSetupRow = {
  id: string;
  name: string;
  adminEmail: string;
};

function rowsFromFranchises(list: Franchise[]): FranchiseSetupRow[] {
  return list.map(franchise => ({
    id: franchise.id,
    name: franchise.name,
    adminEmail: franchise.adminEmail ?? '',
  }));
}

function ClockControlButton({
  label,
  icon,
  tone,
  disabled,
  loading,
  live,
  onPress,
}: {
  label: string;
  icon: string;
  tone: 'start' | 'stop';
  disabled: boolean;
  loading: boolean;
  live?: boolean;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const isStart = tone === 'start';
  const active = !disabled && !loading;
  const startBg = active ? colors.lime[500] : colors.forest[900];
  const stopBg = live
    ? 'rgba(239,68,68,0.2)'
    : active
      ? colors.forest[900]
      : colors.forest[900];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={clockStyles.controlPress}>
      <EaseView
        style={[
          clockStyles.controlBtn,
          {
            backgroundColor: isStart ? startBg : stopBg,
            borderColor: isStart
              ? active
                ? colors.lime[400]
                : colors.forest[600]
              : live
                ? colors.status.rejected
                : active
                  ? colors.gold[500]
                  : colors.forest[600],
          },
        ]}
        animate={{ scale: pressed && active ? 0.96 : 1 }}
        transition={motion.snappy}>
        {live ? (
          <EaseView
            pointerEvents="none"
            style={clockStyles.liveGlow}
            initialAnimate={{ opacity: 0.2, scale: 0.92 }}
            animate={{ opacity: 0.45, scale: 1.06 }}
            transition={{ ...motion.loop, duration: 900 }}
          />
        ) : null}
        <View
          style={[
            clockStyles.controlIcon,
            {
              backgroundColor: isStart
                ? active
                  ? colors.forest[950]
                  : colors.forest[800]
                : live
                  ? 'rgba(239,68,68,0.28)'
                  : colors.forest[800],
            },
          ]}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={isStart ? colors.lime[500] : colors.gold[500]}
            />
          ) : (
            <AppIcon
              name={icon}
              size={16}
              color={
                isStart
                  ? active
                    ? colors.lime[500]
                    : colors.silver[400]
                  : live
                    ? colors.status.rejected
                    : active
                      ? colors.gold[400]
                      : colors.silver[400]
              }
            />
          )}
        </View>
        <Text
          style={[
            clockStyles.controlLabel,
            {
              color: isStart
                ? active
                  ? colors.forest[950]
                  : colors.silver[400]
                : live
                  ? colors.status.rejected
                  : active
                    ? colors.gold[400]
                    : colors.silver[400],
            },
          ]}
          numberOfLines={1}>
          {label}
        </Text>
      </EaseView>
    </Pressable>
  );
}

function ClockDigit({
  value,
  color,
  backgroundColor,
  borderColor,
  size,
  height,
  fontSize,
}: {
  value: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  size: number;
  height: number;
  fontSize: number;
}) {
  return (
    <View
      style={[
        clockStyles.digitBox,
        { width: size, height, backgroundColor, borderColor },
      ]}>
      <Text style={[clockStyles.digitText, { color, fontSize }]}>{value}</Text>
    </View>
  );
}

function PremiumClockCard({
  clockActive,
  clockPaused,
  clockUrgent,
  remainingMs,
  isSuperAdmin,
  showResumeClock,
  busy,
  onStart,
  onStop,
}: {
  clockActive: boolean;
  clockPaused: boolean;
  clockUrgent: boolean;
  remainingMs: number;
  isSuperAdmin: boolean;
  showResumeClock: boolean;
  busy: string | null;
  onStart: () => void;
  onStop: () => void;
}) {
  const { width } = useWindowDimensions();
  const compactClock = width < 380;
  const digitSize = compactClock ? 42 : 52;
  const digitHeight = compactClock ? 56 : 64;
  const digitFont = compactClock ? 28 : 36;

  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const m1 = String(Math.floor(mins / 10));
  const m2 = String(mins % 10);
  const s1 = String(Math.floor(secs / 10));
  const s2 = String(secs % 10);

  const progress = remainingMs / (DRAFT.PICK_CLOCK_MS || 120000);
  const digitColor = clockUrgent ? colors.status.rejected : colors.silver[50];
  const accentColor = clockUrgent ? colors.status.rejected : colors.lime[500];
  const digitBg = clockUrgent ? 'rgba(220,38,38,0.14)' : colors.forest[900];
  const digitBorder = clockUrgent
    ? 'rgba(220,38,38,0.45)'
    : 'rgba(163,207,45,0.28)';

  const statusLabel = clockActive
    ? clockUrgent
      ? 'HURRY UP'
      : 'LIVE'
    : clockPaused
      ? 'PAUSED'
      : 'READY';

  const hintText = clockActive
    ? 'Auto-pick if time runs out'
    : clockPaused
      ? isSuperAdmin
        ? 'Resume to continue this pick'
        : 'Waiting for admin to resume'
      : isSuperAdmin
        ? 'Start the 2:00 pick clock'
        : 'Waiting for admin to start';

  const startDisabled = clockActive || (!!busy && busy !== 'clock-start');
  const stopDisabled = !clockActive || (!!busy && busy !== 'clock-stop');

  return (
    <View style={[clockStyles.card, clockUrgent && clockStyles.cardUrgent]}>
      <View style={[clockStyles.glow, { backgroundColor: accentColor }]} />

      <View style={clockStyles.topRow}>
        <View style={[clockStyles.statusPill, { borderColor: `${accentColor}66` }]}>
          <EaseView
            style={[clockStyles.statusDot, { backgroundColor: accentColor }]}
            initialAnimate={{ scale: 0.7, opacity: 0.45 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              clockActive
                ? { ...motion.loop, duration: clockUrgent ? 380 : 900 }
                : motion.snappy
            }
          />
          <Text style={[clockStyles.statusLabel, { color: accentColor }]}>
            {statusLabel}
          </Text>
        </View>
        <Text style={clockStyles.clockTitle}>Pick Clock</Text>
      </View>

      <View style={clockStyles.digitsRow}>
        <ClockDigit
          value={m1}
          color={digitColor}
          backgroundColor={digitBg}
          borderColor={digitBorder}
          size={digitSize}
          height={digitHeight}
          fontSize={digitFont}
        />
        <ClockDigit
          value={m2}
          color={digitColor}
          backgroundColor={digitBg}
          borderColor={digitBorder}
          size={digitSize}
          height={digitHeight}
          fontSize={digitFont}
        />
        <View style={clockStyles.separatorCol}>
          <EaseView
            style={[clockStyles.separatorDot, { backgroundColor: accentColor }]}
            initialAnimate={{ opacity: 0.25 }}
            animate={{ opacity: 1 }}
            transition={clockActive ? motion.blink : motion.snappy}
          />
          <EaseView
            style={[clockStyles.separatorDot, { backgroundColor: accentColor }]}
            initialAnimate={{ opacity: 0.25 }}
            animate={{ opacity: 1 }}
            transition={
              clockActive ? { ...motion.blink, delay: 160 } : motion.snappy
            }
          />
        </View>
        <ClockDigit
          value={s1}
          color={digitColor}
          backgroundColor={digitBg}
          borderColor={digitBorder}
          size={digitSize}
          height={digitHeight}
          fontSize={digitFont}
        />
        <ClockDigit
          value={s2}
          color={digitColor}
          backgroundColor={digitBg}
          borderColor={digitBorder}
          size={digitSize}
          height={digitHeight}
          fontSize={digitFont}
        />
      </View>

      <View style={clockStyles.labelRow}>
        <Text style={[clockStyles.unitLabel, { width: digitSize * 2 + 8 }]}>
          MIN
        </Text>
        <View style={{ width: 22 }} />
        <Text style={[clockStyles.unitLabel, { width: digitSize * 2 + 8 }]}>
          SEC
        </Text>
      </View>

      <View style={clockStyles.progressBarTrack}>
        <View
          style={[
            clockStyles.progressBarFill,
            {
              width: `${Math.max(0, Math.min(100, progress * 100))}%`,
              backgroundColor: accentColor,
            },
          ]}
        />
      </View>

      <Text style={clockStyles.hint}>{hintText}</Text>

      {isSuperAdmin ? (
        <View style={clockStyles.controls}>
          <ClockControlButton
            label={showResumeClock ? 'Resume' : 'Start'}
            icon={showResumeClock ? 'play' : 'play'}
            tone="start"
            disabled={startDisabled}
            loading={busy === 'clock-start'}
            onPress={onStart}
          />
          <ClockControlButton
            label="Stop"
            icon="stop"
            tone="stop"
            disabled={stopDisabled}
            loading={busy === 'clock-stop'}
            live={clockActive}
            onPress={onStop}
          />
        </View>
      ) : null}
    </View>
  );
}

const clockStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.forest[800],
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(163,207,45,0.45)',
    overflow: 'hidden',
  },
  cardUrgent: {
    borderColor: 'rgba(239,68,68,0.7)',
  },
  glow: {
    position: 'absolute',
    top: -70,
    alignSelf: 'center',
    width: 180,
    height: 140,
    borderRadius: 90,
    opacity: 0.1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: colors.forest[900],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  clockTitle: {
    color: colors.silver[300],
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  digitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  digitBox: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  digitText: {
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  separatorCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 4,
  },
  separatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  unitLabel: {
    color: colors.silver[400],
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    textAlign: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.forest[900],
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  hint: {
    color: colors.silver[400],
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  controlPress: {
    flex: 1,
  },
  controlBtn: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  liveGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.status.rejected,
    borderRadius: 16,
  },
  controlIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});

function DraftSection({
  icon,
  title,
  hint,
  right,
  children,
}: {
  icon: string;
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionIntro}>
        <View style={styles.sectionIcon}>
          <AppIcon name={icon} size={20} color={colors.lime[500]} />
        </View>
        <View style={styles.sectionIntroText}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {right}
          </View>
          {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
        </View>
      </View>
      <View style={styles.accentBar} />
      {children}
    </View>
  );
}

export function AdminDraftScreen() {
  const {
    user,
    isSuperAdmin,
    isFranchiseAdmin,
    franchiseId,
    franchiseName,
  } = useAuth();
  const { alert } = usePremiumAlert();
  const { width } = useWindowDimensions();
  const wideLayout = width >= 640;

  const [session, setSession] = useState<DraftSession | null>(null);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [franchiseSetup, setFranchiseSetup] = useState<FranchiseSetupRow[]>([
    { id: 'f1', name: 'Franchise 1', adminEmail: '' },
    { id: 'f2', name: 'Franchise 2', adminEmail: '' },
  ]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const autoPickInFlightRef = useRef(false);

  const loadPlayers = useCallback(async () => {
    const data = await getAllPlayers();
    setPlayers(data);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPlayers();
      const loadedFranchises = await getFranchises();
      if (loadedFranchises.length > 0) {
        setFranchises(loadedFranchises);
        setFranchiseSetup(rowsFromFranchises(loadedFranchises));
      }
      if (isSuperAdmin) {
        await syncDraftSizeFromApprovedPlayers();
        if (user?.uid && user.email) {
          await ensureAllFranchiseOwnersLocked(user.uid, user.email);
        }
      } else if (isFranchiseAdmin && franchiseId && user?.uid && user.email) {
        await ensureFranchiseOwnerLocked(franchiseId, user.uid, user.email);
      }
    } catch (e: unknown) {
      alert('Error', e instanceof Error ? e.message : 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }, [alert, franchiseId, isFranchiseAdmin, isSuperAdmin, loadPlayers, user?.email, user?.uid]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      try {
        await loadPlayers();
        if (isSuperAdmin && user?.uid && user.email) {
          await ensureDefaultDraftSetup(user.uid, user.email);
          await syncDraftSizeFromApprovedPlayers();
          await ensureAllFranchiseOwnersLocked(user.uid, user.email);
        } else if (isFranchiseAdmin && franchiseId && user?.uid && user.email) {
          await ensureFranchiseOwnerLocked(franchiseId, user.uid, user.email);
        }
        const loadedFranchises = await getFranchises();
        if (mounted && loadedFranchises.length > 0) {
          setFranchises(loadedFranchises);
          setFranchiseSetup(rowsFromFranchises(loadedFranchises));
        }
      } catch (e: unknown) {
        alert('Error', e instanceof Error ? e.message : 'Failed to load draft');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [alert, franchiseId, isFranchiseAdmin, isSuperAdmin, loadPlayers, user?.email, user?.uid]);

  useEffect(() => {
    const unsubSession = subscribeDraftSession(
      DRAFT.SESSION_ID,
      setSession,
      err => alert('Draft error', err.message),
    );
    const unsubPicks = subscribeDraftPicks(
      DRAFT.SESSION_ID,
      setPicks,
      err => alert('Draft error', err.message),
    );
    const unsubPlayers = subscribePlayers(
      setPlayers,
      err => alert('Draft error', err.message),
    );
    const unsubFranchises = subscribeFranchises(
      setFranchises,
      err => alert('Draft error', err.message),
    );
    return () => {
      unsubSession();
      unsubPicks();
      unsubPlayers();
      unsubFranchises();
    };
  }, [alert]);

  useEffect(() => {
    if (!user?.uid || !user.email) return;
    if (session && session.status !== 'SETUP') return;
    if (!isFranchiseAdmin || !franchiseId) return;
    void ensureFranchiseOwnerLocked(
      franchiseId,
      user.uid,
      user.email,
    ).catch(() => undefined);
  }, [
    franchiseId,
    isFranchiseAdmin,
    players,
    session?.status,
    user?.email,
    user?.uid,
  ]);

  useEffect(() => {
    getFranchises()
      .then(setFranchises)
      .catch(() => undefined);
  }, [session?.franchiseOrder]);

  const draftedPlayerIds = useMemo(
    () => new Set(picks.map(pick => pick.playerDocId)),
    [picks],
  );

  const eligiblePlayers = useMemo(
    () =>
      players.filter(
        player =>
          isPlayerDraftEligible(player, franchises) &&
          !draftedPlayerIds.has(player.id),
      ),
    [draftedPlayerIds, franchises, players],
  );

  const filteredEligible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligiblePlayers;
    return eligiblePlayers.filter(p =>
      p.fullName.toLowerCase().includes(q) ||
      p.playerId.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q),
    );
  }, [eligiblePlayers, search]);

  const approvedCount = useMemo(
    () => players.filter(player => player.status === 'APPROVED').length,
    [players],
  );

  const draftPoolCount = useMemo(
    () =>
      players.filter(player => isPlayerDraftEligible(player, franchises)).length,
    [franchises, players],
  );

  const activeFranchiseCount = useMemo(() => {
    if (session?.status === 'IN_PROGRESS' || session?.status === 'COMPLETED') {
      const liveIds = new Set(franchises.map(franchise => franchise.id));
      const kept = session.franchiseOrder.filter(id => liveIds.has(id));
      return kept.length || franchises.length || DRAFT.MIN_FRANCHISES;
    }
    return (
      franchiseSetup.length ||
      franchises.length ||
      session?.franchiseOrder.length ||
      DRAFT.MIN_FRANCHISES
    );
  }, [
    franchiseSetup.length,
    franchises,
    session?.franchiseOrder,
    session?.status,
  ]);

  const draftSize = useMemo(
    () => getDraftSize(draftPoolCount, activeFranchiseCount),
    [activeFranchiseCount, draftPoolCount],
  );

  const missingLockAssignments = useMemo(
    () => getFranchisesMissingExtraLocks(franchises, players),
    [franchises, players],
  );

  const pickProgress = useMemo(() => {
    const remaining = eligiblePlayers.length;
    const total =
      session?.status === 'IN_PROGRESS' || session?.status === 'COMPLETED'
        ? getLiveDraftTotalPicks(picks.length, remaining, session.totalPicks)
        : draftSize.totalPicks;
    const completed = total === 0 ? 0 : Math.min(picks.length, total);
    return { current: completed, total, remaining };
  }, [
    draftSize.totalPicks,
    eligiblePlayers.length,
    picks.length,
    session?.status,
    session?.totalPicks,
  ]);

  const onClock = useMemo(() => {
    if (!session) return null;
    return getOnClockFranchise(
      { ...session, totalPicks: pickProgress.total },
      franchises,
    );
  }, [session, franchises, pickProgress.total]);

  const nextPickDetails = useMemo(() => {
    if (!session || session.status !== 'IN_PROGRESS') return null;
    if (pickProgress.remaining === 0) return null;
    return getPickDetails(
      session.currentPickNumber,
      activeFranchiseCount,
    );
  }, [activeFranchiseCount, pickProgress.remaining, session]);

  const clockActive = isPickClockActive(session);
  const clockPaused = isPickClockPaused(session);
  const remainingMs = getPickClockRemainingMs(session, now);
  const clockUrgent = clockActive && remainingMs <= 30 * 1000;
  const showResumeClock = clockActive || clockPaused;

  const isMyTurn = useMemo(() => {
    if (!isFranchiseAdmin || !franchiseId || !onClock) return false;
    return onClock.id === franchiseId;
  }, [franchiseId, isFranchiseAdmin, onClock]);

  const canPick = useMemo(() => {
    if (!session || session.status !== 'IN_PROGRESS' || !onClock) return false;
    if (isSuperAdmin) return true;
    if (isMyTurn) return clockActive;
    return false;
  }, [session, onClock, isSuperAdmin, isMyTurn, clockActive]);

  const myPicks = useMemo(() => {
    if (!franchiseId) return [];
    return picks
      .filter(p => p.franchiseId === franchiseId)
      .sort((a, b) => a.pickNumber - b.pickNumber);
  }, [picks, franchiseId]);

  const myLockedPlayers = useMemo(() => {
    if (!franchiseId) return [];
    return players.filter(player => player.lockedFranchiseId === franchiseId);
  }, [franchiseId, players]);

  const playerImageMap = useMemo(() => {
    const map = new Map<string, string | undefined>();
    players.forEach(p => map.set(p.id, p.profileImage));
    return map;
  }, [players]);

  useEffect(() => {
    if (!clockActive) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [clockActive, session?.pickClockStartedAt]);

  useEffect(() => {
    if (!clockActive || remainingMs > 0) return;
    if (autoPickInFlightRef.current) return;
    if (eligiblePlayers.length === 0) return;
    if (!user?.uid || !user.email) return;

    const canTriggerAutoPick =
      isSuperAdmin || (isFranchiseAdmin && isMyTurn);
    if (!canTriggerAutoPick) return;

    autoPickInFlightRef.current = true;
    const adminId = user.uid;
    const adminEmail = user.email;

    (async () => {
      try {
        setBusy('auto-pick');
        const pick = await autoPickRandomEligiblePlayer(
          adminId,
          adminEmail,
          DRAFT.SESSION_ID,
          isFranchiseAdmin ? franchiseId ?? undefined : undefined,
        );
        alert(
          'Time expired',
          `Auto-picked ${pick.playerName} for ${pick.franchiseName}.`,
        );
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : '';
        const alreadyTaken =
          message.includes('already') ||
          message.includes('not eligible') ||
          message.includes('not in progress') ||
          message.includes('complete');
        if (!alreadyTaken) {
          alert('Auto-pick failed', message || 'Could not auto-pick a player.');
        }
      } finally {
        autoPickInFlightRef.current = false;
        setBusy(null);
      }
    })();
  }, [
    alert,
    clockActive,
    eligiblePlayers.length,
    franchiseId,
    isFranchiseAdmin,
    isMyTurn,
    isSuperAdmin,
    remainingMs,
    user?.email,
    user?.uid,
  ]);

  const assignFranchiseAdmins = async (adminId: string, adminEmail: string) => {
    for (const row of franchiseSetup) {
      await assignFranchiseAdmin(
        row.id,
        row.adminEmail,
        adminId,
        adminEmail,
      );
    }
    const loadedFranchises = await getFranchises();
    setFranchises(loadedFranchises);
    setFranchiseSetup(rowsFromFranchises(loadedFranchises));
  };

  const saveFranchises = async () => {
    if (!user?.uid || !user.email) return;
    const adminId = user.uid;
    const adminEmail = user.email;
    setBusy('save');
    try {
      await setupDraftFranchises(
        franchiseSetup.map(row => ({ id: row.id, name: row.name })),
        adminId,
        adminEmail,
      );
      await assignFranchiseAdmins(adminId, adminEmail);
      alert('Saved', 'Franchise names and admin access updated.');
    } catch (e: unknown) {
      alert('Error', e instanceof Error ? e.message : 'Could not save franchises');
    } finally {
      setBusy(null);
    }
  };

  const addFranchiseRow = () => {
    if (franchiseSetup.length >= DRAFT.MAX_FRANCHISES) {
      alert(
        'Franchise limit',
        `You can add at most ${DRAFT.MAX_FRANCHISES} franchises.`,
      );
      return;
    }
    setFranchiseSetup(prev => [
      ...prev,
      {
        id: nextFranchiseId(prev.map(row => row.id)),
        name: `Franchise ${prev.length + 1}`,
        adminEmail: '',
      },
    ]);
  };

  const removeFranchiseRow = (index: number) => {
    if (franchiseSetup.length <= DRAFT.MIN_FRANCHISES) {
      alert(
        'Keep at least two',
        `A rotating draft needs at least ${DRAFT.MIN_FRANCHISES} franchises.`,
      );
      return;
    }
    const row = franchiseSetup[index];
    alert(
      'Remove franchise?',
      `${row?.name || `F${index + 1}`} will be removed when you save. Locked players will be unlocked and the franchise admin will lose access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setFranchiseSetup(prev => prev.filter((_, i) => i !== index));
          },
        },
      ],
    );
  };

  const updateFranchiseRow = (
    index: number,
    patch: Partial<Pick<FranchiseSetupRow, 'name' | 'adminEmail'>>,
  ) => {
    setFranchiseSetup(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleStartDraft = () => {
    if (!user?.uid || !user.email) return;
    if (approvedCount < 1) {
      alert(
        'No approved players',
        'Approve players before starting the draft. Total picks match the approved player count.',
      );
      return;
    }
    const setupIds = [...franchiseSetup.map(row => row.id)].sort().join(',');
    const savedIds = [...franchises.map(franchise => franchise.id)]
      .sort()
      .join(',');
    if (setupIds !== savedIds) {
      alert(
        'Save franchises first',
        'Save your franchise list, then assign locked players to every franchise before starting the draft.',
      );
      return;
    }
    const missingLocks = getFranchisesMissingExtraLocks(franchises, players);
    if (missingLocks.length > 0) {
      const details = missingLocks
        .map(
          item =>
            `${item.franchise.name} (${item.locked}/${DRAFT.LOCKS_PER_FRANCHISE})`,
        )
        .join('\n');
      alert(
        'Locked players required',
        `Assign ${DRAFT.LOCKS_PER_FRANCHISE} locked players to every franchise before starting the draft.\n\n${details}`,
      );
      return;
    }
    const adminId = user.uid;
    const adminEmail = user.email;
    alert(
      'Start Draft?',
      `Begin the MCL draft with ${draftPoolCount} unlocked approved players? Rotation uses the ${franchiseSetup.length} added franchise${franchiseSetup.length === 1 ? '' : 's'} only — round 2 starts after pick ${franchiseSetup.length} (${draftSize.totalRounds} rounds).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Draft',
          onPress: async () => {
            setBusy('start');
            try {
              await setupDraftFranchises(
                franchiseSetup.map(row => ({ id: row.id, name: row.name })),
                adminId,
                adminEmail,
              );
              await assignFranchiseAdmins(adminId, adminEmail);
              await startDraft(adminId, adminEmail);
            } catch (e: unknown) {
              alert(
                'Error',
                e instanceof Error ? e.message : 'Could not start draft',
              );
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const handleStartPickClock = async () => {
    if (!user?.uid || !user.email) return;
    setBusy('clock-start');
    try {
      await startPickClock(user.uid, user.email);
      setNow(Date.now());
    } catch (e: unknown) {
      alert(
        'Error',
        e instanceof Error ? e.message : 'Could not start the pick clock',
      );
    } finally {
      setBusy(null);
    }
  };

  const handleStopPickClock = async () => {
    if (!user?.uid || !user.email) return;
    setBusy('clock-stop');
    try {
      await stopPickClock(user.uid, user.email);
    } catch (e: unknown) {
      alert(
        'Error',
        e instanceof Error ? e.message : 'Could not stop the pick clock',
      );
    } finally {
      setBusy(null);
    }
  };

  const handleLockPlayer = async (player: Player, targetFranchiseId: string) => {
    if (!user?.uid || !user.email || !isSuperAdmin) return;
    setBusy(`lock-${player.id}`);
    try {
      await lockPlayerForFranchise(
        player.id,
        targetFranchiseId,
        user.uid,
        user.email,
      );
    } catch (e: unknown) {
      alert(
        'Lock failed',
        e instanceof Error ? e.message : 'Could not lock this player',
      );
    } finally {
      setBusy(null);
    }
  };

  const handleUnlockPlayer = async (player: Player, targetFranchiseId: string) => {
    if (!user?.uid || !user.email || !isSuperAdmin) return;
    setBusy(`unlock-${player.id}`);
    try {
      await unlockPlayerForFranchise(
        player.id,
        targetFranchiseId,
        user.uid,
        user.email,
      );
    } catch (e: unknown) {
      alert(
        'Unlock failed',
        e instanceof Error ? e.message : 'Could not unlock this player',
      );
    } finally {
      setBusy(null);
    }
  };

  const handleSetCaptain = async (player: Player, targetFranchiseId: string) => {
    if (!user?.uid || !user.email) return;
    const canSet =
      isSuperAdmin ||
      (isFranchiseAdmin && franchiseId === targetFranchiseId);
    if (!canSet) return;

    setBusy(`captain-${player.id}`);
    try {
      await setFranchiseCaptain(
        targetFranchiseId,
        player.id,
        user.uid,
        user.email,
      );
    } catch (e: unknown) {
      alert(
        'Captain failed',
        e instanceof Error ? e.message : 'Could not set captain',
      );
    } finally {
      setBusy(null);
    }
  };

  const handlePickPlayer = (player: Player) => {
    if (!user?.uid || !user.email || !onClock || !canPick) return;
    const adminId = user.uid;
    const adminEmail = user.email;
    const pickingFor = isFranchiseAdmin ? franchiseName ?? onClock.name : onClock.name;

    alert(
      'Confirm Pick',
      `Are you sure you want to pick ${player.fullName} (${player.playerId}) for ${pickingFor}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pick Player',
          onPress: async () => {
            setBusy(`pick-${player.id}`);
            try {
              const pick = await submitDraftPick(
                player.id,
                adminId,
                adminEmail,
                DRAFT.SESSION_ID,
                isFranchiseAdmin ? franchiseId ?? undefined : undefined,
              );
              setPlayers(prev =>
                prev.map(p =>
                  p.id === player.id
                    ? {
                        ...p,
                        draftedFranchiseId: pick.franchiseId,
                        draftPickNumber: pick.pickNumber,
                      }
                    : p,
                ),
              );
              setPicks(prev => {
                if (prev.some(existing => existing.pickNumber === pick.pickNumber)) {
                  return prev;
                }
                return [...prev, pick].sort((a, b) => a.pickNumber - b.pickNumber);
              });
            } catch (e: unknown) {
              alert(
                'Pick failed',
                e instanceof Error ? e.message : 'Could not submit pick',
              );
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const handleUndo = () => {
    if (!user?.uid || !user.email) return;
    const adminId = user.uid;
    const adminEmail = user.email;
    const last = picks[picks.length - 1];
    if (!last) return;

    alert(
      'Undo Last Pick?',
      `Remove pick #${last.pickNumber}: ${last.playerName} → ${last.franchiseName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          style: 'destructive',
          onPress: async () => {
            setBusy('undo');
            try {
              await undoLastDraftPick(adminId, adminEmail);
              await loadPlayers();
            } catch (e: unknown) {
              alert('Error', e instanceof Error ? e.message : 'Could not undo pick');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const handleCompleteDraft = () => {
    if (!user?.uid || !user.email) return;
    const adminId = user.uid;
    const adminEmail = user.email;
    const remaining = pickProgress.remaining;
    alert(
      'Complete Draft?',
      remaining > 0
        ? `End the draft now with ${remaining} eligible player${remaining === 1 ? '' : 's'} still left undrafted? Franchises can export squad PDFs after this.`
        : 'Mark the draft as complete? Franchises can export squad PDFs after this.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Draft',
          style: 'destructive',
          onPress: async () => {
            setBusy('complete');
            try {
              await completeDraft(adminId, adminEmail);
            } catch (e: unknown) {
              alert(
                'Error',
                e instanceof Error ? e.message : 'Could not complete draft',
              );
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const handleReset = () => {
    if (!user?.uid || !user.email) return;
    const adminId = user.uid;
    const adminEmail = user.email;
    alert(
      'Reset Draft?',
      'This will delete all picks and clear drafted players. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Draft',
          style: 'destructive',
          onPress: async () => {
            setBusy('reset');
            try {
              await resetDraft(adminId, adminEmail);
              await loadPlayers();
            } catch (e: unknown) {
              alert('Error', e instanceof Error ? e.message : 'Could not reset draft');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const sharePdf = async (
    base64: string,
    filename: string,
    title: string,
  ) => {
    await Share.open({
      title,
      subject: title,
      message: title,
      filename,
      type: 'application/pdf',
      url: `data:application/pdf;base64,${base64}`,
      useInternalStorage: true,
      failOnCancel: false,
    });
  };

  const exportSquadPdfs = async () => {
    if (picks.length === 0) {
      alert('No picks', 'Complete the draft before exporting squad PDFs.');
      return;
    }
    setBusy('export-squads');
    try {
      const squadPicks = [
        ...franchises.flatMap(franchise =>
          buildLockedPicksForFranchise(players, franchise),
        ),
        ...picks,
      ];
      const pdfs = await buildAllFranchiseSquadPdfs(
        squadPicks,
        franchises,
        playerImageMap,
      );
      for (const item of pdfs) {
        await sharePdf(
          item.base64,
          item.filename,
          `${item.franchise.name} Squad`,
        );
      }
      alert('Exported', 'All franchise squad PDFs have been shared.');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Export failed';
      if (!isShareCancelled(message)) {
        alert('Export failed', message);
      }
    } finally {
      setBusy(null);
    }
  };

  const downloadSquadPdfs = async () => {
    if (picks.length === 0) {
      alert('No picks', 'Complete the draft before downloading squad PDFs.');
      return;
    }

    setBusy('download-squads');
    try {
      const squadPicks = [
        ...franchises.flatMap(franchise =>
          buildLockedPicksForFranchise(players, franchise),
        ),
        ...picks,
      ];
      const pdfs = await buildAllFranchiseSquadPdfs(
        squadPicks,
        franchises,
        playerImageMap,
      );
      const { dirs } = ReactNativeBlobUtil.fs;
      const dir = Platform.OS === 'ios' ? dirs.DocumentDir : dirs.DownloadDir;

      for (const item of pdfs) {
        const path = `${dir}/${item.filename}`;
        await ReactNativeBlobUtil.fs.writeFile(path, item.base64, 'base64');

        if (Platform.OS === 'android') {
          try {
            await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
              {
                name: item.filename,
                parentFolder: 'MCL2026',
                mimeType: 'application/pdf',
              },
              'Download',
              path,
            );
          } catch {
            // File still saved to DownloadDir even if MediaStore copy fails
          }
        }
      }

      alert(
        'Downloaded',
        `Saved ${pdfs.length} franchise squad PDFs to your device.`,
      );
    } catch (e: unknown) {
      alert(
        'Download failed',
        e instanceof Error ? e.message : 'Could not save PDFs.',
      );
    } finally {
      setBusy(null);
    }
  };

  const downloadMySquadPdf = async () => {
    if (!franchiseId) {
      alert('Error', 'Franchise not found.');
      return;
    }
    const myFranchise = franchises.find(f => f.id === franchiseId);
    if (!myFranchise) {
      alert('Error', 'Franchise not found.');
      return;
    }
    const lockPicks = buildLockedPicksForFranchise(players, myFranchise);
    const squadPicks = [...lockPicks, ...myPicks];
    if (squadPicks.length === 0) {
      alert('No picks', 'Your franchise has no locked or drafted players yet.');
      return;
    }

    setBusy('download-my-squad');
    try {
      const base64 = await buildFranchiseSquadPdfBase64(
        myFranchise,
        squadPicks,
        playerImageMap,
      );
      const safeName = myFranchise.name.replace(/[^a-zA-Z0-9]+/g, '-');
      const filename = `MCL-2026-27-${safeName}-Squad.pdf`;
      const { dirs } = ReactNativeBlobUtil.fs;
      const dir = Platform.OS === 'ios' ? dirs.DocumentDir : dirs.DownloadDir;
      const path = `${dir}/${filename}`;

      await ReactNativeBlobUtil.fs.writeFile(path, base64, 'base64');

      if (Platform.OS === 'android') {
        try {
          await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
            {
              name: filename,
              parentFolder: 'MCL2026',
              mimeType: 'application/pdf',
            },
            'Download',
            path,
          );
        } catch {
          // File still saved even if MediaStore copy fails
        }
      }

      alert(
        'Downloaded',
        Platform.OS === 'ios'
          ? `Saved as ${filename} in app Documents.`
          : `Saved to Downloads as ${filename}`,
      );
    } catch (e: unknown) {
      alert(
        'Download failed',
        e instanceof Error ? e.message : 'Could not save PDF.',
      );
    } finally {
      setBusy(null);
    }
  };

  const shareMySquadPdf = async () => {
    if (!franchiseId) {
      alert('Error', 'Franchise not found.');
      return;
    }
    const myFranchise = franchises.find(f => f.id === franchiseId);
    if (!myFranchise) {
      alert('Error', 'Franchise not found.');
      return;
    }
    const lockPicks = buildLockedPicksForFranchise(players, myFranchise);
    const squadPicks = [...lockPicks, ...myPicks];
    if (squadPicks.length === 0) {
      alert('No picks', 'Your franchise has no locked or drafted players yet.');
      return;
    }

    setBusy('share-my-squad');
    try {
      const base64 = await buildFranchiseSquadPdfBase64(
        myFranchise,
        squadPicks,
        playerImageMap,
      );
      const safeName = myFranchise.name.replace(/[^a-zA-Z0-9]+/g, '-');
      const filename = `MCL-2026-27-${safeName}-Squad.pdf`;
      await sharePdf(base64, filename, `${myFranchise.name} Squad`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Export failed';
      if (!isShareCancelled(message)) {
        alert('Export failed', message);
      }
    } finally {
      setBusy(null);
    }
  };

  const downloadOwnerSquadPoster = async () => {
    if (!franchiseId) {
      alert('Error', 'Franchise not found.');
      return;
    }
    const myFranchise = franchises.find(f => f.id === franchiseId);
    if (!myFranchise) {
      alert('Error', 'Franchise not found.');
      return;
    }
    const lockPicks = buildLockedPicksForFranchise(players, myFranchise);
    const squadPicks = [...lockPicks, ...myPicks];
    if (squadPicks.length === 0) {
      alert('No picks', 'Your franchise has no locked or drafted players yet.');
      return;
    }

    setBusy('download-owner-poster');
    try {
      const owner = getFranchiseOwnerPlayer(players, myFranchise);
      const base64 = await buildOwnerSquadPosterBase64(
        myFranchise,
        squadPicks,
        myFranchise.captainPlayerId ?? owner?.id,
        owner?.id,
        playerImageMap,
      );
      const filename = getOwnerSquadPosterFilename(myFranchise.name);
      const { dirs } = ReactNativeBlobUtil.fs;
      const dir = Platform.OS === 'ios' ? dirs.DocumentDir : dirs.DownloadDir;
      const path = `${dir}/${filename}`;

      await ReactNativeBlobUtil.fs.writeFile(path, base64, 'base64');

      if (Platform.OS === 'android') {
        try {
          await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
            {
              name: filename,
              parentFolder: 'MCL2026',
              mimeType: 'application/pdf',
            },
            'Download',
            path,
          );
        } catch {
          // File still saved even if MediaStore copy fails
        }
      }

      alert(
        'Downloaded',
        Platform.OS === 'ios'
          ? `Saved as ${filename} in app Documents.`
          : `Saved to Downloads as ${filename}`,
      );
    } catch (e: unknown) {
      alert(
        'Download failed',
        e instanceof Error ? e.message : 'Could not save owner squad poster.',
      );
    } finally {
      setBusy(null);
    }
  };

  const shareOwnerSquadPoster = async () => {
    if (!franchiseId) {
      alert('Error', 'Franchise not found.');
      return;
    }
    const myFranchise = franchises.find(f => f.id === franchiseId);
    if (!myFranchise) {
      alert('Error', 'Franchise not found.');
      return;
    }
    const lockPicks = buildLockedPicksForFranchise(players, myFranchise);
    const squadPicks = [...lockPicks, ...myPicks];
    if (squadPicks.length === 0) {
      alert('No picks', 'Your franchise has no locked or drafted players yet.');
      return;
    }

    setBusy('share-owner-poster');
    try {
      const owner = getFranchiseOwnerPlayer(players, myFranchise);
      const base64 = await buildOwnerSquadPosterBase64(
        myFranchise,
        squadPicks,
        myFranchise.captainPlayerId ?? owner?.id,
        owner?.id,
        playerImageMap,
      );
      const filename = getOwnerSquadPosterFilename(myFranchise.name);
      await sharePdf(
        base64,
        filename,
        `${myFranchise.name} Owner Squad Poster`,
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Export failed';
      if (!isShareCancelled(message)) {
        alert('Export failed', message);
      }
    } finally {
      setBusy(null);
    }
  };

  const downloadAllOwnerSquadPosters = async () => {
    setBusy('download-owner-posters');
    try {
      const picksByFranchise = new Map<string, DraftPick[]>();
      const captainPlayerDocIdByFranchise = new Map<string, string | undefined>();
      const ownerPlayerDocIdByFranchise = new Map<string, string | undefined>();

      for (const franchise of franchises) {
        const lockPicks = buildLockedPicksForFranchise(players, franchise);
        const drafted = picks.filter(p => p.franchiseId === franchise.id);
        const squadPicks = [...lockPicks, ...drafted];
        picksByFranchise.set(franchise.id, squadPicks);
        const owner = getFranchiseOwnerPlayer(players, franchise);
        captainPlayerDocIdByFranchise.set(
          franchise.id,
          franchise.captainPlayerId ?? owner?.id,
        );
        ownerPlayerDocIdByFranchise.set(franchise.id, owner?.id);
      }

      const posters = await buildAllOwnerSquadPosters(
        franchises,
        picksByFranchise,
        captainPlayerDocIdByFranchise,
        ownerPlayerDocIdByFranchise,
        playerImageMap,
      );

      if (posters.length === 0) {
        alert('No squads', 'No franchise squads available to export.');
        return;
      }

      const { dirs } = ReactNativeBlobUtil.fs;
      const dir = Platform.OS === 'ios' ? dirs.DocumentDir : dirs.DownloadDir;

      for (const item of posters) {
        const path = `${dir}/${item.filename}`;
        await ReactNativeBlobUtil.fs.writeFile(path, item.base64, 'base64');

        if (Platform.OS === 'android') {
          try {
            await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
              {
                name: item.filename,
                parentFolder: 'MCL2026',
                mimeType: 'application/pdf',
              },
              'Download',
              path,
            );
          } catch {
            // File still saved even if MediaStore copy fails
          }
        }
      }

      alert(
        'Downloaded',
        `Saved ${posters.length} owner squad posters to your device.`,
      );
    } catch (e: unknown) {
      alert(
        'Download failed',
        e instanceof Error ? e.message : 'Could not save owner squad posters.',
      );
    } finally {
      setBusy(null);
    }
  };

  const exportDraftBoard = async () => {
    if (picks.length === 0) {
      alert('No picks', 'No draft picks to export.');
      return;
    }
    setBusy('export-board');
    try {
      const base64 = await buildFullDraftBoardPdfBase64(picks, franchises);
      const filename = getDraftBoardFilename();
      await sharePdf(base64, filename, 'MCL 2026-27 Draft Board');

      if (Platform.OS === 'android') {
        const path = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${filename}`;
        await ReactNativeBlobUtil.fs.writeFile(path, base64, 'base64');
        alert('Downloaded', `Saved to Downloads/${filename}`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Export failed';
      if (!isShareCancelled(message)) {
        alert('Export failed', message);
      }
    } finally {
      setBusy(null);
    }
  };

  const renderPlayer = ({ item }: { item: Player }) => {
    const picking = busy === `pick-${item.id}`;
    const disabled = !!busy || !canPick;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.playerRow,
          disabled && styles.playerRowDisabled,
          pressed && !disabled && styles.pressed,
        ]}
        onPress={() => handlePickPlayer(item)}
        disabled={disabled}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <AppIcon name="account" size={22} color={colors.silver[400]} />
          </View>
        )}
        <View style={styles.playerInfo}>
          <Text style={styles.playerName} numberOfLines={1}>{item.fullName}</Text>
          <Text style={styles.playerMeta} numberOfLines={1}>
            {item.playerId} · {item.role} · {getCategoryLabel(item.category)}
          </Text>
          <Text style={styles.playerMeta} numberOfLines={1}>
            {item.city} · Shirt #{item.shirtNumber ?? '—'}
          </Text>
        </View>
        {picking ? (
          <ActivityIndicator color={colors.lime[500]} />
        ) : (
          <View style={styles.pickChevron}>
            <AppIcon name="chevron-right" size={20} color={colors.lime[500]} />
          </View>
        )}
      </Pressable>
    );
  };

  if (loading) {
    return <ScreenSkeleton variant="list" />;
  }

  const isSetup = isSuperAdmin && (!session || session.status === 'SETUP');
  const isLive = session?.status === 'IN_PROGRESS';
  const isComplete = session?.status === 'COMPLETED';
  const contentPaddingBottom = 48;

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: contentPaddingBottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.lime[500]}
          />
        }>
        <LeagueHeader
          compact
          subtitle={isFranchiseAdmin ? franchiseName ?? 'Franchise Draft' : 'Player Draft'}
        />

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.sectionIcon}>
              <AppIcon name="chart-timeline-variant" size={20} color={colors.lime[500]} />
            </View>
            <View style={styles.progressHeaderText}>
              <Text style={styles.progressTitle}>Draft Progress</Text>
              <View
                style={[
                  styles.statusPill,
                  isLive && styles.statusPillLive,
                  isComplete && styles.statusPillDone,
                ]}>
                <Text
                  style={[
                    styles.statusPillText,
                    isLive && styles.statusPillTextLive,
                    isComplete && styles.statusPillTextDone,
                  ]}>
                  {isComplete ? 'COMPLETE' : isLive ? 'LIVE' : 'SETUP'}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.progressValue}>
            {pickProgress.current} / {pickProgress.total}
            <Text style={styles.progressValueUnit}> picks</Text>
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    pickProgress.total === 0
                      ? 0
                      : (pickProgress.current / pickProgress.total) * 100
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>
            {isFranchiseAdmin && session?.status === 'SETUP' &&
              'You are auto-locked as owner. Super admin will assign 3 locked players. You can make yourself or any locked player captain.'}
            {isSuperAdmin && isSetup &&
              (missingLockAssignments.length > 0
                ? `Assign ${DRAFT.LOCKS_PER_FRANCHISE} locked players to every franchise before starting. Incomplete: ${missingLockAssignments
                    .map(
                      item =>
                        `${item.franchise.name} (${item.locked}/${DRAFT.LOCKS_PER_FRANCHISE})`,
                    )
                    .join(', ')}.`
                : `All franchises have ${DRAFT.LOCKS_PER_FRANCHISE} locked players. Draft pool is ${draftPoolCount} unlocked approved players.`)}
              {isLive &&
              nextPickDetails &&
              `Pick #${session!.currentPickNumber} · Round ${nextPickDetails.round} of ${draftSize.totalRounds} · ${activeFranchiseCount} franchises · ${pickProgress.remaining} eligible left`}
            {isComplete && isSuperAdmin && 'Draft complete. Export squad PDFs below.'}
            {isComplete && isFranchiseAdmin && 'Draft complete. Download your squad or owner poster below.'}
          </Text>
        </View>

        {isLive && onClock && (
          <PremiumClockCard
            clockActive={clockActive}
            clockPaused={clockPaused}
            clockUrgent={clockUrgent}
            remainingMs={remainingMs}
            isSuperAdmin={isSuperAdmin}
            showResumeClock={showResumeClock}
            busy={busy}
            onStart={handleStartPickClock}
            onStop={handleStopPickClock}
          />
        )}

        {isLive && onClock && (isSuperAdmin || isMyTurn) && (
          <View style={styles.onClockCard}>
            <View style={styles.onClockBadge}>
              <AppIcon name="timer-sand" size={14} color={colors.forest[950]} />
              <Text style={styles.onClockLabel}>ON THE CLOCK</Text>
            </View>
            <Text style={styles.onClockName}>
              {isFranchiseAdmin ? franchiseName ?? onClock.name : onClock.name}
            </Text>
            <Text style={styles.onClockMeta}>
              Pick #{session!.currentPickNumber} · {eligiblePlayers.length} eligible
              players remaining
              {isMyTurn && !clockActive
                ? clockPaused
                  ? ' · Waiting for super admin to resume the clock'
                  : ' · Waiting for super admin to start the clock'
                : ''}
            </Text>
          </View>
        )}

        {isLive && isFranchiseAdmin && onClock && !isMyTurn && (
          <View style={styles.waitingCard}>
            <View style={styles.waitingBadge}>
              <AppIcon name="clock-outline" size={14} color={colors.silver[400]} />
              <Text style={styles.waitingLabel}>WAITING</Text>
            </View>
            <Text style={styles.waitingTitle}>{onClock.name} is picking now</Text>
            <Text style={styles.waitingMeta}>
              You can pick when {franchiseName ?? 'your franchise'} is on the clock
              and the 2:00 timer is running.
            </Text>
          </View>
        )}

        {isSetup && (
          <DraftSection
            icon="shield-crown-outline"
            title="Franchise Setup"
            hint={`Add or remove franchises, then save. The pick order uses only these teams: ${franchiseSetup.length} franchises means round 1 has ${franchiseSetup.length} picks, then round 2 starts. Draft pool is ${draftPoolCount} unlocked approved players (${draftSize.totalRounds} rounds). Super admin assigns ${DRAFT.LOCKS_PER_FRANCHISE} locked players per franchise. Owners are auto-locked. Order rotates each round (F1 first, then F2, wrapping around).`}>
            {franchiseSetup.map((row, index) => (
              <View key={row.id} style={styles.franchiseBlock}>
                <View style={styles.franchiseBlockHeader}>
                  <Text style={styles.franchiseIndex}>F{index + 1}</Text>
                  <Text style={styles.franchiseBlockHint} numberOfLines={1}>
                    {row.name.trim() || `Franchise ${index + 1}`}
                  </Text>
                  {franchiseSetup.length > DRAFT.MIN_FRANCHISES ? (
                    <Pressable
                      onPress={() => removeFranchiseRow(index)}
                      disabled={!!busy}
                      hitSlop={8}
                      style={styles.removeBtn}
                      accessibilityLabel={`Remove ${row.name || `franchise ${index + 1}`}`}>
                      <AppIcon
                        name="minus-circle-outline"
                        size={22}
                        color={colors.status.rejected}
                      />
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <RNTextInput
                    value={row.name}
                    onChangeText={text =>
                      updateFranchiseRow(index, { name: text })
                    }
                    placeholder={`Franchise ${index + 1}`}
                    placeholderTextColor={colors.silver[400]}
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Admin</Text>
                  <RNTextInput
                    value={row.adminEmail}
                    onChangeText={text =>
                      updateFranchiseRow(index, { adminEmail: text })
                    }
                    placeholder="Franchise admin email (must be registered)"
                    placeholderTextColor={colors.silver[400]}
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>
            ))}
            <PremiumButton
              variant="outline"
              onPress={addFranchiseRow}
              disabled={
                franchiseSetup.length >= DRAFT.MAX_FRANCHISES || !!busy
              }
              style={{ marginTop: 4 }}
              icon={() => (
                <AppIcon name="plus" size={18} color={colors.lime[500]} />
              )}>
              Add Franchise
            </PremiumButton>
            <View style={[styles.buttonRow, wideLayout && styles.buttonRowWide]}>
              <PremiumButton
                variant="outline"
                onPress={saveFranchises}
                loading={busy === 'save'}
                disabled={!!busy && busy !== 'save'}
                style={
                  wideLayout
                    ? styles.setupActionButtonWide
                    : styles.setupActionButton
                }>
                Save Franchises
              </PremiumButton>
              <PremiumButton
                onPress={handleStartDraft}
                loading={busy === 'start'}
                disabled={
                  missingLockAssignments.length > 0 ||
                  (!!busy && busy !== 'start')
                }
                style={
                  wideLayout
                    ? styles.setupActionButtonWide
                    : styles.setupActionButton
                }
                icon={() => (
                  <AppIcon name="play" size={18} color={colors.forest[950]} />
                )}>
                Start Draft
              </PremiumButton>
            </View>
          </DraftSection>
        )}

        {(!session || session.status === 'SETUP') && isFranchiseAdmin && (
          <FranchiseLockSection
            mode="owner"
            franchiseId={franchiseId}
            franchises={franchises}
            players={players}
            busy={busy}
            onLock={handleLockPlayer}
            onUnlock={handleUnlockPlayer}
            onSetCaptain={handleSetCaptain}
          />
        )}

        {isSetup && (
          <FranchiseLockSection
            mode="admin"
            franchises={franchises}
            players={players}
            busy={busy}
            onLock={handleLockPlayer}
            onUnlock={handleUnlockPlayer}
            onSetCaptain={handleSetCaptain}
          />
        )}

        {isLive && (isSuperAdmin || isFranchiseAdmin) && (
          <>
            <DraftSection
              icon="account-search"
              title="Eligible Players"
              hint={`Approved players still available for the draft. Franchise owners and locked players (1 owner + 3 locks per team) are already on a squad and are not listed here.${
                isFranchiseAdmin && !isMyTurn
                  ? ' You can pick only when your franchise is on the clock.'
                  : isFranchiseAdmin && isMyTurn && !clockActive
                    ? ' Super admin must start the 2:00 clock before you can pick.'
                    : ''
              }`}>
              <View style={styles.searchBox}>
                <AppIcon name="magnify" size={20} color={colors.silver[400]} />
                <RNTextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search eligible players…"
                  placeholderTextColor={colors.silver[400]}
                  style={styles.searchInput}
                />
              </View>
              <FlatList
                data={filteredEligible}
                keyExtractor={item => item.id}
                renderItem={renderPlayer}
                extraData={`${picks.length}-${canPick}-${busy}`}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    No eligible players match your search.
                  </Text>
                }
              />
            </DraftSection>

            {isFranchiseAdmin && (
              <DraftSection
                icon="account-group"
                title="My Squad Picks"
                hint="Tap Make Captain on yourself or any locked player.">
                {myLockedPlayers.length === 0 && myPicks.length === 0 ? (
                  <Text style={styles.emptyText}>No squad picks yet.</Text>
                ) : (
                  <>
                    {myLockedPlayers.map(player => {
                      const img = player.profileImage;
                      const myFranchise = franchises.find(f => f.id === franchiseId);
                      const isCaptain =
                        myFranchise?.captainPlayerId === player.id;
                      return (
                        <View key={`lock-${player.id}`} style={styles.pickRow}>
                          <Text style={styles.pickNumber}>
                            {player.userId === user?.uid ? 'OWNER' : 'LOCK'}
                          </Text>
                          {img ? (
                            <Image source={{ uri: img }} style={styles.pickAvatar} />
                          ) : (
                            <View style={[styles.pickAvatar, styles.pickAvatarPlaceholder]}>
                              <AppIcon name="lock" size={18} color={colors.silver[400]} />
                            </View>
                          )}
                          <View style={styles.pickInfo}>
                            <Text style={styles.pickPlayer} numberOfLines={1}>
                              {player.fullName}
                              {isCaptain ? ' (C)' : ''}
                            </Text>
                            <Text style={styles.pickMeta} numberOfLines={1}>
                              {player.userId === user?.uid
                                ? 'Team owner · Auto locked'
                                : `Locked · ${player.role}`}
                            </Text>
                          </View>
                          {!isCaptain && franchiseId ? (
                            <Pressable
                              onPress={() => handleSetCaptain(player, franchiseId)}
                              disabled={!!busy}
                              style={({ pressed }) => [
                                styles.captainPickChip,
                                !!busy && styles.captainPickChipDisabled,
                                pressed && { opacity: 0.85 },
                              ]}>
                              <Text style={styles.captainPickText}>
                                {busy === `captain-${player.id}`
                                  ? '…'
                                  : 'Make Captain'}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      );
                    })}
                    {myPicks.map(pick => {
                    const img = playerImageMap.get(pick.playerDocId);
                    return (
                      <View key={pick.id} style={styles.pickRow}>
                        <Text style={styles.pickNumber}>#{pick.pickNumber}</Text>
                        {img ? (
                          <Image source={{ uri: img }} style={styles.pickAvatar} />
                        ) : (
                          <View style={[styles.pickAvatar, styles.pickAvatarPlaceholder]}>
                            <AppIcon name="account" size={18} color={colors.silver[400]} />
                          </View>
                        )}
                        <View style={styles.pickInfo}>
                          <Text style={styles.pickPlayer} numberOfLines={1}>
                            {pick.playerName}
                          </Text>
                          <Text style={styles.pickMeta} numberOfLines={1}>
                            Round {pick.round} · {pick.playerRole}
                            {pick.isAutoPick ? ' · AUTO' : ''}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                  </>
                )}
              </DraftSection>
            )}

            <DraftSection
              icon="history"
              title={isFranchiseAdmin ? 'Recent Draft Picks' : 'Recent Picks'}
              right={
                isSuperAdmin && picks.length > 0 ? (
                  <Pressable onPress={handleUndo} disabled={!!busy} hitSlop={8}>
                    <Text style={styles.linkText}>Undo last</Text>
                  </Pressable>
                ) : null
              }>
              {[...picks]
                .reverse()
                .slice(0, 8)
                .map(pick => {
                  const img = playerImageMap.get(pick.playerDocId);
                  return (
                    <View key={pick.id} style={styles.pickRow}>
                      <Text style={styles.pickNumber}>#{pick.pickNumber}</Text>
                      {img ? (
                        <Image source={{ uri: img }} style={styles.pickAvatar} />
                      ) : (
                        <View style={[styles.pickAvatar, styles.pickAvatarPlaceholder]}>
                          <AppIcon name="account" size={18} color={colors.silver[400]} />
                        </View>
                      )}
                      <View style={styles.pickInfo}>
                        <Text style={styles.pickPlayer} numberOfLines={1}>
                          {pick.playerName}
                        </Text>
                        <Text style={styles.pickMeta} numberOfLines={1}>
                          {pick.franchiseName} · R{pick.round}
                          {pick.isAutoPick ? ' · AUTO' : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              {picks.length === 0 && (
                <Text style={styles.emptyText}>No picks yet.</Text>
              )}
            </DraftSection>
          </>
        )}

        {isFranchiseAdmin && isComplete && (myPicks.length > 0 || myLockedPlayers.length > 0) && (
          <DraftSection
            icon="file-download-outline"
            title="Your Squad"
            hint={`Download or share your ${franchiseName ?? 'franchise'} squad PDF and owner poster (${myPicks.length + myLockedPlayers.length} players).`}>
            <PremiumButton
              onPress={downloadMySquadPdf}
              loading={busy === 'download-my-squad'}
              disabled={!!busy && busy !== 'download-my-squad'}
              icon={() => (
                <AppIcon name="download" size={18} color={colors.forest[950]} />
              )}>
              Download My Squad PDF
            </PremiumButton>
            <PremiumButton
              variant="outline"
              onPress={shareMySquadPdf}
              loading={busy === 'share-my-squad'}
              disabled={!!busy && busy !== 'share-my-squad'}
              style={{ marginTop: 10 }}
              icon={() => (
                <AppIcon name="share-variant" size={18} color={colors.lime[500]} />
              )}>
              Share My Squad PDF
            </PremiumButton>
            <PremiumButton
              onPress={downloadOwnerSquadPoster}
              loading={busy === 'download-owner-poster'}
              disabled={!!busy && busy !== 'download-owner-poster'}
              style={{ marginTop: 10 }}
              icon={() => (
                <AppIcon name="account-star" size={18} color={colors.forest[950]} />
              )}>
              Download Squad for Owner
            </PremiumButton>
            <PremiumButton
              variant="outline"
              onPress={shareOwnerSquadPoster}
              loading={busy === 'share-owner-poster'}
              disabled={!!busy && busy !== 'share-owner-poster'}
              style={{ marginTop: 10 }}
              icon={() => (
                <AppIcon name="image-multiple" size={18} color={colors.lime[500]} />
              )}>
              Share Squad for Owner
            </PremiumButton>
          </DraftSection>
        )}

        {isSuperAdmin && (isComplete || picks.length > 0) && (
          <DraftSection
            icon="file-pdf-box"
            title="Export Draft PDFs"
            hint={`Share ${franchises.length} franchise squad PDFs and the full draft board.`}>
            <PremiumButton
              onPress={exportSquadPdfs}
              loading={busy === 'export-squads'}
              disabled={!!busy && busy !== 'export-squads'}
              icon={() => (
                <AppIcon name="file-pdf-box" size={18} color={colors.forest[950]} />
              )}>
              Export All Squad PDFs
            </PremiumButton>
            {isComplete && (
              <PremiumButton
                variant="outline"
                onPress={downloadSquadPdfs}
                loading={busy === 'download-squads'}
                disabled={!!busy && busy !== 'download-squads'}
                style={{ marginTop: 10 }}
                icon={() => (
                  <AppIcon name="download" size={18} color={colors.lime[500]} />
                )}>
                Download All Squad PDFs
              </PremiumButton>
            )}
            {isComplete && (
              <PremiumButton
                variant="outline"
                onPress={downloadAllOwnerSquadPosters}
                loading={busy === 'download-owner-posters'}
                disabled={!!busy && busy !== 'download-owner-posters'}
                style={{ marginTop: 10 }}
                icon={() => (
                  <AppIcon name="account-star" size={18} color={colors.lime[500]} />
                )}>
                Download All Teams Posters
              </PremiumButton>
            )}
            <PremiumButton
              variant="outline"
              onPress={exportDraftBoard}
              loading={busy === 'export-board'}
              disabled={!!busy && busy !== 'export-board'}
              style={{ marginTop: 10 }}
              icon={() => (
                <AppIcon name="table" size={18} color={colors.lime[500]} />
              )}>
              Export Draft Board
            </PremiumButton>
          </DraftSection>
        )}

        {isSuperAdmin && !isSetup && (
          <View style={styles.dangerSection}>
            {isLive && (
              <PremiumButton
                variant="outline"
                onPress={handleCompleteDraft}
                loading={busy === 'complete'}
                disabled={!!busy && busy !== 'complete'}
                style={{ marginBottom: 10 }}
                icon={() => (
                  <AppIcon name="check" size={18} color={colors.lime[500]} />
                )}>
                Complete Draft
              </PremiumButton>
            )}
            <PremiumButton
              variant="outline"
              onPress={handleReset}
              loading={busy === 'reset'}
              disabled={!!busy && busy !== 'reset'}
              icon={() => (
                <AppIcon name="refresh" size={18} color={colors.status.rejected} />
              )}>
              Reset Draft
            </PremiumButton>
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: colors.silver[400] },
  progressCard: {
    backgroundColor: colors.forest[800],
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(163,207,45,0.28)',
    shadowColor: colors.lime[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressTitle: {
    color: colors.silver[400],
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  statusPill: {
    backgroundColor: 'rgba(163,207,45,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(163,207,45,0.28)',
  },
  statusPillLive: {
    backgroundColor: 'rgba(212,175,55,0.16)',
    borderColor: 'rgba(212,175,55,0.45)',
  },
  statusPillDone: {
    backgroundColor: 'rgba(163,207,45,0.22)',
    borderColor: colors.lime[500],
  },
  statusPillText: {
    color: colors.lime[400],
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusPillTextLive: {
    color: colors.gold[400],
  },
  statusPillTextDone: {
    color: colors.lime[500],
  },
  progressValue: {
    color: colors.lime[500],
    fontSize: 32,
    fontWeight: '900',
    marginTop: 14,
    letterSpacing: 0.3,
  },
  progressValueUnit: {
    color: colors.silver[400],
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: colors.forest[900],
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.forest[700],
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.lime[500],
    borderRadius: 6,
  },
  progressHint: {
    color: colors.silver[400],
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
  },
  onClockCard: {
    backgroundColor: colors.gold[500],
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold[400],
  },
  onClockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(3,10,5,0.14)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  onClockLabel: {
    color: colors.forest[950],
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  onClockName: {
    color: colors.forest[950],
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10,
    textAlign: 'center',
  },
  onClockMeta: {
    color: colors.forest[800],
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  waitingCard: {
    backgroundColor: colors.forest[800],
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(163,207,45,0.22)',
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waitingLabel: {
    color: colors.silver[400],
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  waitingTitle: {
    color: colors.silver[50],
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  waitingMeta: {
    color: colors.silver[400],
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  franchiseBlock: {
    marginBottom: 12,
    backgroundColor: colors.forest[900],
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.forest[700],
  },
  franchiseBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  franchiseIndex: {
    color: colors.forest[950],
    backgroundColor: colors.lime[500],
    fontWeight: '900',
    fontSize: 11,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  franchiseBlockHint: {
    flex: 1,
    color: colors.silver[300],
    fontWeight: '700',
    fontSize: 13,
  },
  removeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: colors.forest[800],
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(163,207,45,0.28)',
    shadowColor: colors.lime[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  dangerSection: {
    backgroundColor: colors.forest[800],
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  sectionIntro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(163,207,45,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(163,207,45,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIntroText: {
    flex: 1,
    minWidth: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    color: colors.silver[50],
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  sectionHint: {
    color: colors.silver[400],
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  accentBar: {
    height: 2,
    width: 48,
    backgroundColor: colors.gold[500],
    borderRadius: 1,
    marginTop: 14,
    marginBottom: 16,
    opacity: 0.9,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  inputLabel: {
    color: colors.lime[500],
    fontWeight: '800',
    width: 48,
    fontSize: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.forest[800],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.silver[50],
    borderWidth: 1,
    borderColor: colors.forest[600],
    fontSize: 15,
  },
  buttonRow: {
    marginTop: 12,
    gap: 10,
  },
  buttonRowWide: {
    flexDirection: 'row',
  },
  setupActionButton: {
    width: '100%',
  },
  setupActionButtonWide: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.forest[900],
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.forest[600],
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    color: colors.silver[50],
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 15,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: colors.forest[900],
    borderWidth: 1,
    borderColor: colors.forest[700],
    gap: 10,
  },
  playerRowDisabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.88,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.55)',
  },
  avatarPlaceholder: {
    backgroundColor: colors.forest[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.forest[600],
  },
  playerInfo: { flex: 1, minWidth: 0 },
  playerName: {
    color: colors.silver[50],
    fontWeight: '800',
    fontSize: 14,
  },
  playerMeta: {
    color: colors.silver[400],
    fontSize: 12,
    marginTop: 2,
  },
  pickChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(163,207,45,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: colors.forest[900],
    borderWidth: 1,
    borderColor: colors.forest[700],
  },
  pickNumber: {
    color: colors.gold[500],
    fontWeight: '900',
    width: 48,
    fontSize: 11,
  },
  pickAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  pickAvatarPlaceholder: {
    backgroundColor: colors.forest[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.forest[600],
  },
  pickInfo: { flex: 1, minWidth: 0 },
  pickPlayer: {
    color: colors.silver[50],
    fontWeight: '800',
  },
  pickMeta: {
    color: colors.silver[400],
    fontSize: 12,
    marginTop: 2,
  },
  captainPickChip: {
    borderWidth: 1.5,
    borderColor: colors.gold[500],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  captainPickChipDisabled: {
    opacity: 0.5,
  },
  captainPickText: {
    color: colors.gold[400],
    fontWeight: '800',
    fontSize: 11,
  },
  emptyText: {
    color: colors.silver[400],
    textAlign: 'center',
    paddingVertical: 16,
    lineHeight: 19,
  },
  linkText: {
    color: colors.lime[500],
    fontWeight: '800',
    fontSize: 13,
  },
});
