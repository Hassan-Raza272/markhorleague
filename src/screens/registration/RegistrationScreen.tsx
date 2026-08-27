import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Asset } from 'react-native-image-picker';
import { GradientBackground } from '../../components/GradientBackground';
import { StepIndicator } from '../../components/StepIndicator';
import { PremiumButton } from '../../components/PremiumButton';
import {
  PersonalInfoStep,
  validatePersonalInfo,
} from './PersonalInfoStep';
import {
  CricketInfoStep,
  validateCricketInfo,
} from './CricketInfoStep';
import { AdditionalInfoStep, validateAdditionalInfo } from './AdditionalInfoStep';
import { ConfirmationStep } from './ConfirmationStep';
import { useAuth } from '../../hooks/useAuth';
import {
  submitPlayerRegistration,
  checkDuplicateRegistration,
} from '../../services/playerService';
import {
  uploadProfileImage,
  validateImage,
} from '../../services/storageService';
import { RegistrationFormData } from '../../types';
import { colors } from '../../constants/theme';
import { usePremiumAlert } from '../../components/PremiumAlertProvider';

const STEP_LABELS = [
  'Personal Info',
  'Cricket Info',
  'Additional Info',
  'Confirmation',
];

export function RegistrationScreen() {
  const { user, refreshPlayer } = useAuth();
  const { alert } = usePremiumAlert();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<RegistrationFormData>>({
    email: user?.email ?? '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<Asset | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    setFormData(prev =>
      prev.email === user.email ? prev : { ...prev, email: user.email },
    );
  }, [user?.email]);

  const updateForm = (data: Partial<RegistrationFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...data,
      email: user?.email ?? data.email ?? prev.email,
    }));
  };

  const handleImageChange = (uri: string | null, asset?: Asset) => {
    setProfileImage(uri);
    setImageAsset(asset ?? null);
  };

  const validateStep = (): boolean => {
    let stepErrors: Record<string, string> = {};
    switch (step) {
      case 1:
        stepErrors = validatePersonalInfo(formData, profileImage);
        break;
      case 2:
        stepErrors = validateCricketInfo(formData);
        break;
      case 3:
        stepErrors = validateAdditionalInfo(formData);
        break;
      case 4:
        if (!confirmed) {
          stepErrors.confirm = 'Please confirm your information.';
        }
        break;
    }
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (step === 1 && user) {
      setLoading(true);
      try {
        const duplicates = await checkDuplicateRegistration(
          formData.phone!,
          formData.cnic!,
          user.uid,
        );
        if (duplicates.phoneExists) {
          setErrors({
            phone: 'This phone number is already registered.',
          });
          return;
        }
        if (duplicates.cnicExists) {
          setErrors({
            cnic: 'This CNIC already exists. Please use a different CNIC.',
          });
          return;
        }
      } catch (e: unknown) {
        alert(
          'Error',
          e instanceof Error ? e.message : 'Could not validate registration.',
        );
        return;
      } finally {
        setLoading(false);
      }
    }

    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user || !validateStep()) return;

    const imageValidation = validateImage(
      profileImage ?? '',
      imageAsset?.fileSize,
      imageAsset?.type,
    );
    if (!imageValidation.valid) {
      setErrors({ profileImage: imageValidation.error ?? 'Invalid image.' });
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const duplicates = await checkDuplicateRegistration(
        formData.phone!,
        formData.cnic!,
        user.uid,
      );
      if (duplicates.phoneExists) {
        setErrors({ phone: 'This phone number is already registered.' });
        setStep(1);
        return;
      }
      if (duplicates.cnicExists) {
        setErrors({
          cnic: 'This CNIC already exists. Please use a different CNIC.',
        });
        setStep(1);
        return;
      }

      let imageUrl: string | undefined;
      if (profileImage) {
        imageUrl = await uploadProfileImage(
          user.uid,
          profileImage,
          imageAsset?.type ?? 'image/jpeg',
        );
      }

      await submitPlayerRegistration(
        user.uid,
        user.email ?? formData.email!,
        formData as RegistrationFormData,
        imageUrl,
      );

      await refreshPlayer();
      alert(
        'Registration Submitted',
        'Your registration is now under review. You will be notified once approved.',
      );
    } catch (e: unknown) {
      alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to submit registration.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <View style={styles.screen}>
        <StepIndicator
          currentStep={step}
          totalSteps={4}
          labels={STEP_LABELS}
        />

        <View style={styles.content}>
          <View key={step} style={styles.step}>
            {step === 1 && (
              <PersonalInfoStep
                data={formData}
                onChange={updateForm}
                profileImage={profileImage}
                onImageChange={handleImageChange}
                errors={errors}
              />
            )}
            {step === 2 && (
              <CricketInfoStep
                data={formData}
                onChange={updateForm}
                errors={errors}
              />
            )}
            {step === 3 && (
              <AdditionalInfoStep
                data={formData}
                onChange={updateForm}
                errors={errors}
              />
            )}
            {step === 4 && (
              <ConfirmationStep
                data={formData}
                profileImage={profileImage}
                confirmed={confirmed}
                onConfirmChange={setConfirmed}
                error={errors.confirm}
              />
            )}
          </View>
        </View>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}>
          {step > 1 && (
            <PremiumButton
              variant="outline"
              onPress={handleBack}
              style={styles.btn}>
              Back
            </PremiumButton>
          )}
          <PremiumButton
            onPress={handleNext}
            loading={loading}
            disabled={loading}
            style={styles.btnFlex}>
            {step === 4 ? 'Submit Registration' : 'Continue'}
          </PremiumButton>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  step: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    backgroundColor: colors.forest[800],
    borderTopWidth: 1,
    borderTopColor: colors.forest[600],
  },
  btn: {
    flex: 1,
  },
  btnFlex: {
    flex: 2,
  },
});
