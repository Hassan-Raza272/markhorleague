import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { EaseView } from 'react-native-ease';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from './AppIcon';
import { colors } from '../constants/theme';
import { motion, PulseView } from '../motion';

type PremiumSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function PremiumSheet({
  visible,
  onClose,
  title,
  subtitle,
  icon = 'menu',
  children,
  footer,
}: PremiumSheetProps) {
  const insets = useSafeAreaInsets();
  const [presented, setPresented] = useState(visible);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    if (visible) setPresented(true);
  }, [visible]);

  return (
    <Modal
      visible={presented}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <EaseView
            pointerEvents="none"
            style={styles.dim}
            animate={{ opacity: visible ? 1 : 0 }}
            transition={motion.overlay}
          />
          <EaseView
            initialAnimate={{ opacity: 0, translateY: 56 }}
            animate={{
              opacity: visible ? 1 : 0,
              translateY: visible ? 0 : 56,
            }}
            transition={motion.enter}
            onTransitionEnd={({ finished }) => {
              if (finished && !visibleRef.current) {
                setPresented(false);
              }
            }}>
            <Pressable
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
              onPress={e => e.stopPropagation()}>
              <View style={styles.glow} />
              <PulseView from={0.92} to={1.08} duration={1600}>
                <View style={styles.handle} />
              </PulseView>
              <View style={styles.accent} />

              <View style={styles.header}>
                <View style={styles.iconBadge}>
                  <AppIcon name={icon} size={18} color={colors.forest[950]} />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle ? (
                    <Text style={styles.subtitle}>{subtitle}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close">
                  <AppIcon name="close" size={18} color={colors.silver[300]} />
                </Pressable>
              </View>

              <View style={styles.body}>{children}</View>
              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </Pressable>
          </EaseView>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(3,10,5,0.78)',
  },
  sheet: {
    backgroundColor: colors.forest[800],
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.forest[600],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  glow: {
    position: 'absolute',
    top: -70,
    left: '18%',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.lime[500],
    opacity: 0.08,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gold[500],
    marginBottom: 14,
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 28,
    right: 28,
    height: 2,
    backgroundColor: colors.gold[500],
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.lime[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.silver[50],
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: colors.silver[400],
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.forest[900],
    borderWidth: 1,
    borderColor: colors.forest[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    minHeight: 80,
  },
  footer: {
    marginTop: 16,
  },
});
