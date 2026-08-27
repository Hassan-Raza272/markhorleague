import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { PremiumAlertProvider } from '../components/PremiumAlertProvider';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { SplashScreen } from '../screens/SplashScreen';
import { RootStackParamList } from './types';
import { cricketTheme, colors } from '../constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const MIN_SPLASH_MS = 2200;

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.lime[500],
    background: colors.forest[900],
    card: colors.forest[800],
    text: colors.silver[50],
    border: colors.forest[600],
    notification: colors.lime[500],
  },
};

function RootNavigator() {
  const { user, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !splashDone) {
    return <SplashScreen message="Preparing your portal..." />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <PaperProvider
      theme={cricketTheme}
      settings={{
        icon: props => <MaterialCommunityIcons {...props} />,
      }}>
      <AuthProvider>
        <PremiumAlertProvider>
          <StatusBar barStyle="light-content" backgroundColor={colors.forest[950]} />
          <NavigationContainer theme={navTheme}>
            <RootNavigator />
          </NavigationContainer>
        </PremiumAlertProvider>
      </AuthProvider>
    </PaperProvider>
  );
}
