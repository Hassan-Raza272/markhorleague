import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { AppIcon } from './AppIcon';
import { colors } from '../constants/theme';

type PremiumStatCardProps = {
  label: string;
  value: number;
  icon: string;
  accent: string;
  selected?: boolean;
  onPress?: () => void;
};

export function PremiumStatCard({
  label,
  value,
  icon,
  accent,
  selected = false,
  onPress,
}: PremiumStatCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.wrap,
        pressed && onPress ? styles.pressed : null,
      ]}>
      <View
        style={[
          styles.card,
          {
            borderColor: selected ? accent : `${accent}55`,
            backgroundColor: selected ? `${accent}22` : colors.forest[800],
          },
        ]}>
        <View style={[styles.topBar, { backgroundColor: accent }]} />
        <View style={[styles.iconBadge, { backgroundColor: `${accent}24` }]}>
          <AppIcon name={icon} size={13} color={accent} />
        </View>
        <Text style={[styles.value, { color: accent }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  card: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
    lineHeight: 26,
  },
  label: {
    marginTop: 4,
    color: colors.silver[300],
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
