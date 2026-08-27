import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Text } from 'react-native-paper';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { GradientBackground } from '../../components/GradientBackground';
import { LeagueHeader } from '../../components/LeagueHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { PremiumButton } from '../../components/PremiumButton';
import { AppIcon } from '../../components/AppIcon';
import { useAuth } from '../../hooks/useAuth';
import { submitPaymentReceipt } from '../../services/playerService';
import {
  uploadPaymentReceipt,
  validateImage,
} from '../../services/storageService';
import { REGISTRATION_FEE, formatRegistrationFeeAmount } from '../../constants';
import { colors } from '../../constants/theme';
import { formatDate, formatDateTime } from '../../utils/validation';
import { usePremiumAlert } from '../../components/PremiumAlertProvider';
import { EnterView, PulseView } from '../../motion';

const STATUS_META = {
  PENDING: {
    title: 'Under Review',
    message: 'Your registration is currently under review by the MCL committee.',
    icon: 'clock-outline',
    color: colors.status.pending,
  },
  APPROVED: {
    title: 'Approved!',
    message: 'Congratulations! Your MCL 2026-27 registration has been approved.',
    icon: 'check-decagram',
    color: colors.status.approved,
  },
  REJECTED: {
    title: 'Rejected',
    message: 'Your registration has been rejected. See the reason below.',
    icon: 'close-octagon',
    color: colors.status.rejected,
  },
} as const;

export function StatusScreen() {
  const { player, user, refreshPlayer } = useAuth();
  const { alert } = usePremiumAlert();
  const [refreshing, setRefreshing] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptAsset, setReceiptAsset] = useState<Asset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshPlayer();
    } finally {
      setRefreshing(false);
    }
  }, [refreshPlayer]);

  const pickReceipt = () => {
    launchImageLibrary(
      { mediaType: 'photo', maxWidth: 1200, maxHeight: 1600, quality: 0.85 },
      response => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (asset?.uri) {
          setReceiptUri(asset.uri);
          setReceiptAsset(asset);
        }
      },
    );
  };

  const sendReceipt = async () => {
    if (!player || !user) return;
    if (!receiptUri) {
      alert('Receipt required', 'Please upload your payment receipt first.');
      return;
    }

    const validation = validateImage(
      receiptUri,
      receiptAsset?.fileSize,
      receiptAsset?.type,
    );
    if (!validation.valid) {
      alert('Invalid image', validation.error ?? 'Please choose a valid image.');
      return;
    }

    setSubmitting(true);
    try {
      const receiptUrl = await uploadPaymentReceipt(
        user.uid,
        receiptUri,
        receiptAsset?.type ?? 'image/jpeg',
      );
      await submitPaymentReceipt(player.id, receiptUrl);
      await refreshPlayer();
      setReceiptUri(null);
      setReceiptAsset(null);
      alert(
        'Receipt sent',
        'Your payment receipt has been submitted. The MCL committee will verify it shortly.',
      );
    } catch (e: unknown) {
      alert(
        'Upload failed',
        e instanceof Error ? e.message : 'Could not send receipt. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openEasypaisa = () => {
    Linking.openURL(`tel:${REGISTRATION_FEE.easypaisaNumber}`).catch(() => {
      alert(
        'Easypaisa Number',
        `${REGISTRATION_FEE.easypaisaNumber}\nAccount Title: ${REGISTRATION_FEE.accountTitle}\nAmount: ${formatRegistrationFeeAmount()}`,
      );
    });
  };

  if (!player) return null;

  const displayStatus =
    (player.status as string) === 'SUSPENDED' ? 'REJECTED' : player.status;
  const meta = STATUS_META[displayStatus as keyof typeof STATUS_META];
  const hasSubmittedReceipt = !!player.feeReceiptUrl;

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.lime[500]}
            colors={[colors.lime[500]]}
          />
        }>
        <LeagueHeader compact subtitle="Registration Status" />

        <EnterView delay={60} fromY={20} style={styles.card}>
          <PulseView from={0.96} to={1.06} duration={1400}>
            <View style={[styles.iconWrap, { borderColor: meta.color }]}>
              <AppIcon name={meta.icon} size={40} color={meta.color} />
            </View>
          </PulseView>

          <Text style={styles.title}>{meta.title}</Text>
          <Text style={styles.message}>{meta.message}</Text>

          <View style={styles.badgeCenter}>
            <StatusBadge status={displayStatus} />
          </View>

          <View style={styles.idContainer}>
            <Text style={styles.idLabel}>MCL Player ID</Text>
            <Text style={styles.idValue}>{player.playerId}</Text>
          </View>

          <View style={styles.metaRow}>
            <AppIcon name="calendar" size={16} color={colors.silver[400]} />
            <Text style={styles.metaText}>
              Submitted {formatDate(player.createdAt)}
            </Text>
          </View>

          {player.status === 'REJECTED' && player.rejectionReason ? (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason</Text>
              <Text style={styles.reasonText}>{player.rejectionReason}</Text>
            </View>
          ) : null}

          <Text style={styles.hint}>Pull down to refresh your latest status</Text>
        </EnterView>

        <EnterView delay={140} fromY={22} style={styles.feeCard}>
          <View style={styles.feeHeader}>
            <AppIcon name="cash-multiple" size={22} color={colors.gold[500]} />
            <Text style={styles.feeTitle}>Registration Fee Payment</Text>
          </View>

          <Text style={styles.feeIntro}>
            Please pay your MCL 2026-27 registration fee of{' '}
            <Text style={styles.feeAmount}>{formatRegistrationFeeAmount()}</Text>{' '}
            via Easypaisa, then upload and send your payment receipt below.
          </Text>

          <View style={styles.paymentBox}>
            <Text style={styles.paymentLabel}>Registration Fee</Text>
            <Text style={styles.feeValue}>{formatRegistrationFeeAmount()}</Text>
            <Text style={styles.paymentLabel}>Easypaisa Number</Text>
            <TouchableOpacity onPress={openEasypaisa} style={styles.paymentRow}>
              <Text style={styles.paymentValue}>
                {REGISTRATION_FEE.easypaisaNumber}
              </Text>
              <AppIcon name="phone" size={18} color={colors.lime[500]} />
            </TouchableOpacity>
            <Text style={styles.paymentLabel}>Account Title</Text>
            <Text style={styles.paymentTitle}>{REGISTRATION_FEE.accountTitle}</Text>
          </View>

          <View style={styles.warningBox}>
            <AppIcon name="alert-circle-outline" size={18} color={colors.gold[400]} />
            <Text style={styles.warningText}>
              If you do not pay the registration fee, you will not be eligible
              for the MCL draft.
            </Text>
          </View>

          {hasSubmittedReceipt ? (
            <View style={styles.submittedBox}>
              <View style={styles.submittedHeader}>
                <AppIcon name="check-circle" size={20} color={colors.status.approved} />
                <Text style={styles.submittedTitle}>Receipt Submitted</Text>
              </View>
              {player.feeReceiptSubmittedAt ? (
                <Text style={styles.submittedMeta}>
                  Sent on {formatDateTime(player.feeReceiptSubmittedAt)}
                </Text>
              ) : null}
              <Image
                source={{ uri: player.feeReceiptUrl }}
                style={styles.receiptPreview}
                resizeMode="cover"
              />
              <Text style={styles.submittedNote}>
                Your receipt is with the MCL committee for verification. You may
                upload a new receipt if needed.
              </Text>
            </View>
          ) : null}

          <Text style={styles.uploadLabel}>
            {hasSubmittedReceipt ? 'Upload new receipt (optional)' : 'Payment receipt'}
          </Text>

          <TouchableOpacity style={styles.uploadArea} onPress={pickReceipt}>
            {receiptUri ? (
              <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <AppIcon name="camera-plus" size={32} color={colors.lime[500]} />
                <Text style={styles.uploadHint}>Tap to upload receipt screenshot</Text>
              </View>
            )}
          </TouchableOpacity>

          {receiptUri ? (
            <PremiumButton
              onPress={sendReceipt}
              loading={submitting}
              disabled={submitting}
              icon={() => (
                <AppIcon name="send" size={18} color={colors.forest[950]} />
              )}
              style={styles.sendBtn}>
              Send Receipt
            </PremiumButton>
          ) : null}
        </EnterView>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 48,
  },
  card: {
    backgroundColor: colors.forest[800],
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.forest[600],
    marginBottom: 16,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.forest[900],
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.silver[50],
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: colors.silver[400],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  badgeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    marginTop: 4,
  },
  idContainer: {
    marginTop: 22,
    backgroundColor: colors.forest[900],
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold[500],
  },
  idLabel: {
    color: colors.silver[400],
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  idValue: {
    color: colors.lime[500],
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  metaText: {
    color: colors.silver[400],
    fontSize: 13,
  },
  reasonBox: {
    marginTop: 18,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  reasonLabel: {
    color: '#FCA5A5',
    fontWeight: '700',
    marginBottom: 4,
  },
  reasonText: {
    color: '#FECACA',
    lineHeight: 22,
  },
  hint: {
    marginTop: 20,
    color: colors.silver[400],
    fontSize: 12,
  },
  feeCard: {
    backgroundColor: colors.forest[800],
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.gold[500],
  },
  feeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  feeTitle: {
    color: colors.silver[50],
    fontSize: 18,
    fontWeight: '800',
  },
  feeIntro: {
    color: colors.silver[400],
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  paymentBox: {
    backgroundColor: colors.forest[900],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.forest[600],
    marginBottom: 12,
  },
  paymentLabel: {
    color: colors.silver[400],
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentValue: {
    color: colors.lime[500],
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  paymentTitle: {
    color: colors.gold[400],
    fontSize: 16,
    fontWeight: '700',
  },
  feeAmount: {
    color: colors.gold[400],
    fontWeight: '800',
  },
  feeValue: {
    color: colors.gold[400],
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    color: colors.gold[400],
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  submittedBox: {
    backgroundColor: 'rgba(163,207,45,0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(163,207,45,0.35)',
    marginBottom: 14,
  },
  submittedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  submittedTitle: {
    color: colors.lime[500],
    fontWeight: '800',
    fontSize: 15,
  },
  submittedMeta: {
    color: colors.silver[400],
    fontSize: 12,
    marginBottom: 10,
  },
  submittedNote: {
    color: colors.silver[400],
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  uploadLabel: {
    color: colors.silver[300],
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  uploadArea: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.forest[600],
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  uploadPlaceholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.forest[900],
    gap: 8,
    padding: 16,
  },
  uploadHint: {
    color: colors.silver[400],
    fontSize: 13,
    textAlign: 'center',
  },
  receiptPreview: {
    width: '100%',
    height: 180,
    backgroundColor: colors.forest[900],
  },
  sendBtn: {
    marginTop: 4,
  },
});
