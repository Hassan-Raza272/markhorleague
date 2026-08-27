import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { EaseView } from 'react-native-ease';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AppIcon } from './AppIcon';
import { colors } from '../constants/theme';
import { motion } from '../motion';

const H_MARGIN = 18;
const BAR_HEIGHT = 62;
const NOTCH_DEPTH = 30;
const FAB_SIZE = 58;
const CORNER_RADIUS = 26;

type TabBarNavProps = Pick<
  BottomTabBarProps,
  'state' | 'descriptors' | 'navigation'
>;

type PremiumTabBarProps = BottomTabBarProps & {
  /** Flat full-width bar for 2-tab layouts. */
  mode?: 'simple' | 'curved';
  /** Index of the elevated center tab (curved mode only). */
  centerTabIndex?: number;
};

function buildCurvedPath(width: number, height: number, top: number): string {
  const cx = width / 2;
  const notchHalf = 38;
  const left = cx - notchHalf;
  const right = cx + notchHalf;
  const r = CORNER_RADIUS;
  const bottom = top + height;

  return `
    M 0 ${bottom}
    L 0 ${top + r}
    Q 0 ${top} ${r} ${top}
    L ${left} ${top}
    Q ${cx} ${top - NOTCH_DEPTH} ${right} ${top}
    L ${width - r} ${top}
    Q ${width} ${top} ${width} ${top + r}
    L ${width} ${bottom}
    Z
  `;
}

function buildRoundedPath(width: number, height: number, top: number): string {
  const r = CORNER_RADIUS;
  const bottom = top + height;

  return `
    M 0 ${bottom}
    L 0 ${top + r}
    Q 0 ${top} ${r} ${top}
    L ${width - r} ${top}
    Q ${width} ${top} ${width} ${top + r}
    L ${width} ${bottom}
    Z
  `;
}

function SimpleTabButton({
  focused,
  label,
  iconRenderer,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  label: string;
  iconRenderer?: BottomTabBarProps['descriptors'][string]['options']['tabBarIcon'];
  onPress: () => void;
  onLongPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={simpleStyles.tab}>
      <EaseView
        animate={{ scale: pressed ? 0.92 : 1 }}
        transition={motion.snappy}
        style={simpleStyles.tabInner}
        useHardwareLayer>
        <EaseView
          style={simpleStyles.iconWrap}
          animate={{
            backgroundColor: focused ? 'rgba(163,207,45,0.14)' : 'transparent',
            scale: focused ? 1 : 0.94,
          }}
          transition={motion.snappy}>
          {iconRenderer
            ? iconRenderer({
                focused,
                color: focused ? colors.lime[500] : colors.silver[400],
                size: 22,
              })
            : null}
          <EaseView
            style={simpleStyles.dot}
            animate={{
              opacity: focused ? 1 : 0,
              scale: focused ? 1 : 0.4,
            }}
            transition={motion.snappy}
          />
        </EaseView>
        <Text
          style={[simpleStyles.label, focused && simpleStyles.labelActive]}
          numberOfLines={1}>
          {label}
        </Text>
      </EaseView>
    </Pressable>
  );
}

function SimpleTabBar({
  state,
  descriptors,
  navigation,
}: TabBarNavProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom, 6);

  return (
    <View style={[simpleStyles.wrapper, { paddingBottom }]}>
      <View style={simpleStyles.glow} />
      <View style={simpleStyles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const iconRenderer = options.tabBarIcon;

          return (
            <SimpleTabButton
              key={route.key}
              focused={focused}
              label={String(label)}
              iconRenderer={iconRenderer}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() =>
                navigation.emit({ type: 'tabLongPress', target: route.key })
              }
            />
          );
        })}
      </View>
    </View>
  );
}

function SideTabButton({
  focused,
  label,
  iconRenderer,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  label: string;
  iconRenderer?: BottomTabBarProps['descriptors'][string]['options']['tabBarIcon'];
  onPress: () => void;
  onLongPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={styles.sideTab}>
      <EaseView
        animate={{ scale: pressed ? 0.9 : focused ? 1.06 : 1 }}
        transition={motion.snappy}
        style={styles.sideTabInner}
        useHardwareLayer>
        {iconRenderer
          ? iconRenderer({
              focused,
              color: focused ? colors.lime[500] : colors.silver[400],
              size: 22,
            })
          : null}
        <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
          {label}
        </Text>
      </EaseView>
    </Pressable>
  );
}

function CenterFabButton({
  focused,
  iconRenderer,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  iconRenderer?: BottomTabBarProps['descriptors'][string]['options']['tabBarIcon'];
  onPress: () => void;
  onLongPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}>
      <EaseView
        style={[styles.fab, focused && styles.fabActive]}
        animate={{
          scale: pressed ? 0.92 : focused ? 1.04 : 1,
          backgroundColor: focused ? colors.lime[400] : colors.lime[500],
        }}
        transition={motion.snappy}
        useHardwareLayer>
        {iconRenderer ? (
          iconRenderer({
            focused: true,
            color: colors.forest[950],
            size: 26,
          })
        ) : (
          <AppIcon name="star" size={26} color={colors.forest[950]} />
        )}
      </EaseView>
    </Pressable>
  );
}

function CurvedTabBar({
  state,
  descriptors,
  navigation,
  centerTabIndex,
}: TabBarNavProps & { centerTabIndex?: number }) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const barWidth = screenWidth - H_MARGIN * 2;
  const paddingBottom = Math.max(insets.bottom, 8);

  const resolvedCenterIndex = useMemo(() => {
    if (centerTabIndex !== undefined) return centerTabIndex;
    return state.routes.length === 3 ? 1 : -1;
  }, [centerTabIndex, state.routes.length]);

  const hasCenterFab =
    resolvedCenterIndex >= 0 && resolvedCenterIndex < state.routes.length;

  const topInset = hasCenterFab ? NOTCH_DEPTH : 0;
  const totalHeight = BAR_HEIGHT + topInset;

  const svgPath = hasCenterFab
    ? buildCurvedPath(barWidth, BAR_HEIGHT, topInset)
    : buildRoundedPath(barWidth, BAR_HEIGHT, 0);

  const navigateTo = (routeKey: string, routeName: string, focused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const renderSideTab = (index: number) => {
    const route = state.routes[index];
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const label =
      typeof options.tabBarLabel === 'string'
        ? options.tabBarLabel
        : options.title ?? route.name;
    const iconRenderer = options.tabBarIcon;

    return (
      <SideTabButton
        key={route.key}
        focused={focused}
        label={String(label)}
        iconRenderer={iconRenderer}
        onPress={() => navigateTo(route.key, route.name, focused)}
        onLongPress={() =>
          navigation.emit({ type: 'tabLongPress', target: route.key })
        }
      />
    );
  };

  const renderCenterFab = () => {
    if (!hasCenterFab) return null;

    const route = state.routes[resolvedCenterIndex];
    const { options } = descriptors[route.key];
    const focused = state.index === resolvedCenterIndex;
    const label =
      typeof options.tabBarLabel === 'string'
        ? options.tabBarLabel
        : options.title ?? route.name;
    const iconRenderer = options.tabBarIcon;

    return (
      <View style={styles.centerWrap} pointerEvents="box-none">
        <CenterFabButton
          focused={focused}
          iconRenderer={iconRenderer}
          onPress={() => navigateTo(route.key, route.name, focused)}
          onLongPress={() =>
            navigation.emit({ type: 'tabLongPress', target: route.key })
          }
        />
        <Text style={[styles.fabLabel, focused && styles.fabLabelActive]}>
          {label}
        </Text>
      </View>
    );
  };

  const leftIndices = hasCenterFab
    ? state.routes.map((_, i) => i).filter(i => i < resolvedCenterIndex)
    : [];

  const rightIndices = hasCenterFab
    ? state.routes.map((_, i) => i).filter(i => i > resolvedCenterIndex)
    : [];

  return (
    <View style={[styles.wrapper, { paddingBottom }]}>
      <View style={[styles.barContainer, { width: barWidth, height: totalHeight }]}>
        <Svg
          width={barWidth}
          height={totalHeight}
          style={StyleSheet.absoluteFill}>
          <Path d={svgPath} fill={colors.forest[800]} />
        </Svg>

        <View
          style={[
            styles.tabsRow,
            {
              top: topInset,
              height: BAR_HEIGHT,
            },
          ]}>
          {hasCenterFab ? (
            <>
              <View style={styles.sideGroup}>
                {leftIndices.map(renderSideTab)}
              </View>
              <View style={styles.centerSlot} />
              <View style={styles.sideGroup}>
                {rightIndices.map(renderSideTab)}
              </View>
            </>
          ) : (
            <View style={styles.fullRow}>
              {state.routes.map((_, index) => renderSideTab(index))}
            </View>
          )}
        </View>

        {renderCenterFab()}
      </View>
    </View>
  );
}

export function PremiumTabBar({
  state,
  descriptors,
  navigation,
  mode = 'curved',
  centerTabIndex,
}: PremiumTabBarProps) {
  if (mode === 'simple') {
    return (
      <SimpleTabBar
        state={state}
        descriptors={descriptors}
        navigation={navigation}
      />
    );
  }

  return (
    <CurvedTabBar
      state={state}
      descriptors={descriptors}
      navigation={navigation}
      centerTabIndex={centerTabIndex}
    />
  );
}

const simpleStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.forest[950],
  },
  glow: {
    height: 1,
    backgroundColor: colors.lime[500],
    opacity: 0.35,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.forest[900],
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderColor: colors.forest[600],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(163,207,45,0.14)',
  },
  dot: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lime[500],
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.silver[400],
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: colors.lime[500],
  },
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  barContainer: {
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  tabsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  centerSlot: {
    width: FAB_SIZE + 20,
  },
  sideTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  sideTabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.silver[400],
    letterSpacing: 0.2,
  },
  labelActive: {
    color: colors.lime[500],
    fontWeight: '700',
  },
  centerWrap: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.forest[900],
    ...Platform.select({
      ios: {
        shadowColor: colors.lime[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: {
        elevation: 14,
      },
    }),
  },
  fabActive: {
    borderColor: colors.gold[500],
  },
  fabLabel: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: '600',
    color: colors.silver[400],
  },
  fabLabelActive: {
    color: colors.lime[500],
    fontWeight: '700',
  },
});
