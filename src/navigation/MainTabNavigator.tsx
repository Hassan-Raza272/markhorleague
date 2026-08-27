import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusScreen } from '../screens/status/StatusScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { TabParamList } from './types';
import { AppIcon } from '../components/AppIcon';
import { PremiumTabBar } from '../components/PremiumTabBar';
import {
  premiumHeaderOptions,
  PremiumHeaderAction,
} from '../components/PremiumHeader';
import { useSignOut } from '../hooks/useSignOut';

const Tab = createBottomTabNavigator<TabParamList>();

function HeaderSignOut() {
  const { confirmSignOut } = useSignOut();
  return (
    <PremiumHeaderAction
      icon="logout"
      onPress={confirmSignOut}
      accessibilityLabel="Sign out"
    />
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <PremiumTabBar {...props} mode="simple" />}
      screenOptions={{
        ...premiumHeaderOptions,
        headerRight: () => <HeaderSignOut />,
      }}>
      <Tab.Screen
        name="Status"
        component={StatusScreen}
        options={{
          title: 'Status',
          headerTitle: 'Registration Status',
          tabBarIcon: ({ color, size, focused }) => (
            <AppIcon
              name={focused ? 'clipboard-check' : 'clipboard-check-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <AppIcon
              name={focused ? 'account-circle' : 'account-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
