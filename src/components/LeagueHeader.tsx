import React from 'react';
import { View, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { EaseView } from 'react-native-ease';
import { colors } from '../constants/theme';
import { LEAGUE } from '../constants';
import { EnterView, FloatView, motion } from '../motion';

interface LeagueHeaderProps {
  subtitle?: string;
  compact?: boolean;
  stagger?: boolean;
}

function Cascade({
  enabled,
  delay,
  fromY,
  children,
  style,
}: {
  enabled?: boolean;
  delay: number;
  fromY: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  if (!enabled) {
    return <>{children}</>;
  }
  return (
    <EnterView delay={delay} fromY={fromY} cascade style={style}>
      {children}
    </EnterView>
  );
}

export function LeagueHeader({ subtitle, compact, stagger }: LeagueHeaderProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Cascade enabled={stagger} delay={0} fromY={12} style={styles.logoWrap}>
        <FloatView distance={compact ? 4 : 8} duration={2600} style={styles.logoWrap}>
          <EaseView
            initialAnimate={{ opacity: 0, scale: 0.82, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ ...motion.enter, delay: stagger ? 40 : 0 }}
            useHardwareLayer>
            <Image
              source={require('../assets/mcl-logo.png')}
              style={[styles.logo, compact && styles.logoCompact]}
              resizeMode="contain"
            />
          </EaseView>
        </FloatView>
      </Cascade>

      <View style={styles.textBlock}>
        <Cascade enabled={stagger} delay={140} fromY={16}>
          <Text
            variant={compact ? 'titleLarge' : 'headlineMedium'}
            style={styles.title}>
            {LEAGUE.name}
          </Text>
        </Cascade>
        <Cascade enabled={stagger} delay={280} fromY={14}>
          <Text style={styles.tagline}>Markhor Cricket League · Season 4</Text>
        </Cascade>
        {subtitle ? (
          <Cascade enabled={stagger} delay={420} fromY={12}>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </Cascade>
        ) : null}
      </View>

      <Cascade enabled={stagger} delay={540} fromY={8}>
        <View style={styles.divider} />
      </Cascade>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 24,
  },
  compact: {
    paddingVertical: 12,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
    borderRadius: 100,
  },
  logoCompact: {
    width: 88,
    height: 88,
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    color: colors.silver[50],
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
    width: '100%',
  },
  tagline: {
    color: colors.lime[500],
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
  },
  subtitle: {
    color: colors.silver[400],
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    width: 56,
    height: 3,
    backgroundColor: colors.gold[500],
    borderRadius: 2,
    marginTop: 14,
    alignSelf: 'center',
  },
});
