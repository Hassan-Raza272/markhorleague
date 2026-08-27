import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = {
  name: string;
  size?: number;
  color?: string;
};

/** Typed wrapper around Material Community Icons (used by React Native Paper). */
export function AppIcon({ name, size = 24, color = '#A3CF2D' }: Props) {
  return <MaterialCommunityIcons name={name as never} size={size} color={color} />;
}

export { MaterialCommunityIcons };
