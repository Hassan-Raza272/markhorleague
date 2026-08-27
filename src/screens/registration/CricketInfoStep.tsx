import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, HelperText } from 'react-native-paper';
import {
  PLAYING_ROLES,
  BATTING_STYLES,
  BOWLING_STYLES,
} from '../../constants';
import { SelectField } from '../../components/SelectField';
import { colors } from '../../constants/theme';
import { RegistrationFormData } from '../../types';

interface CricketInfoStepProps {
  data: Partial<RegistrationFormData>;
  onChange: (data: Partial<RegistrationFormData>) => void;
  errors: Record<string, string>;
}

export function CricketInfoStep({ data, onChange, errors }: CricketInfoStepProps) {
  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Cricket Information</Text>
      <Text style={styles.sectionDesc}>
        Tell us about your cricket skills and experience.
      </Text>

      <SelectField
        label="Playing Role"
        value={data.role ?? ''}
        options={[...PLAYING_ROLES]}
        onSelect={v => onChange({ role: v as RegistrationFormData['role'] })}
        required
        error={errors.role}
      />

      <SelectField
        label="Batting Style"
        value={data.battingStyle ?? ''}
        options={[...BATTING_STYLES]}
        onSelect={v =>
          onChange({ battingStyle: v as RegistrationFormData['battingStyle'] })
        }
        required
        error={errors.battingStyle}
      />

      <SelectField
        label="Bowling Style"
        value={data.bowlingStyle ?? ''}
        options={[...BOWLING_STYLES]}
        onSelect={v =>
          onChange({ bowlingStyle: v as RegistrationFormData['bowlingStyle'] })
        }
        required
        error={errors.bowlingStyle}
      />

      <TextInput
        label="Years of Experience *"
        value={data.yearsOfExperience ? String(data.yearsOfExperience) : ''}
        onChangeText={v =>
          onChange({ yearsOfExperience: parseInt(v, 10) || 0 })
        }
        mode="outlined"
        keyboardType="number-pad"
        style={styles.input}
        outlineColor={colors.forest[600]}
        activeOutlineColor={colors.lime[500]}
        error={!!errors.yearsOfExperience}
      />
      {errors.yearsOfExperience && (
        <HelperText type="error">{errors.yearsOfExperience}</HelperText>
      )}

      <TextInput
        label="Cricket Achievements (Optional)"
        value={data.achievements ?? ''}
        onChangeText={v => onChange({ achievements: v })}
        mode="outlined"
        multiline
        numberOfLines={3}
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
    marginBottom: 4,
    backgroundColor: colors.forest[900],
  },
});

export function validateCricketInfo(
  data: Partial<RegistrationFormData>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.role) errors.role = 'Playing role is required.';
  if (!data.battingStyle) errors.battingStyle = 'Batting style is required.';
  if (!data.bowlingStyle) errors.bowlingStyle = 'Bowling style is required.';
  if (!data.yearsOfExperience || data.yearsOfExperience < 0) {
    errors.yearsOfExperience = 'Enter valid years of experience.';
  }
  return errors;
}
