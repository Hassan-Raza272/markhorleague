import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../constants/theme';
import { RegistrationFormData } from '../../types';
import { AppIcon } from '../../components/AppIcon';
import { getKitSizeLabel } from '../../utils/validation';
import { EaseView } from 'react-native-ease';
import { EnterView, motion } from '../../motion';

interface ConfirmationStepProps {
  data: Partial<RegistrationFormData>;
  profileImage: string | null;
  confirmed: boolean;
  onConfirmChange: (value: boolean) => void;
  error?: string;
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function ConfirmationStep({
  data,
  profileImage,
  confirmed,
  onConfirmChange,
  error,
}: ConfirmationStepProps) {
  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Confirm Registration</Text>
      <Text style={styles.sectionDesc}>
        Review your information before submitting.
      </Text>

      <EnterView fromY={16} fromScale={0.96} style={styles.card}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.photo} />
        ) : null}

        <Text style={styles.name}>{data.fullName}</Text>

        <InfoRow label="Father's Name" value={data.fatherName} />
        <InfoRow label="Phone" value={data.phone} />
        <InfoRow label="Email" value={data.email} />
        <InfoRow label="CNIC" value={data.cnic} />
        <InfoRow label="Date of Birth" value={data.dateOfBirth} />
        <InfoRow label="Age" value={data.age} />
        <InfoRow label="City" value={data.city} />
        <InfoRow label="Address" value={data.address} />
        <InfoRow label="Role" value={data.role} />
        <InfoRow label="Batting" value={data.battingStyle} />
        <InfoRow label="Bowling" value={data.bowlingStyle} />
        <InfoRow
          label="Experience"
          value={
            data.yearsOfExperience !== undefined
              ? `${data.yearsOfExperience} Years`
              : undefined
          }
        />
        <InfoRow label="Achievements" value={data.achievements} />
        <InfoRow label="Shirt Number" value={data.shirtNumber} />
        <InfoRow
          label="Uniform Size"
          value={data.kitSize ? getKitSizeLabel(data.kitSize) : undefined}
        />
        <InfoRow label="Current Club" value={data.currentClub} />
      </EnterView>

      <Pressable onPress={() => onConfirmChange(!confirmed)}>
        <EaseView
          style={styles.confirmRow}
          animate={{
            scale: confirmed ? 1.01 : 1,
            backgroundColor: confirmed
              ? 'rgba(163,207,45,0.12)'
              : colors.forest[800],
            borderColor: confirmed ? colors.lime[500] : colors.forest[600],
          }}
          transition={motion.snappy}>
          <EaseView
            style={styles.checkbox}
            animate={{
              scale: confirmed ? 1 : 0.92,
              backgroundColor: confirmed ? colors.lime[500] : 'transparent',
              borderColor: confirmed ? colors.lime[500] : colors.silver[400],
            }}
            transition={motion.snappy}>
            {confirmed ? (
              <EaseView
                initialAnimate={{ scale: 0.4, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={motion.snappy}>
                <AppIcon name="check" size={16} color={colors.forest[950]} />
              </EaseView>
            ) : null}
          </EaseView>
          <Text style={styles.confirmText}>
            I confirm that the information provided is correct.
          </Text>
        </EaseView>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
    fontWeight: '800',
    color: colors.silver[50],
    marginBottom: 4,
  },
  sectionDesc: {
    color: colors.silver[400],
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.forest[800],
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.forest[600],
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.gold[500],
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.silver[50],
    textAlign: 'center',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.forest[700],
    gap: 12,
  },
  label: {
    color: colors.silver[400],
    fontSize: 14,
    flex: 1,
  },
  value: {
    color: colors.silver[100],
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    flex: 1,
    color: colors.silver[100],
    lineHeight: 20,
    fontWeight: '600',
  },
  error: {
    color: '#EF4444',
    marginTop: 4,
    fontSize: 13,
  },
});
