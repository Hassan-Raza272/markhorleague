import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { EaseView } from 'react-native-ease';
import { colors } from '../constants/theme';
import { motion } from '../motion';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function StepIndicator({
  currentStep,
  totalSteps,
  labels,
}: StepIndicatorProps) {
  const progress = currentStep / totalSteps;

  return (
    <View style={styles.container}>
      <EaseView
        key={currentStep}
        initialAnimate={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={motion.soft}
        style={styles.header}>
        <Text style={styles.stepText}>
          Step {currentStep} of {totalSteps}
        </Text>
        <Text style={styles.label}>{labels[currentStep - 1]}</Text>
      </EaseView>
      <ProgressBar
        progress={progress}
        color={colors.gold[500]}
        style={styles.progressBar}
      />
      <View style={styles.dots}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const active = i + 1 <= currentStep;
          const current = i + 1 === currentStep;
          return (
            <EaseView
              key={i}
              style={styles.dot}
              animate={{
                scaleX: current ? 2.2 : 1,
                backgroundColor: current
                  ? colors.gold[500]
                  : active
                    ? colors.lime[600]
                    : colors.forest[700],
              }}
              transition={motion.snappy}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 12,
  },
  stepText: {
    color: colors.lime[500],
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  label: {
    color: colors.silver[50],
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.forest[700],
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
