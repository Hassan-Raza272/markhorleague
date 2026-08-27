import React from 'react';
import { View, StyleSheet, Image, StatusBar } from 'react-native';
import { Text } from 'react-native-paper';
import { EaseView } from 'react-native-ease';
import { colors } from '../constants/theme';
import { motion } from '../motion';

type Props = {
  /** Optional subtitle under the brand line */
  message?: string;
};

/**
 * Premium branded splash used while auth/bootstrap resolves.
 */
export function SplashScreen({ message = 'Player Registration' }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.forest[950]} />
      <EaseView
        style={styles.glowTop}
        initialAnimate={{ opacity: 0.06, scale: 1 }}
        animate={{ opacity: 0.12, scale: 1.08 }}
        transition={motion.ambient}
      />
      <EaseView
        style={styles.glowBottom}
        initialAnimate={{ opacity: 0.04, scale: 1 }}
        animate={{ opacity: 0.1, scale: 1.06 }}
        transition={{ ...motion.ambient, delay: 400 }}
      />
      <View style={styles.glowMid} />

      <View style={styles.center}>
        <EaseView
          style={styles.spinRing}
          initialAnimate={{ rotate: 0, opacity: 0.22 }}
          animate={{ rotate: 360, opacity: 0.22 }}
          transition={motion.spin}
        />
        <EaseView
          style={styles.ring}
          initialAnimate={{ opacity: 0.18, scale: 1 }}
          animate={{ opacity: 0.05, scale: 1.12 }}
          transition={motion.loop}
          useHardwareLayer
        />
        <EaseView
          initialAnimate={{ opacity: 0, scale: 0.72, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={motion.enter}
          useHardwareLayer>
          <Image
            source={require('../assets/mcl-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </EaseView>

        <EaseView
          initialAnimate={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ ...motion.soft, delay: 280 }}
          style={styles.titleBlock}>
          <Text style={styles.title}>MCL 2026-27</Text>
          <Text style={styles.tagline}>Markhor Cricket League</Text>
          <Text style={styles.season}>Season 4</Text>
        </EaseView>

        <EaseView
          style={styles.line}
          initialAnimate={{ scaleX: 0.2, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ ...motion.soft, delay: 480 }}
        />

        <EaseView
          initialAnimate={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...motion.soft, delay: 560 }}>
          <Text style={styles.message}>{message}</Text>
        </EaseView>
      </View>

      <EaseView
        style={styles.footerWrap}
        initialAnimate={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ ...motion.soft, delay: 700 }}>
        <Text style={styles.footer}>Official Player Portal</Text>
      </EaseView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.forest[950],
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    left: '15%',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.lime[500],
  },
  glowBottom: {
    position: 'absolute',
    bottom: -80,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.gold[500],
  },
  glowMid: {
    position: 'absolute',
    top: '42%',
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.lime[600],
    opacity: 0.05,
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  ring: {
    position: 'absolute',
    top: -18,
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 2,
    borderColor: colors.lime[500],
  },
  spinRing: {
    position: 'absolute',
    top: -28,
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 1.5,
    borderColor: colors.gold[500],
    borderStyle: 'dashed',
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 22,
  },
  titleBlock: {
    alignItems: 'center',
  },
  title: {
    color: colors.silver[50],
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
  },
  tagline: {
    marginTop: 8,
    color: colors.lime[500],
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  season: {
    marginTop: 4,
    color: colors.gold[500],
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  line: {
    width: 64,
    height: 3,
    backgroundColor: colors.gold[500],
    borderRadius: 2,
    marginTop: 18,
    marginBottom: 14,
  },
  message: {
    color: colors.silver[400],
    fontSize: 14,
    fontWeight: '600',
  },
  footerWrap: {
    position: 'absolute',
    bottom: 36,
  },
  footer: {
    color: colors.silver[400],
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
});
