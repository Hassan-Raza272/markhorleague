import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Text, TextInput, HelperText } from 'react-native-paper';
import { Asset, launchImageLibrary } from 'react-native-image-picker';
import { PAKISTAN_CITIES } from '../../constants';
import {
  formatCNIC,
  formatPhone,
  validateCNIC,
  validatePhone,
  isEligibleAge,
} from '../../utils/validation';
import { DateOfBirthPicker } from '../../components/DateOfBirthPicker';
import { SelectField } from '../../components/SelectField';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { colors } from '../../constants/theme';
import { RegistrationFormData } from '../../types';
import { PressableScale } from '../../motion';

interface PersonalInfoStepProps {
  data: Partial<RegistrationFormData>;
  onChange: (data: Partial<RegistrationFormData>) => void;
  profileImage: string | null;
  onImageChange: (uri: string | null, asset?: Asset) => void;
  errors: Record<string, string>;
}

export function PersonalInfoStep({
  data,
  onChange,
  profileImage,
  onImageChange,
  errors,
}: PersonalInfoStepProps) {
  const scrollRef = useRef<ScrollView>(null);

  const pickImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
      },
      response => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (asset?.uri) {
          onImageChange(asset.uri, asset);
        }
      },
    );
  };

  return (
    <KeyboardScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Personal Information</Text>
      <Text style={styles.sectionDesc}>
        Enter your personal details. Fields marked * are required.
      </Text>

      <PressableScale onPress={pickImage} pressedScale={0.96} contentStyle={styles.photoContainer}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoIcon}>📷</Text>
            <Text style={styles.photoText}>Add Profile Photo *</Text>
          </View>
        )}
      </PressableScale>
      {errors.profileImage ? (
        <HelperText type="error">{errors.profileImage}</HelperText>
      ) : null}

      <TextInput
        label="Full Name *"
        value={data.fullName ?? ''}
        onChangeText={v => onChange({ fullName: v })}
        mode="outlined"
        style={styles.input}
        outlineColor={colors.forest[600]}
        activeOutlineColor={colors.lime[500]}
        error={!!errors.fullName}
      />
      {errors.fullName ? (
        <HelperText type="error">{errors.fullName}</HelperText>
      ) : null}

      <TextInput
        label="Father's Name *"
        value={data.fatherName ?? ''}
        onChangeText={v => onChange({ fatherName: v })}
        mode="outlined"
        style={styles.input}
        outlineColor={colors.forest[600]}
        activeOutlineColor={colors.lime[500]}
        error={!!errors.fatherName}
      />

      <TextInput
        label="Phone Number *"
        value={data.phone ?? ''}
        onChangeText={v => onChange({ phone: formatPhone(v) })}
        mode="outlined"
        keyboardType="number-pad"
        maxLength={11}
        placeholder="03XXXXXXXXX"
        style={styles.input}
        outlineColor={colors.forest[600]}
        activeOutlineColor={colors.lime[500]}
        error={!!errors.phone}
      />
      {errors.phone ? <HelperText type="error">{errors.phone}</HelperText> : null}

      <TextInput
        label="Email *"
        value={data.email ?? ''}
        mode="outlined"
        editable={false}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        textColor={colors.silver[100]}
        outlineColor={colors.forest[600]}
        activeOutlineColor={colors.lime[500]}
        error={!!errors.email}
      />
      {errors.email ? (
        <HelperText type="error">{errors.email}</HelperText>
      ) : (
        <HelperText type="info">This is the email you used to sign up.</HelperText>
      )}

      <TextInput
        label="CNIC *"
        value={data.cnic ?? ''}
        onChangeText={v => onChange({ cnic: formatCNIC(v) })}
        mode="outlined"
        keyboardType="number-pad"
        placeholder="XXXXX-XXXXXXX-X"
        style={styles.input}
        outlineColor={colors.forest[600]}
        activeOutlineColor={colors.lime[500]}
        error={!!errors.cnic}
      />
      {errors.cnic ? <HelperText type="error">{errors.cnic}</HelperText> : null}

      <DateOfBirthPicker
        value={data.dateOfBirth}
        error={!!errors.dateOfBirth || !!errors.age}
        onChange={(dateOfBirth, age) => onChange({ dateOfBirth, age })}
      />
      {errors.dateOfBirth ? (
        <HelperText type="error">{errors.dateOfBirth}</HelperText>
      ) : null}
      {errors.age ? <HelperText type="error">{errors.age}</HelperText> : null}

      <TextInput
        label="Age"
        value={data.age ? String(data.age) : ''}
        mode="outlined"
        editable={false}
        style={styles.input}
        textColor={colors.silver[100]}
        outlineColor={colors.forest[600]}
      />

      <SelectField
        label="City"
        value={data.city ?? ''}
        options={[...PAKISTAN_CITIES]}
        onSelect={city => onChange({ city })}
        required
        error={errors.city}
      />

      <TextInput
        label="Address *"
        value={data.address ?? ''}
        onChangeText={v => onChange({ address: v })}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
        outlineColor={colors.forest[600]}
        activeOutlineColor={colors.lime[500]}
        error={!!errors.address}
        onFocus={() => {
          setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
          }, 120);
        }}
      />
      {errors.address ? (
        <HelperText type="error">{errors.address}</HelperText>
      ) : null}
    </KeyboardScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.gold[500],
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.forest[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.lime[500],
    borderStyle: 'dashed',
  },
  photoIcon: {
    fontSize: 32,
  },
  photoText: {
    color: colors.lime[500],
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  input: {
    marginBottom: 4,
    backgroundColor: colors.forest[900],
  },
});

export function validatePersonalInfo(
  data: Partial<RegistrationFormData>,
  profileImage: string | null,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.fullName?.trim()) errors.fullName = 'Full name is required.';
  if (!data.fatherName?.trim()) errors.fatherName = "Father's name is required.";
  if (!profileImage) errors.profileImage = 'Profile photo is required.';
  if (!data.phone || !validatePhone(data.phone)) {
    errors.phone = 'Phone number must be exactly 11 digits (03XXXXXXXXX).';
  }
  if (!data.email?.trim() || !data.email.includes('@')) {
    errors.email = 'Valid email is required.';
  }
  if (!data.cnic || !validateCNIC(data.cnic)) {
    errors.cnic = 'CNIC must be in format XXXXX-XXXXXXX-X.';
  }
  if (!data.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(data.dateOfBirth)) {
    errors.dateOfBirth = 'Enter date as YYYY-MM-DD.';
  } else if (!isEligibleAge(data.age)) {
    errors.age = 'Player must be older than 12 years to register.';
  }
  if (!data.city) errors.city = 'City is required.';
  if (!data.address?.trim()) errors.address = 'Address is required.';
  return errors;
}
