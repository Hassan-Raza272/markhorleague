import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';
import { EaseView } from 'react-native-ease';
import { AppIcon } from './AppIcon';
import { colors } from '../constants/theme';
import { motion } from '../motion';

export type PremiumFilterOption<T extends string> = {
  value: T;
  label: string;
  /** Optional accent when selected (e.g. status color) */
  accent?: string;
};

type PremiumFilterGroupProps<T extends string> = {
  title: string;
  subtitle?: string;
  icon: string;
  value: T;
  options: PremiumFilterOption<T>[];
  onChange: (value: T) => void;
  layout?: 'grid' | 'scroll';
  columns?: 2 | 3 | 4;
  style?: ViewStyle;
};

function FilterChip<T extends string>({
  option,
  selected,
  layout,
  columns,
  onChange,
}: {
  option: PremiumFilterOption<T>;
  selected: boolean;
  layout: 'grid' | 'scroll';
  columns: 2 | 3 | 4;
  onChange: (value: T) => void;
}) {
  const [pressed, setPressed] = useState(false);
  const accent = option.accent ?? colors.lime[500];

  return (
    <Pressable
      onPress={() => onChange(option.value)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        layout === 'scroll' ? styles.chipScroll : styles.chipGrid,
        layout === 'grid' && columns === 3 && styles.chipGrid3,
        layout === 'grid' && columns === 4 && styles.chipGrid4,
      ]}>
      <EaseView
        style={[styles.chipInner, layout === 'scroll' && styles.chipInnerScroll]}
        animate={{
          scale: pressed ? 0.97 : 1,
          borderColor: selected ? accent : colors.forest[600],
          backgroundColor: selected ? `${accent}18` : colors.forest[900],
        }}
        transition={motion.snappy}>
        {selected ? (
          <AppIcon name="check-circle" size={14} color={accent} />
        ) : (
          <View style={[styles.chipDot, { borderColor: colors.silver[400] }]} />
        )}
        <Text
          style={[
            styles.chipLabel,
            selected && { color: accent, fontWeight: '800' },
            layout === 'scroll' && styles.chipLabelScroll,
          ]}
          numberOfLines={1}>
          {option.label}
        </Text>
      </EaseView>
    </Pressable>
  );
}

export function PremiumFilterGroup<T extends string>({
  title,
  subtitle,
  icon,
  value,
  options,
  onChange,
  layout = 'grid',
  columns = 2,
  style,
}: PremiumFilterGroupProps<T>) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHeader}>
        <View style={styles.iconBadge}>
          <AppIcon name={icon} size={16} color={colors.forest[950]} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? (
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      {layout === 'scroll' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {options.map(option => (
            <FilterChip
              key={option.value}
              option={option}
              selected={value === option.value}
              layout={layout}
              columns={columns}
              onChange={onChange}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.grid, columns === 3 && styles.grid3, columns === 4 && styles.grid4]}>
          {options.map(option => (
            <FilterChip
              key={option.value}
              option={option}
              selected={value === option.value}
              layout={layout}
              columns={columns}
              onChange={onChange}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.forest[700],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.lime[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.silver[50],
    fontSize: 14,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.silver[400],
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  grid3: {},
  grid4: {},
  scrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  chipGrid: {
    width: '48%',
  },
  chipGrid3: {
    width: '31%',
  },
  chipGrid4: {
    width: '23%',
    minWidth: 72,
  },
  chipScroll: {},
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  chipInnerScroll: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chipDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  chipLabel: {
    color: colors.silver[300],
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  chipLabelScroll: {
    flex: 0,
  },
});
