import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  TextInput as RNTextInput,
  Pressable,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { RouteProp, useRoute } from '@react-navigation/native';
import { GradientBackground } from '../../components/GradientBackground';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { PremiumButton } from '../../components/PremiumButton';
import { AppIcon } from '../../components/AppIcon';
import { PremiumSheet } from '../../components/PremiumSheet';
import { colors } from '../../constants/theme';
import { PLAYER_CATEGORIES, PLAYER_CATEGORY_LABELS, REGISTRATION_FEE, formatRegistrationFeeAmount } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import {
  assignPlayerAsFranchiseAdmin,
  findPlayerFranchiseAdmin,
  getFranchiseAdminOptions,
  getPlayerById,
  isPlayerFranchiseAdminOf,
  removePlayerFranchiseAdmin,
  setPlayerCategory,
  updatePlayerStatus,
  type FranchiseAdminOption,
} from '../../services/playerService';
import { Player, PlayerCategory, RegistrationStatus } from '../../types';
import { getCategoryLabel, getKitSizeLabel, formatDateTime } from '../../utils/validation';
import { usePremiumAlert } from '../../components/PremiumAlertProvider';
import { EnterView, PulseView } from '../../motion';

type DetailRoute = {
  AdminPlayerDetail: { playerId: string };
};

const STATUSES: RegistrationStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
];

type CategoryChoice = PlayerCategory | 'UNASSIGNED';

export function AdminPlayerDetailScreen() {
  const route = useRoute<RouteProp<DetailRoute, 'AdminPlayerDetail'>>();
  const { user, isSuperAdmin } = useAuth();
  const { alert } = usePremiumAlert();
  const [player, setPlayer] = useState<Player | null>(null);
  const [franchises, setFranchises] = useState<FranchiseAdminOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [franchiseSheetOpen, setFranchiseSheetOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] =
    useState<RegistrationStatus>('PENDING');
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryChoice>('UNASSIGNED');
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, franchiseList] = await Promise.all([
        getPlayerById(route.params.playerId),
        getFranchiseAdminOptions(),
      ]);
      setPlayer(p);
      setFranchises(franchiseList);
      if (p) {
        setSelectedStatus(p.status);
        setSelectedCategory(p.category ?? 'UNASSIGNED');
        const currentAdmin = findPlayerFranchiseAdmin(p, franchiseList);
        setSelectedFranchiseId(prev =>
          currentAdmin?.id ??
          (franchiseList.some(item => item.id === prev)
            ? prev
            : franchiseList[0]?.id ?? ''),
        );
      }
      setRejectReason(p?.rejectionReason ?? '');
    } finally {
      setLoading(false);
    }
  }, [route.params.playerId]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (status: RegistrationStatus) => {
    if (!user || !player) return;
    if (status === player.status) return;

    if (status === 'REJECTED' && !rejectReason.trim()) {
      alert('Required', 'Please enter a rejection reason first.');
      return;
    }

    setBusy(true);
    try {
      await updatePlayerStatus(
        player.id,
        status,
        user.uid,
        user.email ?? 'admin',
        status === 'REJECTED' ? rejectReason.trim() : undefined,
      );
      setSelectedStatus(status);
      alert('Updated', `Status changed to ${status}`);
      await load();
    } catch (e: unknown) {
      alert('Error', e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const changeCategory = async (category: CategoryChoice) => {
    if (!user || !player) return;
    const current = player.category ?? 'UNASSIGNED';
    if (category === current) return;

    setBusy(true);
    try {
      await setPlayerCategory(
        player.id,
        category === 'UNASSIGNED' ? null : category,
        user.uid,
        user.email ?? 'admin',
      );
      setSelectedCategory(category);
      alert(
        'Updated',
        `Category set to ${
          category === 'UNASSIGNED'
            ? 'Unassigned'
            : PLAYER_CATEGORY_LABELS[category]
        }`,
      );
      await load();
    } catch (e: unknown) {
      alert('Error', e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const applyFranchiseAdmin = async () => {
    if (!user || !player || !selectedFranchiseId) return;
    setBusy(true);
    try {
      await assignPlayerAsFranchiseAdmin(
        player,
        selectedFranchiseId,
        user.uid,
        user.email ?? 'admin',
      );
      const franchiseName =
        franchises.find(item => item.id === selectedFranchiseId)?.name ??
        'this franchise';
      alert('Updated', `${player.fullName} is now the franchise admin for ${franchiseName}.`);
      await load();
    } catch (e: unknown) {
      alert('Error', e instanceof Error ? e.message : 'Could not assign franchise admin');
    } finally {
      setBusy(false);
    }
  };

  const makeFranchiseAdmin = () => {
    if (!user || !player || !selectedFranchiseId) return;
    const selected = franchises.find(item => item.id === selectedFranchiseId);
    if (!selected) {
      alert('Required', 'Select a franchise first.');
      return;
    }
    if (isPlayerFranchiseAdminOf(player, selected)) {
      alert('Already assigned', `${player.fullName} is already the franchise admin for ${selected.name}.`);
      return;
    }

    const currentAdmin = findPlayerFranchiseAdmin(player, franchises);
    const replacingOtherAdmin =
      !isPlayerFranchiseAdminOf(player, selected) &&
      (!!selected.adminEmail || !!selected.adminUserId);

    if (replacingOtherAdmin) {
      alert(
        'Replace franchise admin?',
        `${selected.name} already has ${selected.adminEmail} as franchise admin. Each franchise can have only one. Continue to replace them with ${player.fullName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: () => void applyFranchiseAdmin() },
        ],
      );
      return;
    }

    if (currentAdmin && currentAdmin.id !== selected.id) {
      alert(
        'Move franchise admin?',
        `${player.fullName} is already the franchise admin for ${currentAdmin.name}. A player can admin only one franchise. Move them to ${selected.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Move', onPress: () => void applyFranchiseAdmin() },
        ],
      );
      return;
    }

    void applyFranchiseAdmin();
  };

  const removeFranchiseAdmin = () => {
    if (!user || !player) return;
    const currentAdmin = findPlayerFranchiseAdmin(player, franchises);
    if (!currentAdmin) return;
    alert(
      'Remove franchise admin?',
      `${player.fullName} will become a regular player and will no longer admin ${currentAdmin.name}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await removePlayerFranchiseAdmin(
                player,
                user.uid,
                user.email ?? 'admin',
              );
              alert('Updated', `${player.fullName} is now a player.`);
              await load();
            } catch (e: unknown) {
              alert(
                'Error',
                e instanceof Error ? e.message : 'Could not remove franchise admin',
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  if (loading || !player) {
    return <ScreenSkeleton variant="detail" />;
  }

  const currentCategory = player.category ?? 'UNASSIGNED';
  const categoryLabel =
    selectedCategory === 'UNASSIGNED'
      ? 'Unassigned'
      : PLAYER_CATEGORY_LABELS[selectedCategory];
  const currentFranchiseAdmin = findPlayerFranchiseAdmin(player, franchises);
  const selectedFranchise =
    franchises.find(item => item.id === selectedFranchiseId) ?? null;
  const alreadyAdminOfSelected =
    !!selectedFranchise && isPlayerFranchiseAdminOf(player, selectedFranchise);
  const selectedFranchiseLabel = selectedFranchise
    ? selectedFranchise.name
    : 'Select franchise';

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ─── Premium Hero Section ─── */}
        <EnterView fromY={16} fromScale={0.94} style={styles.hero}>
          <PulseView from={0.98} to={1.03} duration={2200}>
            <View style={styles.avatarGlow}>
            {player.profileImage ? (
              <Image source={{ uri: player.profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{player.fullName.charAt(0)}</Text>
              </View>
            )}
            </View>
          </PulseView>
          <Text style={styles.name}>{player.fullName}</Text>
          <Text style={styles.id}>{player.playerId}</Text>
          <StatusBadge status={player.status} />
          <View style={styles.categoryChip}>
            <AppIcon name="tag" size={12} color={colors.gold[400]} />
            <Text style={styles.categoryChipText}>
              {getCategoryLabel(player.category)}
            </Text>
          </View>
          {currentFranchiseAdmin ? (
            <View style={styles.adminChip}>
              <AppIcon name="shield-crown" size={14} color={colors.lime[500]} />
              <Text style={styles.adminChipText}>
                Franchise Admin · {currentFranchiseAdmin.name}
              </Text>
            </View>
          ) : null}
        </EnterView>

        {/* ─── Change Status ─── */}
        <EnterView delay={80} fromY={18} style={styles.card}>
          <View style={styles.cardAccent} />
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBadge}>
              <AppIcon name="swap-horizontal" size={16} color={colors.forest[950]} />
            </View>
            <View>
              <Text style={styles.section}>Change Status</Text>
              <Text style={styles.dropdownHint}>
                Select a new status, then tap Update Status.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setStatusSheetOpen(true)}
            disabled={busy}
            style={styles.dropdown}>
            <Text style={styles.dropdownValue}>{selectedStatus}</Text>
            <AppIcon name="chevron-down" size={22} color={colors.lime[500]} />
          </Pressable>

          <PremiumSheet
            visible={statusSheetOpen}
            onClose={() => setStatusSheetOpen(false)}
            title="Change Status"
            subtitle="Select the new registration status"
            icon="swap-horizontal">
            {STATUSES.map(status => {
              const selected = status === selectedStatus;
              return (
                <Pressable
                  key={status}
                  onPress={() => {
                    setSelectedStatus(status);
                    setStatusSheetOpen(false);
                  }}
                  style={[styles.sheetOption, selected && styles.sheetOptionActive]}>
                  <View style={[styles.sheetRadio, selected && styles.sheetRadioActive]}>
                    {selected ? <View style={styles.sheetRadioDot} /> : null}
                  </View>
                  <Text style={[styles.sheetOptionLabel, selected && styles.sheetOptionLabelActive]}>
                    {status}
                  </Text>
                  {selected ? <AppIcon name="check-circle" size={18} color={colors.lime[500]} /> : null}
                </Pressable>
              );
            })}
          </PremiumSheet>

          {(selectedStatus === 'REJECTED' || player.status === 'REJECTED') && (
            <>
              <Text style={styles.reasonLabel}>Rejection reason</Text>
              <RNTextInput
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Player information could not be verified."
                placeholderTextColor={colors.silver[400]}
                style={styles.reasonInput}
                multiline
              />
            </>
          )}

          <PremiumButton
            onPress={() => changeStatus(selectedStatus)}
            loading={busy}
            disabled={busy || selectedStatus === player.status}
            style={styles.updateBtn}>
            {selectedStatus === player.status
              ? 'Status Already Set'
              : `Update to ${selectedStatus}`}
          </PremiumButton>
        </EnterView>

        {/* ─── Assign Category ─── */}
        <EnterView delay={140} fromY={18} style={styles.card}>
          <View style={[styles.cardAccent, { backgroundColor: colors.gold[500] }]} />
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBadge, { backgroundColor: colors.gold[500] }]}>
              <AppIcon name="tag" size={16} color={colors.forest[950]} />
            </View>
            <View>
              <Text style={styles.section}>Assign Category</Text>
              <Text style={styles.dropdownHint}>
                Place this player in Junior, Senior, or Emerging.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setCategorySheetOpen(true)}
            disabled={busy}
            style={[styles.dropdown, styles.categoryDropdown]}>
            <Text style={styles.categoryDropdownValue}>{categoryLabel}</Text>
            <AppIcon name="chevron-down" size={22} color={colors.gold[500]} />
          </Pressable>

          <PremiumSheet
            visible={categorySheetOpen}
            onClose={() => setCategorySheetOpen(false)}
            title="Assign Category"
            subtitle="Choose a player category"
            icon="tag">
            {(['UNASSIGNED', ...PLAYER_CATEGORIES] as CategoryChoice[]).map(cat => {
              const selected = cat === selectedCategory;
              const catLabel = cat === 'UNASSIGNED' ? 'Unassigned' : PLAYER_CATEGORY_LABELS[cat as PlayerCategory];
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setCategorySheetOpen(false);
                  }}
                  style={[styles.sheetOption, selected && styles.sheetOptionActiveGold]}>
                  <View style={[styles.sheetRadio, selected && styles.sheetRadioActiveGold]}>
                    {selected ? <View style={styles.sheetRadioDotGold} /> : null}
                  </View>
                  <Text style={[styles.sheetOptionLabel, selected && styles.sheetOptionLabelActiveGold]}>
                    {catLabel}
                  </Text>
                  {selected ? <AppIcon name="check-circle" size={18} color={colors.gold[500]} /> : null}
                </Pressable>
              );
            })}
          </PremiumSheet>

          <PremiumButton
            variant="secondary"
            onPress={() => changeCategory(selectedCategory)}
            loading={busy}
            disabled={busy || selectedCategory === currentCategory}
            style={styles.updateBtn}>
            {selectedCategory === currentCategory
              ? 'Category Already Set'
              : `Set ${categoryLabel}`}
          </PremiumButton>
        </EnterView>

        {/* ─── Franchise Admin ─── */}
        {isSuperAdmin && (
          <EnterView delay={180} fromY={18} style={styles.card}>
            <View style={styles.cardAccent} />
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBadge}>
                <AppIcon name="shield-crown" size={16} color={colors.forest[950]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.section}>Franchise Admin</Text>
                <Text style={styles.dropdownHint}>
                  Make this player the franchise admin for one team.
                </Text>
              </View>
            </View>

            {franchises.length === 0 ? (
              <Text style={styles.noReceipt}>
                Set up franchises in Draft first, then assign an admin here.
              </Text>
            ) : (
              <>
                <Pressable
                  onPress={() => setFranchiseSheetOpen(true)}
                  disabled={busy}
                  style={styles.dropdown}>
                  <Text style={styles.dropdownValue}>
                    {selectedFranchiseLabel}
                  </Text>
                  <AppIcon name="chevron-down" size={22} color={colors.lime[500]} />
                </Pressable>

                <PremiumSheet
                  visible={franchiseSheetOpen}
                  onClose={() => setFranchiseSheetOpen(false)}
                  title="Select Franchise"
                  subtitle="Choose which franchise this player will admin"
                  icon="shield-crown">
                  <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                    {franchises.map(franchise => {
                      const isCurrent = isPlayerFranchiseAdminOf(player, franchise);
                      const occupied =
                        !isCurrent &&
                        (!!franchise.adminEmail || !!franchise.adminUserId);
                      const selected = franchise.id === selectedFranchiseId;
                      return (
                        <Pressable
                          key={franchise.id}
                          onPress={() => {
                            setSelectedFranchiseId(franchise.id);
                            setFranchiseSheetOpen(false);
                          }}
                          style={[styles.sheetOption, selected && styles.sheetOptionActive]}>
                          <View style={[styles.sheetRadio, selected && styles.sheetRadioActive]}>
                            {selected ? <View style={styles.sheetRadioDot} /> : null}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.sheetOptionLabel, selected && styles.sheetOptionLabelActive]}>
                              {franchise.name}
                            </Text>
                            {isCurrent ? (
                              <Text style={styles.sheetChipHint}>Current admin</Text>
                            ) : occupied ? (
                              <Text style={styles.sheetChipHintWarn}>Has another admin</Text>
                            ) : null}
                          </View>
                          {selected ? <AppIcon name="check-circle" size={18} color={colors.lime[500]} /> : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </PremiumSheet>

                {selectedFranchise &&
                !alreadyAdminOfSelected &&
                (selectedFranchise.adminEmail || selectedFranchise.adminUserId) ? (
                  <Text style={styles.replaceHint}>
                    {selectedFranchise.name} currently has{' '}
                    {selectedFranchise.adminEmail || 'another admin'}. Assigning
                    this player will replace that admin.
                  </Text>
                ) : null}

                <PremiumButton
                  onPress={makeFranchiseAdmin}
                  loading={busy}
                  disabled={
                    busy || !selectedFranchiseId || alreadyAdminOfSelected
                  }
                  style={styles.updateBtn}>
                  {alreadyAdminOfSelected
                    ? 'Already Franchise Admin'
                    : 'Make Franchise Admin'}
                </PremiumButton>

                {currentFranchiseAdmin ? (
                  <PremiumButton
                    variant="outline"
                    onPress={removeFranchiseAdmin}
                    loading={busy}
                    disabled={busy}
                    style={styles.updateBtn}>
                    Remove Franchise Admin
                  </PremiumButton>
                ) : null}
              </>
            )}
          </EnterView>
        )}

        {/* ─── Player Info ─── */}
        <EnterView delay={220} fromY={18} style={styles.card}>
          <View style={styles.cardAccent} />
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBadge}>
              <AppIcon name="account-details" size={16} color={colors.forest[950]} />
            </View>
            <Text style={styles.section}>Player Info</Text>
          </View>
          <Info label="Father" value={player.fatherName} />
          <Info label="Phone" value={player.phone} />
          <Info label="Email" value={player.email} />
          <Info label="CNIC" value={player.cnic} />
          <Info label="DOB" value={player.dateOfBirth} />
          <Info label="Age" value={String(player.age)} />
          <Info label="City" value={player.city} />
          <Info label="Address" value={player.address} />
          <Info label="Category" value={getCategoryLabel(player.category)} />
          <Info label="Role" value={player.role} />
          <Info label="Batting" value={player.battingStyle} />
          <Info label="Bowling" value={player.bowlingStyle} />
          <Info label="Experience" value={`${player.yearsOfExperience} yrs`} />
          <Info label="Club" value={player.currentClub} />
          <Info label="Shirt No." value={player.shirtNumber} />
          <Info
            label="Uniform Size"
            value={player.kitSize ? getKitSizeLabel(player.kitSize) : undefined}
          />
          {player.draftPickNumber ? (
            <Info label="Draft Pick" value={`#${player.draftPickNumber}`} />
          ) : null}
          {player.draftedFranchiseId ? (
            <Info label="Franchise" value={player.draftedFranchiseId.toUpperCase()} />
          ) : null}
          {currentFranchiseAdmin ? (
            <Info
              label="Franchise Admin"
              value={currentFranchiseAdmin.name}
            />
          ) : null}
        </EnterView>

        {/* ─── Registration Fee ─── */}
        <EnterView delay={260} fromY={18} style={styles.card}>
          <View style={[styles.cardAccent, { backgroundColor: colors.gold[500] }]} />
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBadge, { backgroundColor: colors.gold[500] }]}>
              <AppIcon name="cash" size={16} color={colors.forest[950]} />
            </View>
            <Text style={styles.section}>Registration Fee</Text>
          </View>
          <Info label="Registration Fee" value={formatRegistrationFeeAmount()} />
          <Info
            label="Easypaisa"
            value={`${REGISTRATION_FEE.easypaisaNumber} (${REGISTRATION_FEE.accountTitle})`}
          />
          <Info
            label="Receipt Status"
            value={player.feeReceiptUrl ? 'Receipt submitted' : 'Not submitted'}
          />
          {player.feeReceiptSubmittedAt ? (
            <Info
              label="Receipt Sent"
              value={formatDateTime(player.feeReceiptSubmittedAt)}
            />
          ) : null}
          {player.feeReceiptUrl ? (
            <Pressable
              onPress={() =>
                Linking.openURL(player.feeReceiptUrl!).catch(() =>
                  alert('Error', 'Could not open receipt image.'),
                )
              }>
              <Text style={styles.receiptLink}>View payment receipt</Text>
              <Image
                source={{ uri: player.feeReceiptUrl }}
                style={styles.receiptImage}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
            <Text style={styles.noReceipt}>No payment receipt uploaded yet.</Text>
          )}
        </EnterView>
      </ScrollView>
    </GradientBackground>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 48 },

  // Hero
  hero: {
    alignItems: 'center',
    backgroundColor: colors.forest[800],
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.forest[600],
    marginBottom: 14,
    overflow: 'hidden',
  },
  avatarGlow: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: colors.gold[500],
    backgroundColor: 'rgba(212,175,55,0.12)',
    shadowColor: colors.gold[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.forest[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.lime[500], fontSize: 34, fontWeight: '800' },
  name: { color: colors.silver[50], fontSize: 24, fontWeight: '800', letterSpacing: 0.3 },
  id: { color: colors.lime[500], fontWeight: '700', marginVertical: 6, fontSize: 13, letterSpacing: 0.5 },
  categoryChip: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gold[500],
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  categoryChipText: {
    color: colors.gold[400],
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  adminChip: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.lime[500],
    backgroundColor: 'rgba(163,207,45,0.12)',
  },
  adminChipText: {
    color: colors.lime[500],
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // Card
  card: {
    backgroundColor: colors.forest[800],
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.forest[600],
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: colors.lime[500],
    borderRadius: 1,
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  cardIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.lime[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    color: colors.silver[50],
    fontWeight: '800',
    fontSize: 16,
  },
  dropdownHint: {
    color: colors.silver[400],
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },

  // Dropdowns
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.forest[900],
    borderWidth: 1.5,
    borderColor: colors.lime[500],
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryDropdown: {
    borderColor: colors.gold[500],
  },
  dropdownValue: {
    color: colors.lime[500],
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  categoryDropdownValue: {
    color: colors.gold[400],
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },

  // Sheet options
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.forest[600],
    backgroundColor: colors.forest[900],
    marginBottom: 8,
  },
  sheetOptionActive: {
    borderColor: colors.lime[500],
    backgroundColor: 'rgba(163,207,45,0.12)',
  },
  sheetOptionActiveGold: {
    borderColor: colors.gold[500],
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  sheetRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.silver[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRadioActive: {
    borderColor: colors.lime[500],
  },
  sheetRadioActiveGold: {
    borderColor: colors.gold[500],
  },
  sheetRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.lime[500],
  },
  sheetRadioDotGold: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.gold[500],
  },
  sheetOptionLabel: {
    flex: 1,
    color: colors.silver[200],
    fontSize: 15,
    fontWeight: '600',
  },
  sheetOptionLabelActive: {
    color: colors.lime[500],
    fontWeight: '800',
  },
  sheetOptionLabelActiveGold: {
    color: colors.gold[400],
    fontWeight: '800',
  },
  sheetChipHint: {
    color: colors.lime[500],
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  sheetChipHintWarn: {
    color: colors.gold[400],
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  // Misc
  updateBtn: {
    marginTop: 14,
  },
  replaceHint: {
    color: colors.gold[400],
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  reasonLabel: {
    color: colors.silver[400],
    fontSize: 12,
    marginTop: 14,
    marginBottom: 6,
  },
  reasonInput: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: colors.forest[600],
    borderRadius: 12,
    padding: 12,
    color: colors.silver[50],
    textAlignVertical: 'top',
    backgroundColor: colors.forest[900],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.forest[700],
    gap: 12,
  },
  infoLabel: { color: colors.silver[400], fontSize: 13 },
  infoValue: {
    color: colors.silver[100],
    fontWeight: '600',
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  receiptLink: {
    color: colors.lime[500],
    fontWeight: '700',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 8,
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.forest[600],
    backgroundColor: colors.forest[900],
  },
  noReceipt: {
    color: colors.silver[400],
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
