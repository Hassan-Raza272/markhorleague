import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, HelperText } from 'react-native-paper';
import { RadioOptionGroup } from '../../components/RadioOptionGroup';
import { KIT_SIZE_LABELS, KIT_SIZES } from '../../constants';
import { colors } from '../../constants/theme';
import { KitSize, RegistrationFormData } from '../../types';

interface AdditionalInfoStepProps {
  data: Partial<RegistrationFormData>;
  onChange: (data: Partial<RegistrationFormData>) => void;
  errors: Record<string, string>;
}

const KIT_SIZE_OPTIONS = KIT_SIZES.map(size => ({
  value: size,
  label: KIT_SIZE_LABELS[size],
}));

export function AdditionalInfoStep({
  data,
  onChange,
  errors,
}: AdditionalInfoStepProps) {
  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Kit & Additional Info</Text>
      <Text style={styles.sectionDesc}>
        Provide your preferred shirt number and uniform size for league kit.
      </Text>

      <TextInput
        label="Shirt Number *"
        value={data.shirtNumber ?? ''}
        onChangeText={v => onChange({ shirtNumber: v })}
        mode="outlined"
        keyboardType="number-pad"
        placeholder="e.g. 7"
        style={styles.input}
        outlineColor={colors.forest[600]}
        activeOutlineColor={colors.lime[500]}
        error={!!errors.shirtNumber}
      />
      {errors.shirtNumber ? (
        <HelperText type="error">{errors.shirtNumber}</HelperText>
      ) : null}

      <RadioOptionGroup<KitSize>
        label="Uniform Size (Shirt & Trouser)"
        hint="Select the size that best fits you for both shirt and trousers."
        value={data.kitSize}
        options={KIT_SIZE_OPTIONS}
        onChange={kitSize => onChange({ kitSize })}
        required
        error={errors.kitSize}
        columns={2}
      />

      <TextInput
        label="Current Club"
        value={data.currentClub ?? ''}
        onChangeText={v => onChange({ currentClub: v })}
        mode="outlined"
        style={styles.input}
        outlineColor={colors.forest[600]}
        activeOutlineColor={colors.lime[500]}
      />

      <TextInput
        label="Player Description (Optional)"
        value={data.description ?? ''}
        onChangeText={v => onChange({ description: v })}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.input}
        outlineColor={colors.forest[600]}
        activeOutlineColor={colors.lime[500]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.silver[50],
    marginBottom: 4,
  },
  sectionDesc: {
    color: colors.silver[400],
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    marginBottom: 12,
    backgroundColor: colors.forest[900],
  },
});

export function validateAdditionalInfo(
  data: Partial<RegistrationFormData>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.shirtNumber?.trim()) {
    errors.shirtNumber = 'Shirt number is required.';
  }
  if (!data.kitSize) {
    errors.kitSize = 'Please select your uniform size.';
  }
  return errors;
}
