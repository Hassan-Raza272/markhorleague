import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, HelperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBackground } from '../../components/GradientBackground';
import { LeagueHeader } from '../../components/LeagueHeader';
import { PremiumButton } from '../../components/PremiumButton';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { AuthOrDivider } from '../../components/AuthOrDivider';
import { AuthAlternateAction } from '../../components/AuthAlternateAction';
import { loginWithEmail } from '../../services/authService';
import { colors } from '../../constants/theme';
import { AuthStackParamList } from '../../navigation/types';
import { EnterView } from '../../motion';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await loginWithEmail(email.trim().toLowerCase(), password);
      // Keep the spinner until AuthProvider navigates to the correct tabs.
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'Login failed. Please try again.';
      setError(
        message.includes('invalid-credential') ||
          message.includes('wrong-password') ||
          message.includes('user-not-found')
          ? 'Invalid email or password.'
          : message,
      );
      setLoading(false);
    }
  };

  const inputTheme = {
    colors: {
      onSurfaceVariant: colors.silver[400],
      primary: colors.lime[500],
    },
  };

  return (
    <GradientBackground>
      <View
        style={[
          styles.screen,
          { paddingTop: Math.max(insets.top, 12) + 12 },
        ]}>
        <View style={styles.headerFixed}>
          <LeagueHeader subtitle="Player Portal" compact stagger />
        </View>

        <KeyboardScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <EnterView delay={620} fromY={18} cascade>
              <Text variant="headlineSmall" style={styles.title}>
                Welcome Back
              </Text>
            </EnterView>
            <EnterView delay={760} fromY={16} cascade>
              <Text style={styles.description}>
                Sign in to view your registration status and profile.
              </Text>
            </EnterView>

            <EnterView delay={900} fromY={18} cascade>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                textColor={colors.silver[100]}
                outlineColor={colors.forest[600]}
                activeOutlineColor={colors.lime[500]}
                theme={inputTheme}
              />
            </EnterView>

            <EnterView delay={1040} fromY={18} cascade>
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    color={colors.lime[500]}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.input}
                textColor={colors.silver[100]}
                outlineColor={colors.forest[600]}
                activeOutlineColor={colors.lime[500]}
                theme={inputTheme}
              />
            </EnterView>

            {error ? (
              <HelperText type="error" visible>
                {error}
              </HelperText>
            ) : null}

            <EnterView delay={1180} fromY={16} cascade>
              <PremiumButton
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.button}>
                Sign In
              </PremiumButton>
            </EnterView>

            <EnterView delay={1320} fromY={14} cascade>
              <AuthOrDivider />
            </EnterView>

            <EnterView delay={1460} fromY={16} cascade>
              <AuthAlternateAction
                hint="New to the league?"
                actionLabel="Create Account"
                icon="account-plus-outline"
                onPress={() => navigation.navigate('Register')}
              />
            </EnterView>
          </View>
        </KeyboardScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerFixed: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  card: {
    backgroundColor: colors.forest[800],
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.forest[600],
    shadowColor: colors.lime[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  title: {
    color: colors.silver[50],
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    color: colors.silver[400],
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    marginBottom: 12,
    backgroundColor: colors.forest[900],
  },
  button: {
    marginTop: 8,
  },
});
