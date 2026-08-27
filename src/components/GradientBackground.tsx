import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { EaseView } from 'react-native-ease';
import { colors } from '../constants/theme';
import { motion } from '../motion';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GradientBackground({ children, style }: GradientBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      <EaseView
        style={styles.glowTop}
        initialAnimate={{ opacity: 0.05, scale: 1 }}
        animate={{ opacity: 0.1, scale: 1.06 }}
        transition={motion.ambient}
      />
      <EaseView
        style={styles.glowBottom}
        initialAnimate={{ opacity: 0.04, scale: 1 }}
        animate={{ opacity: 0.08, scale: 1.05 }}
        transition={{ ...motion.ambient, delay: 500 }}
      />
      {/* Plain View keeps flex children (e.g. sticky footers) constrained;
          EaseView/EnterView can size to content and push footers off-screen. */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.forest[900],
  },
  content: {
    flex: 1,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    left: '20%',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.lime[500],
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.gold[500],
  },
});
