import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabNavigator } from './MainTabNavigator';
import { AdminTabNavigator } from './AdminTabNavigator';
import { FranchiseTabNavigator } from './FranchiseTabNavigator';
import { RegistrationScreen } from '../screens/registration/RegistrationScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { MainStackParamList } from './types';
import { useAuth } from '../hooks/useAuth';
import { useSignOut } from '../hooks/useSignOut';
import {
  premiumHeaderOptions,
  PremiumHeaderAction,
} from '../components/PremiumHeader';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
  const { player, isSuperAdmin, isFranchiseAdmin } = useAuth();
  const { confirmSignOut } = useSignOut();

  const screenOptions = {
    ...premiumHeaderOptions,
  };

  const signOutAction = () => (
    <PremiumHeaderAction
      icon="logout"
      onPress={confirmSignOut}
      accessibilityLabel="Sign out"
    />
  );

  if (isSuperAdmin) {
    return (
      <Stack.Navigator key="super-admin" screenOptions={screenOptions}>
        <Stack.Screen
          name="AdminTabs"
          component={AdminTabNavigator}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  if (isFranchiseAdmin && !player) {
    return (
      <Stack.Navigator key="franchise-register" screenOptions={screenOptions}>
        <Stack.Screen
          name="Registration"
          component={RegistrationScreen}
          options={{
            title: 'Player Registration',
            headerRight: signOutAction,
          }}
        />
      </Stack.Navigator>
    );
  }

  if (isFranchiseAdmin) {
    return (
      <Stack.Navigator key="franchise-admin" screenOptions={screenOptions}>
        <Stack.Screen
          name="FranchiseTabs"
          component={FranchiseTabNavigator}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  const initialRoute = player ? 'MainTabs' : 'Registration';

  return (
    <Stack.Navigator
      key={player ? 'player' : 'register'}
      initialRouteName={initialRoute}
      screenOptions={screenOptions}>
      <Stack.Screen
        name="Registration"
        component={RegistrationScreen}
        options={{
          title: 'Player Registration',
          headerRight: signOutAction,
        }}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
    </Stack.Navigator>
  );
}
