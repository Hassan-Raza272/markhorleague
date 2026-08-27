import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput as RNTextInput,
  Image,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../constants/theme';
import { DRAFT } from '../../constants';
import type { Franchise, Player } from '../../types';
import { getCategoryLabel } from '../../utils/validation';
import {
  extraLockedPlayerIds,
  getFranchiseOwnerPlayer,
  isFranchiseOwnerPlayer,
} from '../../services/draftService';
import { EnterView } from '../../motion';

type Props = {
  mode: 'owner' | 'admin';
  franchiseId?: string | null;
  franchises: Franchise[];
  players: Player[];
  busy: string | null;
  onLock: (player: Player, franchiseId: string) => void;
  onUnlock: (player: Player, franchiseId: string) => void;
  onSetCaptain: (player: Player, franchiseId: string) => void;
};

export function FranchiseLockSection({
  mode,
  franchiseId,
  franchises,
  players,
  busy,
  onLock,
  onUnlock,
  onSetCaptain,
}: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const [search, setSearch] = useState('');
  const [selectedFranchiseId, setSelectedFranchiseId] = useState(
    franchises[0]?.id ?? '',
  );

  const activeFranchiseId =
    mode === 'admin' ? selectedFranchiseId || franchises[0]?.id : franchiseId;
  const activeFranchise =
    franchises.find(franchise => franchise.id === activeFranchiseId) ?? null;

  const ownerPlayer = useMemo(
    () =>
      activeFranchise
        ? getFranchiseOwnerPlayer(players, activeFranchise)
        : undefined,
    [activeFranchise, players],
  );

  const extraLocks = useMemo(() => {
    if (!activeFranchise) return [];
    return players.filter(
      player =>
        player.lockedFranchiseId === activeFranchise.id &&
        !isFranchiseOwnerPlayer(player, activeFranchise),
    );
  }, [activeFranchise, players]);

  const approvedPlayers = useMemo(() => {
    if (mode !== 'admin' || !activeFranchise) return [];
    const q = search.trim().toLowerCase();
    return players
      .filter(player => player.status === 'APPROVED')
      .filter(
        player =>
          !franchises.some(franchise =>
            isFranchiseOwnerPlayer(player, franchise),
          ),
      )
      .filter(player => player.lockedFranchiseId !== activeFranchise.id)
      .filter(player => {
        if (!q) return true;
        return (
          player.fullName.toLowerCase().includes(q) ||
          player.playerId.toLowerCase().includes(q) ||
          player.city.toLowerCase().includes(q) ||
          player.role.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [activeFranchise, franchises, mode, players, search]);

  const remaining = DRAFT.LOCKS_PER_FRANCHISE - extraLocks.length;
  const extraCount = activeFranchise
    ? extraLockedPlayerIds(activeFranchise, ownerPlayer?.id).length
    : extraLocks.length;
  const locksFull = extraCount >= DRAFT.LOCKS_PER_FRANCHISE;
  const captainId = activeFranchise?.captainPlayerId;

  if (mode === 'owner') {
    return (
      <EnterView fromY={16} style={styles.section}>
        <SectionIntro
          icon="lock"
          title="Locked Squad"
          hint={`Super admin assigns ${DRAFT.LOCKS_PER_FRANCHISE} locked players to your franchise. You are auto-locked as team owner. After locks are assigned, you can make yourself or any locked player captain.`}
        />

        {ownerPlayer ? (
          <PlayerLockRow
            player={ownerPlayer}
            lockedBy="Team owner · Auto locked"
            badge="OWNER"
            isCaptain={captainId === ownerPlayer.id}
            captainActionLabel={
              captainId === ownerPlayer.id ? undefined : 'Make Captain'
            }
            captainDisabled={!!busy}
            captainLoading={busy === `captain-${ownerPlayer.id}`}
            onCaptainPress={
              captainId === ownerPlayer.id || !activeFranchise
                ? undefined
                : () => onSetCaptain(ownerPlayer, activeFranchise.id)
            }
          />
        ) : (
          <Text style={styles.emptyText}>
            Complete and get your player registration approved to auto-lock as
            owner.
          </Text>
        )}

        {extraLocks.length === 0 ? (
          <Text style={styles.emptyText}>
            Super admin has not assigned locked players yet.
          </Text>
        ) : (
          extraLocks.map(player => (
            <PlayerLockRow
              key={player.id}
              player={player}
              lockedBy="Assigned by super admin"
              badge="LOCK"
              isCaptain={captainId === player.id}
              captainActionLabel={
                captainId === player.id ? undefined : 'Make Captain'
              }
              captainDisabled={!!busy}
              captainLoading={busy === `captain-${player.id}`}
              onCaptainPress={
                captainId === player.id || !activeFranchise
                  ? undefined
                  : () => onSetCaptain(player, activeFranchise.id)
              }
            />
          ))
        )}
      </EnterView>
    );
  }

  return (
    <EnterView fromY={16} style={styles.section}>
      <SectionIntro
        icon="lock-plus"
        title="Assign Locked Players"
        hint={`Only super admin can assign ${DRAFT.LOCKS_PER_FRANCHISE} extra locked players to each franchise. The owner is auto-locked. After locking, set a captain (owner or any locked player). Franchise admins can also set captain on their squad.`}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.franchiseChips}>
        {franchises.map(franchise => {
          const selected = franchise.id === activeFranchise?.id;
          const owner = getFranchiseOwnerPlayer(players, franchise);
          const count = extraLockedPlayerIds(franchise, owner?.id).length;
          const full = count >= DRAFT.LOCKS_PER_FRANCHISE;
          return (
            <Pressable
              key={franchise.id}
              onPress={() => setSelectedFranchiseId(franchise.id)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.pressed,
              ]}>
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
                numberOfLines={1}>
                {franchise.name}
              </Text>
              <View
                style={[
                  styles.chipCountPill,
                  selected && styles.chipCountPillSelected,
                  full && !selected && styles.chipCountPillFull,
                ]}>
                <Text
                  style={[
                    styles.chipCount,
                    selected && styles.chipTextSelected,
                  ]}>
                  {count}/{DRAFT.LOCKS_PER_FRANCHISE}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {activeFranchise && (
        <>
          <View style={styles.statusBanner}>
            <View style={styles.statusDot} />
            <Text style={styles.adminFranchise} numberOfLines={compact ? 2 : 1}>
              {activeFranchise.name} · Owner auto-locked · {extraCount}/
              {DRAFT.LOCKS_PER_FRANCHISE} extra
              {captainId ? ' · Captain set' : ''}
            </Text>
          </View>

          {ownerPlayer ? (
            <PlayerLockRow
              player={ownerPlayer}
              lockedBy="Team owner · Auto locked"
              badge="OWNER"
              isCaptain={captainId === ownerPlayer.id}
              captainActionLabel={
                captainId === ownerPlayer.id ? undefined : 'Make Captain'
              }
              captainDisabled={!!busy}
              captainLoading={busy === `captain-${ownerPlayer.id}`}
              onCaptainPress={
                captainId === ownerPlayer.id
                  ? undefined
                  : () => onSetCaptain(ownerPlayer, activeFranchise.id)
              }
            />
          ) : (
            <Text style={styles.emptyText}>
              Team owner has not completed approved registration yet.
            </Text>
          )}

          {extraLocks.map(player => (
            <PlayerLockRow
              key={player.id}
              player={player}
              lockedBy={activeFranchise.name}
              badge="LOCK"
              isCaptain={captainId === player.id}
              actionLabel="Unlock"
              disabled={!!busy}
              loading={busy === `unlock-${player.id}`}
              onPress={() => onUnlock(player, activeFranchise.id)}
              captainActionLabel={
                captainId === player.id ? undefined : 'Make Captain'
              }
              captainDisabled={!!busy}
              captainLoading={busy === `captain-${player.id}`}
              onCaptainPress={
                captainId === player.id
                  ? undefined
                  : () => onSetCaptain(player, activeFranchise.id)
              }
            />
          ))}

          {extraLocks.length === 0 && (
            <Text style={styles.emptyText}>No extra players locked yet.</Text>
          )}

          <View style={styles.searchBox}>
            <AppIcon name="magnify" size={20} color={colors.silver[400]} />
            <RNTextInput
              value={search}
              onChangeText={setSearch}
              placeholder={`Search players to lock for ${activeFranchise.name}…`}
              placeholderTextColor={colors.silver[400]}
              style={styles.searchInput}
            />
          </View>

          {locksFull ? (
            <View style={styles.fullBanner}>
              <AppIcon name="check-circle" size={16} color={colors.lime[500]} />
              <Text style={styles.fullBannerText}>
                {activeFranchise.name} has all {DRAFT.LOCKS_PER_FRANCHISE} extra
                locks assigned.
              </Text>
            </View>
          ) : null}

          {approvedPlayers.map(player => {
            const lockedByOther =
              !!player.lockedFranchiseId &&
              player.lockedFranchiseId !== activeFranchise.id;
            const otherName = franchises.find(
              franchise => franchise.id === player.lockedFranchiseId,
            )?.name;
            const canLock = !player.lockedFranchiseId && remaining > 0 && !busy;
            return (
              <PlayerLockRow
                key={player.id}
                player={player}
                lockedBy={
                  lockedByOther ? otherName ?? 'Another franchise' : undefined
                }
                actionLabel={lockedByOther ? undefined : 'Lock'}
                disabled={!canLock}
                loading={busy === `lock-${player.id}`}
                onPress={
                  canLock
                    ? () => onLock(player, activeFranchise.id)
                    : undefined
                }
              />
            );
          })}
          {approvedPlayers.length === 0 && (
            <Text style={styles.emptyText}>No approved players to lock.</Text>
          )}
        </>
      )}
    </EnterView>
  );
}

function SectionIntro({
  icon,
  title,
  hint,
}: {
  icon: string;
  title: string;
  hint: string;
}) {
  return (
    <>
      <View style={styles.introRow}>
        <View style={styles.introIcon}>
          <AppIcon name={icon} size={20} color={colors.lime[500]} />
        </View>
        <View style={styles.introText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionHint}>{hint}</Text>
        </View>
      </View>
      <View style={styles.accentBar} />
    </>
  );
}

function PlayerLockRow({
  player,
  lockedBy,
  badge,
  actionLabel,
  disabled,
  loading,
  onPress,
  isCaptain,
  captainActionLabel,
  captainDisabled,
  captainLoading,
  onCaptainPress,
}: {
  player: Player;
  lockedBy?: string;
  badge?: string;
  actionLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  isCaptain?: boolean;
  captainActionLabel?: string;
  captainDisabled?: boolean;
  captainLoading?: boolean;
  onCaptainPress?: () => void;
}) {
  const unlock = actionLabel === 'Unlock';
  return (
    <EnterView
      fromY={10}
      fromX={8}
      style={[styles.playerRow, disabled && !onPress && !onCaptainPress && styles.playerRowDim]}>
      {player.profileImage ? (
        <Image source={{ uri: player.profileImage }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <AppIcon name="account" size={22} color={colors.silver[400]} />
        </View>
      )}
      <View style={styles.playerInfo}>
        <View style={styles.playerNameRow}>
          <Text style={styles.playerName} numberOfLines={1}>
            {player.fullName}
          </Text>
          {badge ? (
            <View style={[styles.badge, badge === 'LOCK' && styles.badgeLock]}>
              <Text
                style={[
                  styles.badgeText,
                  badge === 'LOCK' && styles.badgeTextLock,
                ]}>
                {badge}
              </Text>
            </View>
          ) : null}
          {isCaptain ? (
            <View style={styles.badgeCaptain}>
              <Text style={styles.badgeTextCaptain}>CAPTAIN</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.playerMeta} numberOfLines={2}>
          {player.playerId} · {player.role} · {getCategoryLabel(player.category)}
          {lockedBy ? ` · ${lockedBy}` : ''}
        </Text>
      </View>
      <View style={styles.actionCol}>
        {captainActionLabel && onCaptainPress ? (
          <Pressable
            onPress={onCaptainPress}
            disabled={captainDisabled || captainLoading}
            style={({ pressed }) => [
              styles.captainChip,
              (captainDisabled || captainLoading) && styles.actionChipDisabled,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.captainText} numberOfLines={1}>
              {captainLoading ? '…' : captainActionLabel}
            </Text>
          </Pressable>
        ) : null}
        {actionLabel && onPress ? (
          <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            style={({ pressed }) => [
              styles.actionChip,
              unlock && styles.unlockChip,
              (disabled || loading) && styles.actionChipDisabled,
              pressed && styles.pressed,
            ]}>
            <Text
              style={[styles.actionText, unlock && styles.unlockText]}
              numberOfLines={1}>
              {loading ? '…' : actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </EnterView>
  );
}

const styles = StyleSheet.create({
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
  introRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  introIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(163,207,45,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(163,207,45,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: { flex: 1, minWidth: 0 },
  sectionTitle: {
    color: colors.silver[50],
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  sectionHint: {
    color: colors.silver[400],
    fontSize: 13,
    lineHeight: 19,
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
  franchiseChips: {
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    backgroundColor: colors.forest[900],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.forest[600],
    minHeight: 52,
    justifyContent: 'center',
    maxWidth: 220,
  },
  chipSelected: {
    backgroundColor: colors.lime[500],
    borderColor: colors.lime[500],
    shadowColor: colors.lime[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  chipText: {
    color: colors.silver[50],
    fontWeight: '800',
    fontSize: 13,
  },
  chipTextSelected: {
    color: colors.forest[950],
  },
  chipCountPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: 'rgba(163,207,45,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipCountPillSelected: {
    backgroundColor: 'rgba(3,10,5,0.16)',
  },
  chipCountPillFull: {
    backgroundColor: 'rgba(163,207,45,0.22)',
  },
  chipCount: {
    color: colors.lime[400],
    fontSize: 11,
    fontWeight: '800',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(163,207,45,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(163,207,45,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lime[500],
  },
  adminFranchise: {
    flex: 1,
    color: colors.lime[400],
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 18,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.forest[900],
    borderRadius: 14,
    paddingHorizontal: 12,
    marginTop: 12,
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
  fullBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(163,207,45,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(163,207,45,0.22)',
  },
  fullBannerText: {
    flex: 1,
    color: colors.silver[300],
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
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
  playerRowDim: {
    opacity: 0.55,
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
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    flexShrink: 1,
    color: colors.silver[50],
    fontWeight: '800',
    fontSize: 14,
  },
  badge: {
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeLock: {
    backgroundColor: 'rgba(163,207,45,0.16)',
  },
  badgeCaptain: {
    backgroundColor: 'rgba(212,175,55,0.28)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.55)',
  },
  badgeText: {
    color: colors.gold[400],
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  badgeTextLock: {
    color: colors.lime[400],
  },
  badgeTextCaptain: {
    color: colors.gold[300],
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  playerMeta: {
    color: colors.silver[400],
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  actionCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  actionChip: {
    backgroundColor: colors.lime[500],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 64,
    alignItems: 'center',
  },
  captainChip: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 96,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold[500],
  },
  unlockChip: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.status.rejected,
  },
  actionChipDisabled: {
    opacity: 0.5,
  },
  actionText: {
    color: colors.forest[950],
    fontWeight: '800',
    fontSize: 12,
  },
  captainText: {
    color: colors.gold[400],
    fontWeight: '800',
    fontSize: 11,
  },
  unlockText: {
    color: colors.status.rejected,
  },
  emptyText: {
    color: colors.silver[400],
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.85,
  },
});
