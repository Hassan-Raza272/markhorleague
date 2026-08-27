import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { EaseView } from 'react-native-ease';
import { colors } from '../constants/theme';
import { motion } from '../motion';

export function AuthOrDivider() {
  return (
    <View style={styles.wrap}>
      <EaseView
        style={styles.line}
        initialAnimate={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ ...motion.soft, delay: 80 }}
      />
      <EaseView
        style={styles.badge}
        initialAnimate={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...motion.enter, delay: 140 }}>
        <EaseView
          initialAnimate={{ opacity: 0.55 }}
          animate={{ opacity: 1 }}
          transition={{ ...motion.loop, duration: 1600 }}>
          <Text style={styles.text}>OR</Text>
        </EaseView>
      </EaseView>
      <EaseView
        style={styles.line}
        initialAnimate={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ ...motion.soft, delay: 80 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    gap: 14,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.forest[600],
  },
  badge: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${colors.gold[500]}66`,
    backgroundColor: colors.forest[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.gold[400],
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
