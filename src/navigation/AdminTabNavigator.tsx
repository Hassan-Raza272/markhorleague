import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminPlayersScreen } from '../screens/admin/AdminPlayersScreen';
import { AdminPlayerDetailScreen } from '../screens/admin/AdminPlayerDetailScreen';
import { AdminExportScreen } from '../screens/admin/AdminExportScreen';
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
import { AdminTabParamList } from './types';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const PlayersStack = createNativeStackNavigator();

function PlayersStackNavigator() {
  return (
    <PlayersStack.Navigator
      screenOptions={{
        ...premiumHeaderOptions,
      }}>
      <PlayersStack.Screen
        name="AdminPlayersList"
        component={AdminPlayersScreen}
        options={{ title: 'All Registrations' }}
      />
      <PlayersStack.Screen
        name="AdminPlayerDetail"
        component={AdminPlayerDetailScreen}
        options={{ title: 'Player Details' }}
      />
    </PlayersStack.Navigator>
  );
}

function AdminAccountScreen() {
  const { user } = useAuth();
  const { confirmSignOut } = useSignOut();

  return (
    <GradientBackground>
      <View style={styles.account}>
        <LeagueHeader compact subtitle="Super Admin" />

        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBadge}>
              <AppIcon name="shield-crown" size={18} color={colors.forest[950]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Admin Panel</Text>
              <Text style={styles.cardSubtitle}>Full access granted</Text>
            </View>
          </View>

          <View style={styles.emailRow}>
            <AppIcon name="email-outline" size={16} color={colors.lime[500]} />
            <View>
              <Text style={styles.label}>Signed in as</Text>
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.permissionsWrap}>
            <PermissionChip icon="account-group" label="Manage Players" />
            <PermissionChip icon="trophy" label="Live Draft" />
            <PermissionChip icon="tag" label="Categories" />
            <PermissionChip icon="file-pdf-box" label="Export PDFs" />
          </View>

          <PremiumButton
            variant="outline"
            onPress={confirmSignOut}
            icon={() => (
              <AppIcon name="logout" size={18} color={colors.lime[500]} />
            )}
            style={styles.signOutBtn}>
            Sign Out
          </PremiumButton>
        </View>
      </View>
    </GradientBackground>
  );
}

function PermissionChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.permChip}>
      <AppIcon name={icon} size={14} color={colors.lime[500]} />
      <Text style={styles.permChipText}>{label}</Text>
    </View>
  );
}

export function AdminTabNavigator() {
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
        name="AdminPlayers"
        component={PlayersStackNavigator}
        options={{
          title: 'Players',
          tabBarIcon: ({ color, size, focused }) => (
            <AppIcon
              name={focused ? 'account-group' : 'account-group-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AdminDraft"
        component={AdminDraftScreen}
        options={{
          title: 'Draft',
          headerShown: true,
          ...premiumHeaderOptions,
          headerTitle: 'MCL Draft',
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminExport"
        component={AdminExportScreen}
        options={{
          title: 'Export',
          headerShown: true,
          ...premiumHeaderOptions,
          headerTitle: 'PDF Export',
          tabBarIcon: ({ color, size, focused }) => (
            <AppIcon name="file-pdf-box" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminAccount"
        component={AdminAccountScreen}
        options={{
          title: 'Account',
          headerShown: true,
          ...premiumHeaderOptions,
          headerTitle: 'Admin Account',
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
  account: { flex: 1, padding: 20, paddingBottom: 48 },
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
    backgroundColor: colors.lime[500],
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
    backgroundColor: colors.lime[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.lime[500],
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
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.forest[900],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.forest[600],
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  label: { color: colors.silver[400], fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  email: {
    color: colors.silver[50],
    fontWeight: '800',
    fontSize: 15,
    marginTop: 2,
  },
  permissionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
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
  signOutBtn: {
    marginTop: 4,
  },
});
