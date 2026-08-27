import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { EaseView } from 'react-native-ease';
import { motion } from './presets';

type EnterViewProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  fromY?: number;
  fromX?: number;
  fromScale?: number;
  cascade?: boolean;
};

export function EnterView({
  children,
  style,
  delay = 0,
  fromY = 18,
  fromX = 0,
  fromScale = 1,
  cascade = false,
}: EnterViewProps) {
  return (
    <EaseView
      initialAnimate={{
        opacity: 0,
        translateY: fromY,
        translateX: fromX,
        scale: fromScale,
      }}
      animate={{ opacity: 1, translateY: 0, translateX: 0, scale: 1 }}
      transition={{ ...(cascade ? motion.cascade : motion.enter), delay }}
      style={style}>
      {children}
    </EaseView>
  );
}

export function StaggerItem({
  index,
  children,
  style,
}: {
  index: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <EnterView delay={Math.min(index, 10) * 55} fromY={14} style={style}>
      {children}
    </EnterView>
  );
}
