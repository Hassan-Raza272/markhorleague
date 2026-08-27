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
import { registerWithEmail } from '../../services/authService';
import { colors } from '../../constants/theme';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { EnterView } from '../../motion';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

function getAuthErrorMessage(e: unknown): string {
  const code =
    typeof e === 'object' && e !== null && 'code' in e
      ? String((e as { code: string }).code)
      : '';
  const message = e instanceof Error ? e.message : 'Registration failed.';

  if (
    code === 'auth/email-already-in-use' ||
    message.includes('email-already-in-use')
  ) {
    return 'This email already exists. Please use a different email.';
  }
  if (code === 'auth/invalid-email' || message.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/weak-password' || message.includes('weak-password')) {
    return 'Password must be at least 6 characters.';
  }
  return message;
}

export function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { settings } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const registrationClosed = settings?.registrationOpen === false;

  const handleRegister = async () => {
    if (registrationClosed) {
      setError('Player registration for MCL 2026-27 is currently closed.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await registerWithEmail(email.trim().toLowerCase(), password);
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e));
    } finally {
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
          <LeagueHeader subtitle="Create Your Account" compact stagger />
        </View>

        <KeyboardScrollView contentContainerStyle={styles.scroll}>
          {registrationClosed && (
            <EnterView delay={580} fromY={14} cascade>
              <View style={styles.closedBanner}>
                <Text style={styles.closedText}>
                  Player registration for MCL 2026-27 is currently closed.
                </Text>
              </View>
            </EnterView>
          )}

          <View style={styles.card}>
            <EnterView delay={620} fromY={18} cascade>
              <Text variant="headlineSmall" style={styles.title}>
                Join MCL 2026-27
              </Text>
            </EnterView>
            <EnterView delay={760} fromY={16} cascade>
              <Text style={styles.description}>
                Create your account to register as a player for the Markhor Cricket
                League.
              </Text>
            </EnterView>

            <EnterView delay={900} fromY={18} cascade>
              <TextInput
                label="Email *"
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
                label="Password *"
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

            <EnterView delay={1180} fromY={18} cascade>
              <TextInput
                label="Confirm Password *"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    color={colors.lime[500]}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
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

            <EnterView delay={1320} fromY={16} cascade>
              <PremiumButton
                onPress={handleRegister}
                loading={loading}
                disabled={loading || registrationClosed}
                style={styles.button}>
                Create Account
              </PremiumButton>
            </EnterView>

            <EnterView delay={1460} fromY={14} cascade>
              <AuthOrDivider />
            </EnterView>

            <EnterView delay={1600} fromY={16} cascade>
              <AuthAlternateAction
                hint="Already have an account?"
                actionLabel="Sign In"
                icon="login"
                onPress={() => navigation.navigate('Login')}
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
  closedBanner: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  closedText: {
    color: '#FCA5A5',
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.forest[800],
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.forest[600],
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
