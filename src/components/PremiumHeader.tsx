import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getHeaderTitle } from '@react-navigation/elements';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import type { BottomTabHeaderProps } from '@react-navigation/bottom-tabs';
import { AppIcon } from './AppIcon';
import { colors } from '../constants/theme';

/**
 * Shared premium navigation header — forest glass bar, lime eyebrow,
 * gold accent rail, and consistent action slots.
 */
export function PremiumHeader(
  props: NativeStackHeaderProps | BottomTabHeaderProps,
) {
  const { options, route, navigation } = props;
  const back = 'back' in props ? props.back : undefined;
  const insets = useSafeAreaInsets();
  const tint = options.headerTintColor ?? colors.lime[500];
  const title = getHeaderTitle(options, route.name);
  const canGoBack = Boolean(back);

  const actionProps = { tintColor: tint, canGoBack };

  const left =
    options.headerLeft?.(actionProps as never) ??
    (back ? (
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [
          styles.iconBtn,
          pressed && styles.iconBtnPressed,
        ]}>
        <AppIcon
          name={Platform.OS === 'ios' ? 'chevron-left' : 'arrow-left'}
          size={24}
          color={tint}
        />
      </Pressable>
    ) : (
      <View style={styles.sideSlot} />
    ));

  const right = options.headerRight?.(actionProps as never) ?? (
    <View style={styles.sideSlot} />
  );

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.bar}>
        <View style={styles.side}>{left}</View>

        <View style={styles.center} pointerEvents="none">
          <Text style={styles.eyebrow} numberOfLines={1}>
            MCL · Season 4
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>

      <View style={styles.rail}>
        <View style={styles.railTrack} />
        <View style={styles.railAccent} />
      </View>
    </View>
  );
}

/** Use as `header: renderPremiumHeader` on stack or tab navigators. */
export function renderPremiumHeader(
  props: NativeStackHeaderProps | BottomTabHeaderProps,
) {
  return <PremiumHeader {...props} />;
}

/** Shared screen options that install the premium header. */
export const premiumHeaderOptions = {
  header: renderPremiumHeader,
  headerShadowVisible: false,
  headerTintColor: colors.lime[500],
} as const;

/** Matching action control for headerRight / headerLeft slots. */
export function PremiumHeaderAction({
  icon,
  onPress,
  accessibilityLabel,
  color = colors.lime[500],
}: {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconBtn,
        pressed && styles.iconBtnPressed,
      ]}>
      <AppIcon name={icon} size={22} color={color} />
    </Pressable>
  );
}

const SIDE_WIDTH = 52;

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.forest[900],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.forest[600],
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -40,
    left: '25%',
    width: 180,
    height: 100,
    borderRadius: 90,
    backgroundColor: colors.lime[500],
    opacity: 0.07,
  },
  bar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  side: {
    width: SIDE_WIDTH,
    minHeight: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  sideSlot: {
    width: SIDE_WIDTH,
    height: 44,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  eyebrow: {
    color: colors.lime[500],
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    color: colors.silver[50],
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.forest[800],
    borderWidth: 1,
    borderColor: colors.forest[600],
  },
  iconBtnPressed: {
    opacity: 0.75,
    backgroundColor: colors.forest[700],
  },
  rail: {
    height: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.forest[700],
  },
  railAccent: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.gold[500],
  },
});
