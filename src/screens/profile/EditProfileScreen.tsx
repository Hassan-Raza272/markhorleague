import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, TextInput, HelperText } from 'react-native-paper';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { GradientBackground } from '../../components/GradientBackground';
import { PremiumButton } from '../../components/PremiumButton';
import { DateOfBirthPicker } from '../../components/DateOfBirthPicker';
import { SelectField } from '../../components/SelectField';
import { RadioOptionGroup } from '../../components/RadioOptionGroup';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { useAuth } from '../../hooks/useAuth';
import {
  updatePlayerRegistration,
  checkDuplicateRegistration,
} from '../../services/playerService';
import { uploadProfileImage, validateImage } from '../../services/storageService';
import {
  PLAYING_ROLES,
  BATTING_STYLES,
  BOWLING_STYLES,
  KIT_SIZE_LABELS,
  KIT_SIZES,
  PAKISTAN_CITIES,
} from '../../constants';
import { colors } from '../../constants/theme';
import {
  formatCNIC,
  formatPhone,
  validateCNIC,
  validatePhone,
  isEligibleAge,
} from '../../utils/validation';
import { MainStackParamList } from '../../navigation/types';
import { usePremiumAlert } from '../../components/PremiumAlertProvider';
import { EnterView, PressableScale } from '../../motion';
import {
  BattingStyle,
  BowlingStyle,
  KitSize,
  PlayingRole,
  RegistrationFormData,
} from '../../types';

export function EditProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { player, user, refreshPlayer } = useAuth();
  const { alert } = usePremiumAlert();
  const [form, setForm] = useState<Partial<RegistrationFormData>>({
    fullName: player?.fullName ?? '',
    fatherName: player?.fatherName ?? '',
    phone: player?.phone ?? '',
    email: player?.email ?? '',
    cnic: player?.cnic ?? '',
    dateOfBirth: player?.dateOfBirth ?? '',
    age: player?.age ?? 0,
    city: player?.city ?? '',
    address: player?.address ?? '',
    role: player?.role,
    battingStyle: player?.battingStyle,
    bowlingStyle: player?.bowlingStyle,
    yearsOfExperience: player?.yearsOfExperience ?? 0,
    achievements: player?.achievements ?? '',
    shirtNumber: player?.shirtNumber ?? '',
    kitSize: player?.kitSize,
    currentClub: player?.currentClub ?? '',
    description: player?.description ?? '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(
    player?.profileImage ?? null,
  );
  const [newImageAsset, setNewImageAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!player || !user) {
    return null;
  }

  const update = (patch: Partial<RegistrationFormData>) =>
    setForm(prev => ({ ...prev, ...patch }));

  const pickImage = () => {
    launchImageLibrary(
      { mediaType: 'photo', maxWidth: 800, maxHeight: 800, quality: 0.8 },
      response => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (asset?.uri) {
          setProfileImage(asset.uri);
          setNewImageAsset(asset);
        }
      },
    );
  };

  const save = async () => {
    if (!form.fullName?.trim() || !form.fatherName?.trim()) {
      setError('Name fields are required.');
      return;
    }
    if (!form.phone || !validatePhone(form.phone)) {
      setError('Phone number must be exactly 11 digits (03XXXXXXXXX).');
      return;
    }
    if (!form.cnic || !validateCNIC(form.cnic)) {
      setError('Enter a valid CNIC.');
      return;
    }
    if (!isEligibleAge(form.age)) {
      setError('Player must be older than 12 years.');
      return;
    }
    if (!form.dateOfBirth || !form.city || !form.address?.trim() || !form.role) {
      setError('Please complete all required fields.');
      return;
    }
    if (!form.shirtNumber?.trim()) {
      setError('Shirt number is required.');
      return;
    }
    if (!form.kitSize) {
      setError('Please select your uniform size.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const duplicates = await checkDuplicateRegistration(
        form.phone,
        form.cnic,
        user.uid,
      );
      if (duplicates.phoneExists) {
        setError('This phone number is already registered.');
        return;
      }
      if (duplicates.cnicExists) {
        setError('This CNIC already exists. Please use a different CNIC.');
        return;
      }

      let imageUrl: string | undefined;
      if (newImageAsset?.uri && profileImage) {
        const validation = validateImage(
          profileImage,
          newImageAsset.fileSize,
          newImageAsset.type,
        );
        if (!validation.valid) {
          throw new Error(validation.error);
        }
        imageUrl = await uploadProfileImage(
          user.uid,
          profileImage,
          newImageAsset.type ?? 'image/jpeg',
        );
      }

      const cleaned: Partial<RegistrationFormData> = {
        fullName: form.fullName.trim(),
        fatherName: form.fatherName.trim(),
        phone: form.phone,
        email: form.email ?? player.email,
        cnic: form.cnic,
        dateOfBirth: form.dateOfBirth,
        age: form.age ?? player.age,
        city: form.city,
        address: form.address?.trim() || '',
        role: form.role,
        battingStyle: form.battingStyle,
        bowlingStyle: form.bowlingStyle,
        yearsOfExperience: form.yearsOfExperience ?? 0,
        achievements: form.achievements?.trim() || '',
        shirtNumber: form.shirtNumber?.trim() || '',
        kitSize: form.kitSize,
        currentClub: form.currentClub?.trim() || '',
        description: form.description?.trim() || '',
      };

      await updatePlayerRegistration(player.id, cleaned, imageUrl);
      await refreshPlayer();
      setNewImageAsset(null);
      if (imageUrl) {
        setProfileImage(imageUrl);
      }
      alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardScrollView contentContainerStyle={styles.scroll}>
        <PressableScale onPress={pickImage} pressedScale={0.96}>
          <EnterView fromScale={0.88} fromY={8} style={styles.photoWrap}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoText}>Change Photo</Text>
            </View>
          )}
          </EnterView>
        </PressableScale>

        <TextInput
          label="Full Name *"
          value={form.fullName ?? ''}
          onChangeText={v => update({ fullName: v })}
          mode="outlined"
          style={styles.input}
          textColor={colors.silver[100]}
          outlineColor={colors.forest[600]}
          activeOutlineColor={colors.lime[500]}
        />
        <TextInput
          label="Father's Name *"
          value={form.fatherName ?? ''}
          onChangeText={v => update({ fatherName: v })}
          mode="outlined"
          style={styles.input}
          textColor={colors.silver[100]}
          outlineColor={colors.forest[600]}
          activeOutlineColor={colors.lime[500]}
        />
        <TextInput
          label="Phone *"
          value={form.phone ?? ''}
          onChangeText={v => update({ phone: formatPhone(v) })}
          mode="outlined"
          keyboardType="number-pad"
          maxLength={11}
          style={styles.input}
          textColor={colors.silver[100]}
          outlineColor={colors.forest[600]}
          activeOutlineColor={colors.lime[500]}
        />
        <TextInput
          label="CNIC *"
          value={form.cnic ?? ''}
          onChangeText={v => update({ cnic: formatCNIC(v) })}
          mode="outlined"
          keyboardType="number-pad"
          style={styles.input}
          textColor={colors.silver[100]}
          outlineColor={colors.forest[600]}
          activeOutlineColor={colors.lime[500]}
        />

        <DateOfBirthPicker
          value={form.dateOfBirth}
          onChange={(dateOfBirth, age) => update({ dateOfBirth, age })}
        />

        <TextInput
          label="Age"
          value={form.age ? String(form.age) : ''}
          mode="outlined"
          editable={false}
          style={styles.input}
          textColor={colors.silver[100]}
          outlineColor={colors.forest[600]}
        />

        <SelectField
          label="City"
          value={form.city ?? ''}
          options={[...PAKISTAN_CITIES]}
          onSelect={city => update({ city })}
          required
        />
        <TextInput
          label="Address *"
          value={form.address ?? ''}
          onChangeText={v => update({ address: v })}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          textColor={colors.silver[100]}
          outlineColor={colors.forest[600]}
          activeOutlineColor={colors.lime[500]}
        />
        <SelectField
          label="Playing Role"
          value={form.role ?? ''}
          options={[...PLAYING_ROLES]}
          onSelect={role => update({ role: role as PlayingRole })}
          required
        />
        <SelectField
          label="Batting Style"
          value={form.battingStyle ?? ''}
          options={[...BATTING_STYLES]}
          onSelect={style => update({ battingStyle: style as BattingStyle })}
          required
        />
        <SelectField
          label="Bowling Style"
          value={form.bowlingStyle ?? ''}
          options={[...BOWLING_STYLES]}
          onSelect={style => update({ bowlingStyle: style as BowlingStyle })}
          required
        />

        <TextInput
          label="Years of Experience"
          value={
            form.yearsOfExperience !== undefined
              ? String(form.yearsOfExperience)
              : ''
          }
          onChangeText={v =>
            update({ yearsOfExperience: parseInt(v, 10) || 0 })
          }
          mode="outlined"
          keyboardType="number-pad"
          style={styles.input}
          textColor={colors.silver[100]}
          outlineColor={colors.forest[600]}
          activeOutlineColor={colors.lime[500]}
        />
        <TextInput
          label="Current Club"
          value={form.currentClub ?? ''}
          onChangeText={v => update({ currentClub: v })}
          mode="outlined"
          style={styles.input}
          textColor={colors.silver[100]}
          outlineColor={colors.forest[600]}
          activeOutlineColor={colors.lime[500]}
        />
        <TextInput
          label="Shirt Number *"
          value={form.shirtNumber ?? ''}
          onChangeText={v => update({ shirtNumber: v })}
          mode="outlined"
          keyboardType="number-pad"
          style={styles.input}
          textColor={colors.silver[100]}
          outlineColor={colors.forest[600]}
          activeOutlineColor={colors.lime[500]}
        />
        <RadioOptionGroup<KitSize>
          label="Uniform Size (Shirt & Trouser) *"
          value={form.kitSize}
          options={KIT_SIZES.map(size => ({
            value: size,
            label: KIT_SIZE_LABELS[size],
          }))}
          onChange={kitSize => update({ kitSize })}
          columns={2}
        />

        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : null}

        <PremiumButton onPress={save} loading={loading} disabled={loading}>
          Save Changes
        </PremiumButton>
      </KeyboardScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20 },
  photoWrap: { alignSelf: 'center', marginBottom: 16 },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.gold[500],
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.forest[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.lime[500],
  },
  photoText: { color: colors.lime[500], fontSize: 12, fontWeight: '700' },
  input: {
    marginBottom: 10,
    backgroundColor: colors.forest[900],
  },
});
