import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  ViewStyle,
} from 'react-native';

type Props = {
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle | ViewStyle[];
  style?: ViewStyle;
};

/** Scrollable form that keeps fields visible when the keyboard opens. */
export const KeyboardScrollView = forwardRef<ScrollView, Props>(
  function KeyboardScrollView({ children, contentContainerStyle, style }, ref) {
    const scrollRef = useRef<ScrollView>(null);
    const offsetY = useRef(0);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const setScrollRef = useCallback(
      (node: ScrollView | null) => {
        scrollRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const scrollFocusedIntoView = useCallback(() => {
      const focused = RNTextInput.State.currentlyFocusedInput?.();
      const scroll = scrollRef.current;
      if (!focused || !scroll) return;

      focused.measureInWindow((_x, y, _w, height) => {
        scroll.measureInWindow((_sx, sy, _sw, sh) => {
          const margin = 24;
          const fieldBottom = y + height;
          const visibleBottom = sy + sh - margin;
          const overflowBottom = fieldBottom - visibleBottom;
          if (overflowBottom > 0) {
            scroll.scrollTo({
              y: offsetY.current + overflowBottom,
              animated: true,
            });
            return;
          }
          const overflowTop = sy + margin - y;
          if (overflowTop > 0) {
            scroll.scrollTo({
              y: Math.max(0, offsetY.current - overflowTop),
              animated: true,
            });
          }
        });
      });
    }, []);

    useEffect(() => {
      const showEvent =
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvent =
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

      const showSub = Keyboard.addListener(showEvent, e => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(scrollFocusedIntoView, Platform.OS === 'ios' ? 120 : 80);
      });
      const didShowSub =
        Platform.OS === 'ios'
          ? Keyboard.addListener('keyboardDidShow', () => {
              setTimeout(scrollFocusedIntoView, 40);
            })
          : null;
      const hideSub = Keyboard.addListener(hideEvent, () => {
        setKeyboardHeight(0);
      });

      return () => {
        showSub.remove();
        didShowSub?.remove();
        hideSub.remove();
      };
    }, [scrollFocusedIntoView]);

    return (
      <KeyboardAvoidingView
        style={[styles.flex, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={setScrollRef}
          contentContainerStyle={[
            styles.scroll,
            contentContainerStyle,
            { paddingBottom: 48 + keyboardHeight },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          onScroll={e => {
            offsetY.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  },
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
  },
});
