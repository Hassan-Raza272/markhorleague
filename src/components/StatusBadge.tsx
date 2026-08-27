import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { EaseView } from 'react-native-ease';
import { getStatusColor, getStatusLabel } from '../utils/validation';
import { RegistrationStatus } from '../types';
import { colors } from '../constants/theme';
import { motion } from '../motion';

interface StatusBadgeProps {
  status: RegistrationStatus;
  size?: 'small' | 'medium';
  align?: 'center' | 'start';
}

const PREMIUM: Record<
  RegistrationStatus,
  { fill: string; border: string; text: string; dot: string; ring: string }
> = {
  PENDING: {
    fill: '#2A1F08',
    border: colors.gold[500],
    text: colors.gold[400],
    dot: colors.gold[500],
    ring: '#5C4814',
  },
  APPROVED: {
    fill: '#12240A',
    border: colors.lime[500],
    text: colors.lime[300],
    dot: colors.lime[500],
    ring: '#3A5A14',
  },
  REJECTED: {
    fill: '#2A0C0C',
    border: '#F87171',
    text: '#FCA5A5',
    dot: colors.status.rejected,
    ring: '#7F1D1D',
  },
};

export function StatusBadge({
  status,
  size = 'medium',
  align = 'center',
}: StatusBadgeProps) {
  const palette = PREMIUM[status] ?? {
    fill: colors.forest[800],
    border: getStatusColor(status),
    text: getStatusColor(status),
    dot: getStatusColor(status),
    ring: colors.forest[600],
  };
  const label = getStatusLabel(status);
  const isSmall = size === 'small';
  const pulse = status === 'PENDING';

  return (
    <EaseView
      style={[
        styles.badge,
        {
          backgroundColor: palette.fill,
          borderColor: palette.border,
          alignSelf: align === 'start' ? 'flex-start' : 'center',
        },
        isSmall && styles.small,
      ]}
      initialAnimate={{ opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={motion.snappy}>
      <EaseView
        style={[styles.dotRing, { borderColor: palette.ring }]}
        initialAnimate={pulse ? { scale: 0.85, opacity: 0.55 } : undefined}
        animate={{ scale: 1, opacity: 1 }}
        transition={pulse ? { ...motion.loop, duration: 1400 } : motion.snappy}>
        <EaseView
          style={[styles.dot, { backgroundColor: palette.dot }]}
          initialAnimate={pulse ? { scale: 0.75 } : undefined}
          animate={{ scale: 1 }}
          transition={pulse ? { ...motion.loop, duration: 1400 } : motion.snappy}
        />
      </EaseView>
      <Text
        style={[
          styles.text,
          { color: palette.text },
          isSmall && styles.smallText,
        ]}
        numberOfLines={1}>
        {label}
      </Text>
    </EaseView>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 8,
  },
  small: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    gap: 6,
  },
  dotRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  text: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  smallText: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
});
