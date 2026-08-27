import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Text, TextInput, HelperText } from 'react-native-paper';
import { colors } from '../constants/theme';
import { AppIcon } from './AppIcon';
import { PremiumSheet } from './PremiumSheet';
import { EaseView } from 'react-native-ease';
import { motion } from '../motion';

type Props = {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  required?: boolean;
  error?: string;
};

/** Outlined select that opens a premium bottom sheet picker. */
export function SelectField({
  label,
  value,
  options,
  onSelect,
  required,
  error,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const { height } = useWindowDimensions();
  const searchable = options.length > 8;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(opt => opt.toLowerCase().includes(q));
  }, [options, query]);

  const open = () => {
    setQuery('');
    setVisible(true);
  };

  const close = () => setVisible(false);

  const choose = (opt: string) => {
    onSelect(opt);
    close();
  };

  return (
    <View style={styles.fieldContainer}>
      <TouchableOpacity onPress={open} activeOpacity={0.85}>
        <View pointerEvents="none">
          <TextInput
            label={`${label}${required ? ' *' : ''}`}
            value={value}
            mode="outlined"
            editable={false}
            right={
              <TextInput.Icon icon="chevron-down" color={colors.lime[500]} />
            }
            style={styles.input}
            textColor={colors.silver[100]}
            outlineColor={error ? '#EF4444' : colors.forest[600]}
            activeOutlineColor={colors.lime[500]}
            error={!!error}
            theme={{
              colors: {
                onSurfaceVariant: colors.silver[400],
                primary: colors.lime[500],
              },
            }}
          />
        </View>
      </TouchableOpacity>
      {error ? <HelperText type="error">{error}</HelperText> : null}

      <PremiumSheet
        visible={visible}
        onClose={close}
        title={label}
        subtitle="Tap an option to select"
        icon="format-list-checks">
        {searchable ? (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${label.toLowerCase()}...`}
            mode="outlined"
            dense
            left={<TextInput.Icon icon="magnify" color={colors.lime[500]} />}
            right={
              query ? (
                <TextInput.Icon
                  icon="close-circle"
                  color={colors.silver[400]}
                  onPress={() => setQuery('')}
                />
              ) : undefined
            }
            style={styles.search}
            outlineColor={colors.forest[600]}
            activeOutlineColor={colors.lime[500]}
            textColor={colors.silver[100]}
            theme={{
              colors: {
                onSurfaceVariant: colors.silver[400],
                primary: colors.lime[500],
              },
            }}
          />
        ) : null}

        <ScrollView
          style={{ maxHeight: height * 0.48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <Text style={styles.empty}>No matches found.</Text>
          ) : (
            filtered.map((opt, index) => {
              const selected = opt === value;
              return (
                <Pressable key={opt} onPress={() => choose(opt)}>
                  <EaseView
                    style={styles.option}
                    initialAnimate={{ opacity: 0, translateX: 12 }}
                    animate={{
                      opacity: 1,
                      translateX: 0,
                      scale: selected ? 1.01 : 1,
                      backgroundColor: selected
                        ? 'rgba(163,207,45,0.12)'
                        : colors.forest[900],
                      borderColor: selected
                        ? colors.lime[500]
                        : colors.forest[600],
                    }}
                    transition={{
                      ...motion.snappy,
                      delay: Math.min(index, 8) * 30,
                    }}>
                    <View
                      style={[
                        styles.radio,
                        selected && styles.radioSelected,
                      ]}>
                    {selected ? (
                      <EaseView
                        style={styles.radioDot}
                        initialAnimate={{ scale: 0.4 }}
                        animate={{ scale: 1 }}
                        transition={motion.snappy}
                      />
                    ) : null}
                    </View>
                    <Text
                      style={[
                        styles.optionLabel,
                        selected && styles.optionLabelSelected,
                      ]}>
                      {opt}
                    </Text>
                    {selected ? (
                      <AppIcon
                        name="check-circle"
                        size={18}
                        color={colors.lime[500]}
                      />
                    ) : null}
                  </EaseView>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </PremiumSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 4,
  },
  input: {
    marginBottom: 4,
    backgroundColor: colors.forest[900],
  },
  search: {
    marginBottom: 12,
    backgroundColor: colors.forest[900],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.silver[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.lime[500],
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.lime[500],
  },
  optionLabel: {
    flex: 1,
    color: colors.silver[200],
    fontSize: 15,
    fontWeight: '600',
  },
  optionLabelSelected: {
    color: colors.lime[500],
    fontWeight: '800',
  },
  empty: {
    color: colors.silver[400],
    textAlign: 'center',
    paddingVertical: 28,
    fontSize: 14,
  },
});
