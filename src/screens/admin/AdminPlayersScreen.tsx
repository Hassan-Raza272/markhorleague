import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  TextInput as RNTextInput,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { GradientBackground } from '../../components/GradientBackground';
import { StatusBadge } from '../../components/StatusBadge';
import { AppIcon } from '../../components/AppIcon';
import { PremiumStatCard } from '../../components/PremiumStatCard';
import { colors } from '../../constants/theme';
import { getAllPlayers } from '../../services/playerService';
import { getPlayerExportStats } from '../../utils/exportPlayersPdf';
import { Player, RegistrationStatus } from '../../types';
import { getCategoryLabel } from '../../utils/validation';
import { usePremiumAlert } from '../../components/PremiumAlertProvider';
import { PressableScale, motion } from '../../motion';
import { EaseView } from 'react-native-ease';

const STATUS_FILTERS: Array<RegistrationStatus | 'ALL'> = [
  'ALL',
  'PENDING',
  'APPROVED',
  'REJECTED',
];

export function AdminPlayersScreen() {
  const navigation = useNavigation<any>();
  const { alert } = usePremiumAlert();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | 'ALL'>(
    'ALL',
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllPlayers();
      setPlayers(data);
    } catch (e: unknown) {
      alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to load players',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => getPlayerExportStats(players), [players]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter(p => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.playerId.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.cnic.includes(q)
      );
    });
  }, [players, search, statusFilter]);

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View>
          <Text style={styles.heading}>Registered Players</Text>
          <Text style={styles.subheading}>
            {filtered.length} of {players.length} players
          </Text>
        </View>

        <View style={styles.statsRow}>
          <PremiumStatCard
            label="Pending"
            value={stats.pending}
            icon="clock-outline"
            accent={colors.status.pending}
            selected={statusFilter === 'PENDING'}
            onPress={() =>
              setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')
            }
          />
          <PremiumStatCard
            label="Approved"
            value={stats.approved}
            icon="check-circle"
            accent={colors.status.approved}
            selected={statusFilter === 'APPROVED'}
            onPress={() =>
              setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')
            }
          />
          <PremiumStatCard
            label="Rejected"
            value={stats.rejected}
            icon="close-circle"
            accent={colors.status.rejected}
            selected={statusFilter === 'REJECTED'}
            onPress={() =>
              setStatusFilter(statusFilter === 'REJECTED' ? 'ALL' : 'REJECTED')
            }
          />
          <PremiumStatCard
            label="Total"
            value={stats.total}
            icon="account-group"
            accent={colors.lime[500]}
            selected={statusFilter === 'ALL'}
            onPress={() => setStatusFilter('ALL')}
          />
        </View>

        <View style={styles.searchBox}>
          <AppIcon name="magnify" size={20} color={colors.silver[400]} />
          <RNTextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, ID, phone, city..."
            placeholderTextColor={colors.silver[400]}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.statusTabs}>
          {STATUS_FILTERS.map(s => {
            const active = statusFilter === s;
            const label =
              s === 'ALL'
                ? 'All'
                : s === 'PENDING'
                  ? 'Pending'
                  : s === 'APPROVED'
                    ? 'Approved'
                    : 'Rejected';
            return (
              <Pressable
                key={s}
                onPress={() => setStatusFilter(s)}
                style={styles.statusTabPress}>
                <EaseView
                  style={styles.statusTab}
                  animate={{
                    scale: active ? 1 : 0.98,
                    backgroundColor: active
                      ? 'rgba(163,207,45,0.15)'
                      : colors.forest[800],
                    borderColor: active ? colors.lime[500] : colors.forest[600],
                  }}
                  transition={motion.snappy}>
                  <Text
                    style={[
                      styles.statusTabText,
                      active && styles.statusTabTextActive,
                    ]}
                    numberOfLines={1}>
                    {label}
                  </Text>
                </EaseView>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              tintColor={colors.lime[500]}
              colors={[colors.lime[500]]}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.empty}>No players found</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <PressableScale
              onPress={() =>
                navigation.navigate('AdminPlayerDetail', { playerId: item.id })
              }
              contentStyle={styles.card}
              pressedScale={0.985}>
              {item.profileImage ? (
                <Image source={{ uri: item.profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>
                    {item.fullName.charAt(0)}
                  </Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.name}>{item.fullName}</Text>
                <Text style={styles.meta}>
                  {item.playerId} · {getCategoryLabel(item.category)} ·{' '}
                  {item.role} · {item.city}
                </Text>
                <StatusBadge status={item.status} size="small" align="start" />
              </View>
              <AppIcon name="chevron-right" size={22} color={colors.silver[400]} />
            </PressableScale>
          )}
        />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: {
    color: colors.silver[50],
    fontSize: 24,
    fontWeight: '800',
  },
  subheading: {
    color: colors.silver[400],
    marginBottom: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.forest[800],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.forest[600],
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.silver[50],
    paddingVertical: 12,
    fontSize: 15,
  },
  statusTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  statusTabPress: {
    flex: 1,
    minWidth: 0,
  },
  statusTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusTabText: {
    color: colors.silver[400],
    fontSize: 12,
    fontWeight: '700',
  },
  statusTabTextActive: {
    color: colors.lime[500],
  },
  list: { paddingBottom: 48 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.forest[800],
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.forest[600],
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.gold[500],
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.forest[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.lime[500],
  },
  avatarText: {
    color: colors.lime[500],
    fontWeight: '800',
    fontSize: 18,
  },
  cardBody: { flex: 1, gap: 4 },
  name: {
    color: colors.silver[50],
    fontWeight: '700',
    fontSize: 15,
  },
  meta: {
    color: colors.silver[400],
    fontSize: 12,
  },
  empty: {
    textAlign: 'center',
    color: colors.silver[400],
    marginTop: 40,
  },
});
