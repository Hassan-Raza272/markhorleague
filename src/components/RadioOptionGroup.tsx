import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, HelperText } from 'react-native-paper';
import { EaseView } from 'react-native-ease';
import { colors } from '../constants/theme';
import { motion } from '../motion';

export type RadioOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  label: string;
  value?: T;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  columns?: 2 | 3 | 4;
};

function RadioChip<T extends string>({
  option,
  selected,
  onChange,
}: {
  option: RadioOption<T>;
  selected: boolean;
  onChange: (value: T) => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={() => onChange(option.value)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={styles.optionPress}>
      <EaseView
        style={styles.optionInner}
        animate={{
          scale: pressed ? 0.97 : 1,
          backgroundColor: selected
            ? 'rgba(163,207,45,0.12)'
            : colors.forest[800],
          borderColor: selected ? colors.lime[500] : colors.forest[600],
        }}
        transition={motion.snappy}>
        <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
          {selected ? (
            <EaseView
              style={styles.radioInner}
              initialAnimate={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={motion.snappy}
            />
          ) : null}
        </View>
        <Text style={[styles.optionText, selected && styles.optionTextActive]}>
          {option.label}
        </Text>
      </EaseView>
    </Pressable>
  );
}

export function RadioOptionGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  required,
  error,
  hint,
  columns = 3,
}: Props<T>) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={[styles.grid, columns === 2 && styles.grid2, columns === 4 && styles.grid4]}>
        {options.map(option => (
          <RadioChip
            key={option.value}
            option={option}
            selected={value === option.value}
            onChange={onChange}
          />
        ))}
      </View>
      {error ? <HelperText type="error">{error}</HelperText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: colors.silver[100],
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  hint: {
    color: colors.silver[400],
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  grid2: {},
  grid4: {},
  optionPress: {
    minWidth: '30%',
    flexGrow: 1,
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.silver[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.lime[500],
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lime[500],
  },
  optionText: {
    color: colors.silver[400],
    fontSize: 13,
    fontWeight: '700',
  },
  optionTextActive: {
    color: colors.lime[500],
  },
});
