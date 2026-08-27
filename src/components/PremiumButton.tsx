import React, { useState } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Button, ButtonProps } from 'react-native-paper';
import { EaseView } from 'react-native-ease';
import { colors } from '../constants/theme';
import { motion } from '../motion';

interface PremiumButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
}

export function PremiumButton({
  variant = 'primary',
  style,
  contentStyle,
  labelStyle,
  disabled,
  ...props
}: PremiumButtonProps) {
  const [pressed, setPressed] = useState(false);
  const variantStyles = {
    primary: {
      buttonColor: colors.lime[500],
      textColor: colors.forest[950],
    },
    secondary: {
      buttonColor: colors.gold[500],
      textColor: colors.forest[950],
    },
    outline: {
      buttonColor: 'transparent',
      textColor: colors.lime[500],
    },
  };

  const v = variantStyles[variant];

  return (
    <View style={style as StyleProp<ViewStyle>}>
      <EaseView
        animate={{
          scale: pressed && !disabled ? 0.96 : 1,
          translateY: pressed && !disabled ? 2 : 0,
        }}
        transition={motion.snappy}>
        <Button
          mode={variant === 'outline' ? 'outlined' : 'contained'}
          buttonColor={v.buttonColor}
          textColor={v.textColor}
          disabled={disabled}
          style={[styles.button, variant === 'outline' && styles.outline]}
          contentStyle={[styles.content, contentStyle]}
          labelStyle={[styles.label, labelStyle]}
          {...props}
          onPressIn={event => {
            setPressed(true);
            props.onPressIn?.(event);
          }}
          onPressOut={event => {
            setPressed(false);
            props.onPressOut?.(event);
          }}
        />
      </EaseView>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    elevation: 3,
  },
  outline: {
    borderColor: colors.lime[500],
    borderWidth: 1.5,
  },
  content: {
    paddingVertical: 6,
  },
  label: {
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
