import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Image,
  Pressable,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from './AppIcon';
import { colors } from '../constants/theme';

type Props = {
  visible: boolean;
  uri?: string | null;
  onClose: () => void;
};

export function ImagePreviewModal({ visible, uri, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible && !!uri}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close image"
        />
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            pointerEvents="none"
            accessibilityRole="image"
          />
        ) : null}
        <Pressable
          onPress={onClose}
          style={[styles.close, { top: Math.max(insets.top, 12) + 8 }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close">
          <AppIcon name="close" size={22} color={colors.silver[50]} />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  close: {
    position: 'absolute',
    zIndex: 2,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(11,61,46,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(163,207,45,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
