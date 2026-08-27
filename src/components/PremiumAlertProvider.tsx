import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Text } from 'react-native-paper';
import { EaseView } from 'react-native-ease';
import { AppIcon } from './AppIcon';
import { colors } from '../constants/theme';
import { motion } from '../motion';

export type PremiumAlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type PremiumAlertVariant = 'success' | 'error' | 'warning' | 'info';

type AlertState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: PremiumAlertButton[];
  variant: PremiumAlertVariant;
};

type PremiumAlertContextValue = {
  alert: (
    title: string,
    message?: string,
    buttons?: PremiumAlertButton[],
  ) => void;
};

const PremiumAlertContext = createContext<PremiumAlertContextValue | null>(
  null,
);

function inferVariant(title: string, message?: string): PremiumAlertVariant {
  const text = `${title} ${message ?? ''}`.toLowerCase();
  if (
    text.includes('error') ||
    text.includes('failed') ||
    text.includes('invalid') ||
    text.includes('could not')
  ) {
    return 'error';
  }
  if (
    text.includes('saved') ||
    text.includes('updated') ||
    text.includes('submitted') ||
    text.includes('sent') ||
    text.includes('downloaded') ||
    text.includes('success') ||
    text.includes('registration submitted')
  ) {
    return 'success';
  }
  if (
    text.includes('required') ||
    text.includes('no players') ||
    text.includes('sign out') ||
    text.includes('sure')
  ) {
    return 'warning';
  }
  return 'info';
}

const VARIANT_META: Record<
  PremiumAlertVariant,
  { icon: string; color: string; glow: string }
> = {
  success: {
    icon: 'check-circle',
    color: colors.status.approved,
    glow: 'rgba(163,207,45,0.2)',
  },
  error: {
    icon: 'close-circle',
    color: colors.status.rejected,
    glow: 'rgba(239,68,68,0.18)',
  },
  warning: {
    icon: 'alert-circle',
    color: colors.status.pending,
    glow: 'rgba(245,158,11,0.18)',
  },
  info: {
    icon: 'information',
    color: colors.gold[500],
    glow: 'rgba(212,175,55,0.18)',
  },
};

export function PremiumAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<AlertState>({
    visible: false,
    title: '',
    message: undefined,
    buttons: [{ text: 'OK' }],
    variant: 'info',
  });
  const [presented, setPresented] = useState(false);
  const visibleRef = useRef(state.visible);
  visibleRef.current = state.visible;

  useEffect(() => {
    if (state.visible) setPresented(true);
  }, [state.visible]);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  const alert = useCallback(
    (title: string, message?: string, buttons?: PremiumAlertButton[]) => {
      setState({
        visible: true,
        title,
        message,
        buttons: buttons?.length ? buttons : [{ text: 'OK' }],
        variant: inferVariant(title, message),
      });
    },
    [],
  );

  const value = useMemo(() => ({ alert }), [alert]);

  const meta = VARIANT_META[state.variant];
  const resolvedButtons =
    state.buttons.length === 1 && !state.buttons[0]?.text
      ? [{ text: 'OK' }]
      : state.buttons;

  const handlePress = (button: PremiumAlertButton) => {
    close();
    button.onPress?.();
  };

  return (
    <PremiumAlertContext.Provider value={value}>
      {children}
      <Modal
        visible={presented}
        transparent
        animationType="none"
        onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <EaseView
            pointerEvents="none"
            style={styles.dim}
            animate={{ opacity: state.visible ? 1 : 0 }}
            transition={motion.overlay}
          />
          <EaseView
            initialAnimate={{ opacity: 0, scale: 0.88, translateY: 18 }}
            animate={{
              opacity: state.visible ? 1 : 0,
              scale: state.visible ? 1 : 0.92,
              translateY: state.visible ? 0 : 12,
            }}
            transition={motion.enter}
            onTransitionEnd={({ finished }) => {
              if (finished && !visibleRef.current) {
                setPresented(false);
              }
            }}>
            <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
              <EaseView
                style={[
                  styles.iconRing,
                  {
                    borderColor: meta.color,
                    backgroundColor: meta.glow,
                  },
                ]}
                initialAnimate={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...motion.snappy, delay: 80 }}
                useHardwareLayer>
                <AppIcon name={meta.icon} size={36} color={meta.color} />
              </EaseView>

              <Text style={styles.title}>{state.title}</Text>
              {state.message ? (
                <Text style={styles.message}>{state.message}</Text>
              ) : null}

              <View
                style={[
                  styles.actions,
                  resolvedButtons.length > 2 && styles.actionsStack,
                ]}>
                {resolvedButtons.map((button, index) => {
                  const isCancel = button.style === 'cancel';
                  const isDestructive = button.style === 'destructive';
                  const isPrimary =
                    !isCancel &&
                    (resolvedButtons.length === 1 ||
                      index === resolvedButtons.length - 1);

                  return (
                    <TouchableOpacity
                      key={`${button.text ?? 'btn'}-${index}`}
                      onPress={() => handlePress(button)}
                      style={[
                        styles.button,
                        resolvedButtons.length > 2 && styles.buttonFull,
                        isPrimary && styles.buttonPrimary,
                        isCancel && styles.buttonCancel,
                        isDestructive && styles.buttonDestructive,
                      ]}
                      activeOpacity={0.85}>
                      <Text
                        style={[
                          styles.buttonText,
                          isPrimary && styles.buttonTextPrimary,
                          isCancel && styles.buttonTextCancel,
                          isDestructive && styles.buttonTextDestructive,
                        ]}>
                        {button.text ?? 'OK'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Pressable>
          </EaseView>
        </Pressable>
      </Modal>
    </PremiumAlertContext.Provider>
  );
}

export function usePremiumAlert() {
  const ctx = useContext(PremiumAlertContext);
  if (!ctx) {
    throw new Error('usePremiumAlert must be used within PremiumAlertProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(3,10,5,0.78)',
  },
  card: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: colors.forest[800],
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.forest[600],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.silver[50],
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: colors.silver[400],
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionsStack: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.forest[600],
    backgroundColor: colors.forest[900],
  },
  buttonFull: {
    flex: 0,
    width: '100%',
  },
  buttonPrimary: {
    backgroundColor: colors.lime[500],
    borderColor: colors.lime[500],
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderColor: colors.forest[600],
  },
  buttonDestructive: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: colors.status.rejected,
  },
  buttonText: {
    color: colors.silver[300],
    fontSize: 14,
    fontWeight: '700',
  },
  buttonTextPrimary: {
    color: colors.forest[950],
  },
  buttonTextCancel: {
    color: colors.silver[400],
  },
  buttonTextDestructive: {
    color: colors.status.rejected,
  },
});
