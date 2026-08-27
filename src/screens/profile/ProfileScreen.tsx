import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBackground } from '../../components/GradientBackground';
import { StatusBadge } from '../../components/StatusBadge';
import { PremiumButton } from '../../components/PremiumButton';
import { AppIcon } from '../../components/AppIcon';
import { useAuth } from '../../hooks/useAuth';
import { useSignOut } from '../../hooks/useSignOut';
import { colors } from '../../constants/theme';
import { formatDate, getKitSizeLabel } from '../../utils/validation';
import { MainStackParamList } from '../../navigation/types';
import { EnterView, PulseView } from '../../motion';

function ProfileField({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon?: string;
}) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <View style={styles.fieldLeft}>
        {icon ? (
          <AppIcon name={icon} size={16} color={colors.lime[500]} />
        ) : null}
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const { player, user, refreshPlayer } = useAuth();
  const { confirmSignOut } = useSignOut();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshPlayer();
    } finally {
      setRefreshing(false);
    }
  }, [refreshPlayer]);

  if (!player) return null;

  const displayStatus =
    (player.status as string) === 'SUSPENDED' ? 'REJECTED' : player.status;

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.lime[500]}
            colors={[colors.lime[500]]}
          />
        }>
        <EnterView delay={40} fromY={18} fromScale={0.96} style={styles.heroCard}>
          <PulseView from={0.98} to={1.035} duration={2400}>
            {player.profileImage ? (
              <Image source={{ uri: player.profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {player.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </PulseView>

          <Text style={styles.name}>{player.fullName}</Text>
          <Text style={styles.fatherName}>s/o {player.fatherName}</Text>

          <View style={styles.idBadge}>
            <Text style={styles.idLabel}>MCL Player ID</Text>
            <Text style={styles.idValue}>{player.playerId}</Text>
          </View>

          <View style={styles.badgeCenter}>
            <StatusBadge status={displayStatus} />
          </View>

          <PremiumButton
            variant="outline"
            onPress={() => navigation.navigate('EditProfile')}
            icon={() => (
              <AppIcon name="pencil" size={18} color={colors.lime[500]} />
            )}
            style={styles.editBtn}>
            Edit Profile
          </PremiumButton>
        </EnterView>

        <EnterView delay={100} fromY={18} style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <AppIcon name="trophy-outline" size={20} color={colors.lime[500]} />
            <Text style={styles.sectionTitle}>Cricket Profile</Text>
          </View>
          <Divider style={styles.divider} />

          <ProfileField label="Role" value={player.role} icon="account-star" />
          <ProfileField label="Batting" value={player.battingStyle} icon="baseball" />
          <ProfileField label="Bowling" value={player.bowlingStyle} icon="circle-outline" />
          <ProfileField
            label="Experience"
            value={`${player.yearsOfExperience} Years`}
            icon="clock-outline"
          />
          <ProfileField label="Current Club" value={player.currentClub} icon="shield" />
          <ProfileField label="Shirt Number" value={player.shirtNumber} icon="numeric" />
          <ProfileField
            label="Uniform Size"
            value={player.kitSize ? getKitSizeLabel(player.kitSize) : undefined}
            icon="tshirt-crew-outline"
          />
          <ProfileField label="City" value={player.city} icon="map-marker" />
          <ProfileField label="Address" value={player.address} icon="home-outline" />
        </EnterView>

        <EnterView delay={160} fromY={18} style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <AppIcon name="card-account-details-outline" size={20} color={colors.lime[500]} />
            <Text style={styles.sectionTitle}>Personal Info</Text>
          </View>
          <Divider style={styles.divider} />

          <ProfileField label="Phone" value={player.phone} icon="phone" />
          <ProfileField
            label="Email"
            value={player.email || user?.email || undefined}
            icon="email-outline"
          />
          <ProfileField label="CNIC" value={player.cnic} icon="card-account-details" />
          <ProfileField label="Date of Birth" value={player.dateOfBirth} icon="calendar" />
          <ProfileField label="Age" value={String(player.age)} icon="cake-variant" />
          <ProfileField
            label="Registered"
            value={formatDate(player.createdAt)}
            icon="calendar-check"
          />
        </EnterView>

        {player.status === 'REJECTED' && player.rejectionReason && (
          <EnterView delay={200} fromY={16} style={styles.rejectCard}>
            <Text style={styles.rejectTitle}>Rejection Reason</Text>
            <Text style={styles.rejectReason}>{player.rejectionReason}</Text>
          </EnterView>
        )}

        <EnterView delay={220} fromY={18} style={styles.accountCard}>
          <View style={styles.sectionHeader}>
            <AppIcon name="cog-outline" size={20} color={colors.lime[500]} />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <Text style={styles.accountHint}>
            Signed in as {user?.email ?? player.email}
          </Text>
          <PremiumButton
            variant="outline"
            onPress={confirmSignOut}
            icon={() => (
              <AppIcon name="logout" size={18} color={colors.lime[500]} />
            )}
            style={styles.signOutBtn}>
            Sign Out
          </PremiumButton>
        </EnterView>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  heroCard: {
    backgroundColor: colors.forest[800],
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.forest[600],
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: colors.gold[500],
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.forest[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.lime[500],
  },
  avatarText: {
    color: colors.lime[500],
    fontSize: 40,
    fontWeight: '700',
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.silver[50],
  },
  fatherName: {
    color: colors.silver[400],
    marginTop: 4,
    marginBottom: 14,
  },
  idBadge: {
    backgroundColor: colors.forest[900],
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gold[500],
  },
  idLabel: {
    color: colors.silver[400],
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  idValue: {
    color: colors.lime[500],
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  badgeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    marginTop: 4,
  },
  editBtn: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
  infoCard: {
    backgroundColor: colors.forest[800],
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.forest[600],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.silver[50],
  },
  divider: {
    marginBottom: 8,
    backgroundColor: colors.forest[600],
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.forest[700],
    gap: 12,
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  fieldLabel: {
    color: colors.silver[400],
    fontSize: 14,
  },
  fieldValue: {
    color: colors.silver[100],
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  rejectCard: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginBottom: 16,
  },
  rejectTitle: {
    color: '#FCA5A5',
    fontWeight: '700',
    marginBottom: 8,
  },
  rejectReason: {
    color: '#FECACA',
    lineHeight: 22,
  },
  accountCard: {
    backgroundColor: colors.forest[800],
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.forest[600],
  },
  accountHint: {
    color: colors.silver[400],
    fontSize: 13,
    marginBottom: 14,
    marginTop: 4,
  },
  signOutBtn: {
    marginTop: 4,
  },
});
