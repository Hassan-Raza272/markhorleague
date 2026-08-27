import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { AppIcon } from './AppIcon';
import { colors } from '../constants/theme';
import { PressableScale } from '../motion';

type Props = {
  hint: string;
  actionLabel: string;
  onPress: () => void;
  icon?: string;
};

export function AuthAlternateAction({
  hint,
  actionLabel,
  onPress,
  icon = 'account-plus',
}: Props) {
  return (
    <PressableScale
      onPress={onPress}
      contentStyle={styles.card}
      pressedScale={0.98}>
      <View style={styles.iconWrap}>
        <AppIcon name={icon} size={22} color={colors.forest[950]} />
      </View>

      <View style={styles.content}>
        <Text style={styles.hint}>{hint}</Text>
        <Text style={styles.action}>{actionLabel}</Text>
      </View>

      <View style={styles.chevronWrap}>
        <AppIcon name="chevron-right" size={22} color={colors.gold[500]} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.forest[600],
    backgroundColor: colors.forest[900],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.lime[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  hint: {
    color: colors.silver[400],
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
  },
  action: {
    color: colors.silver[50],
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${colors.gold[500]}44`,
    backgroundColor: `${colors.gold[500]}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
