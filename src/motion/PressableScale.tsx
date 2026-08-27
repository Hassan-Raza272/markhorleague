import React, { useState } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { EaseView } from 'react-native-ease';
import { motion } from './presets';

type PressableScaleProps = PressableProps & {
  children?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  pressedScale?: number;
};

export function PressableScale({
  children,
  style,
  contentStyle,
  pressedScale = 0.97,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      {...rest}
      style={style}
      onPressIn={event => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={event => {
        setPressed(false);
        onPressOut?.(event);
      }}>
      <EaseView
        animate={{ scale: pressed ? pressedScale : 1 }}
        transition={motion.snappy}
        style={contentStyle}
        useHardwareLayer>
        {children}
      </EaseView>
    </Pressable>
  );
}
