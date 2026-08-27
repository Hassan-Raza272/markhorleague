import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { EaseView } from 'react-native-ease';
import { GradientBackground } from './GradientBackground';
import { colors } from '../constants/theme';
import { motion } from '../motion';

const { width } = Dimensions.get('window');

function ShimmerBlock({ style, delay = 0 }: { style?: object; delay?: number }) {
  return (
    <EaseView
      style={[styles.block, style]}
      initialAnimate={{ opacity: 0.3 }}
      animate={{ opacity: 1 }}
      transition={{ ...motion.loop, delay }}
    />
  );
}

export function ScreenSkeleton({ variant = 'detail' }: { variant?: 'detail' | 'list' | 'cards' }) {
  if (variant === 'list') {
    return (
      <GradientBackground>
        <View style={styles.container}>
          <ShimmerBlock style={styles.header} />
          <ShimmerBlock style={styles.searchBar} delay={80} />
          {Array.from({ length: 6 }).map((_, i) => (
            <ShimmerBlock key={i} style={styles.listItem} delay={120 + i * 70} />
          ))}
        </View>
      </GradientBackground>
    );
  }

  if (variant === 'cards') {
    return (
      <GradientBackground>
        <View style={styles.container}>
          <ShimmerBlock style={styles.header} />
          <View style={styles.cardRow}>
            <ShimmerBlock style={styles.card} delay={80} />
            <ShimmerBlock style={styles.card} delay={140} />
          </View>
          <View style={styles.cardRow}>
            <ShimmerBlock style={styles.card} delay={180} />
            <ShimmerBlock style={styles.card} delay={220} />
          </View>
          <ShimmerBlock style={styles.bigCard} delay={280} />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.container}>
        <ShimmerBlock style={styles.header} />
        <ShimmerBlock style={styles.avatar} delay={80} />
        <ShimmerBlock style={styles.titleLine} delay={140} />
        <ShimmerBlock style={styles.subtitleLine} delay={180} />
        <ShimmerBlock style={styles.bigCard} delay={240} />
        <ShimmerBlock style={styles.bigCard} delay={300} />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  block: {
    backgroundColor: colors.forest[800],
    borderRadius: 12,
  },
  header: {
    height: 48,
    width: width * 0.5,
    borderRadius: 8,
  },
  searchBar: {
    height: 44,
    width: '100%',
    borderRadius: 22,
  },
  listItem: {
    height: 64,
    width: '100%',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    height: 100,
  },
  bigCard: {
    height: 160,
    width: '100%',
  },
  avatar: {
    height: 80,
    width: 80,
    borderRadius: 40,
    alignSelf: 'center',
  },
  titleLine: {
    height: 24,
    width: width * 0.6,
    alignSelf: 'center',
    borderRadius: 6,
  },
  subtitleLine: {
    height: 16,
    width: width * 0.4,
    alignSelf: 'center',
    borderRadius: 6,
  },
});
