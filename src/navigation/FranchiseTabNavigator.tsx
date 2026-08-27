import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AdminDraftScreen } from '../screens/admin/AdminDraftScreen';
import { PremiumButton } from '../components/PremiumButton';
import { AppIcon } from '../components/AppIcon';
import { GradientBackground } from '../components/GradientBackground';
import { LeagueHeader } from '../components/LeagueHeader';
import { useAuth } from '../hooks/useAuth';
import { useSignOut } from '../hooks/useSignOut';
import { colors } from '../constants/theme';
import { PremiumTabBar } from '../components/PremiumTabBar';
import { premiumHeaderOptions } from '../components/PremiumHeader';
import { FranchiseTabParamList } from './types';

const Tab = createBottomTabNavigator<FranchiseTabParamList>();

function FranchiseAccountScreen() {
  const { user, franchiseName } = useAuth();
  const { confirmSignOut } = useSignOut();

  return (
    <GradientBackground>
      <ScrollView style={styles.account} contentContainerStyle={styles.accountContent}>
        <LeagueHeader compact subtitle="Franchise Admin" />

        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBadge}>
              <AppIcon name="shield-crown" size={18} color={colors.forest[950]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Franchise Admin</Text>
              <Text style={styles.cardSubtitle}>Draft access granted</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <AppIcon name="email-outline" size={16} color={colors.lime[500]} />
            <View>
              <Text style={styles.label}>Signed in as</Text>
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>

          {franchiseName ? (
            <View style={styles.franchiseRow}>
              <AppIcon name="shield-star" size={16} color={colors.gold[500]} />
              <View>
                <Text style={styles.label}>Your franchise</Text>
                <Text style={styles.franchise}>{franchiseName}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.permissionsWrap}>
            <View style={styles.permChip}>
              <AppIcon name="trophy" size={14} color={colors.lime[500]} />
              <Text style={styles.permChipText}>Live Draft</Text>
            </View>
            <View style={styles.permChip}>
              <AppIcon name="account-check" size={14} color={colors.lime[500]} />
              <Text style={styles.permChipText}>Pick Players</Text>
            </View>
          </View>

          <Text style={styles.hint}>
            You can pick players only when your franchise is on the clock during
            the live draft.
          </Text>

          <PremiumButton
            variant="outline"
            onPress={confirmSignOut}
            icon={() => (
              <AppIcon name="logout" size={18} color={colors.lime[500]} />
            )}>
            Sign Out
          </PremiumButton>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

export function FranchiseTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <PremiumTabBar {...props} mode="simple" />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: 0,
        },
      }}>
      <Tab.Screen
        name="FranchiseDraft"
        component={AdminDraftScreen}
        options={{
          title: 'Draft',
          headerShown: true,
          ...premiumHeaderOptions,
          headerTitle: 'MCL Draft',
          tabBarIcon: ({ color, size, focused }) => (
            <AppIcon
              name={focused ? 'trophy' : 'trophy-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="FranchiseAccount"
        component={FranchiseAccountScreen}
        options={{
          title: 'Account',
          headerShown: true,
          ...premiumHeaderOptions,
          headerTitle: 'Franchise Account',
          tabBarIcon: ({ color, size, focused }) => (
            <AppIcon
              name={focused ? 'shield-account' : 'shield-account-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  account: { flex: 1 },
  accountContent: { padding: 20, paddingBottom: 48 },
  card: {
    backgroundColor: colors.forest[800],
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.forest[600],
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 2,
    backgroundColor: colors.gold[500],
    borderRadius: 1,
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  cardIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.gold[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  cardTitle: {
    color: colors.silver[50],
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    color: colors.silver[400],
    fontSize: 12,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.forest[900],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.forest[600],
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  franchiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.forest[900],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gold[500],
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  label: { color: colors.silver[400], fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  email: {
    color: colors.silver[50],
    fontWeight: '800',
    fontSize: 15,
    marginTop: 2,
  },
  franchise: {
    color: colors.gold[500],
    fontWeight: '900',
    fontSize: 17,
    marginTop: 2,
  },
  permissionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  permChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.forest[600],
    backgroundColor: colors.forest[900],
  },
  permChipText: {
    color: colors.silver[300],
    fontSize: 12,
    fontWeight: '700',
  },
  hint: {
    color: colors.silver[400],
    lineHeight: 20,
    marginBottom: 16,
    fontSize: 13,
  },
});
