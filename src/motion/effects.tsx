import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { EaseView } from 'react-native-ease';
import { motion } from './presets';

type EffectProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function FloatView({
  children,
  style,
  distance = 7,
  duration = 2400,
}: EffectProps & { distance?: number; duration?: number }) {
  return (
    <EaseView
      style={style}
      initialAnimate={{ translateY: 0 }}
      animate={{ translateY: -distance }}
      transition={{
        type: 'timing',
        duration,
        easing: 'easeInOut',
        loop: 'reverse',
      }}>
      {children}
    </EaseView>
  );
}

export function PulseView({
  children,
  style,
  from = 0.96,
  to = 1.05,
  duration = 1100,
}: EffectProps & { from?: number; to?: number; duration?: number }) {
  return (
    <EaseView
      style={style}
      initialAnimate={{ scale: from }}
      animate={{ scale: to }}
      transition={{
        type: 'timing',
        duration,
        easing: 'easeInOut',
        loop: 'reverse',
      }}
      useHardwareLayer>
      {children}
    </EaseView>
  );
}

export function PopIn({
  children,
  style,
  delay = 0,
}: EffectProps & { delay?: number }) {
  return (
    <EaseView
      style={style}
      initialAnimate={{ opacity: 0, scale: 0.82, translateY: 10 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{ ...motion.enter, delay }}
      useHardwareLayer>
      {children}
    </EaseView>
  );
}
