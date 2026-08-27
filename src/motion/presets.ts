import type { Transition } from 'react-native-ease';

export const motion = {
  enter: {
    type: 'spring',
    damping: 18,
    stiffness: 160,
    mass: 0.9,
  } satisfies Transition,
  cascade: {
    type: 'timing',
    duration: 560,
    easing: 'easeOut',
  } satisfies Transition,
  snappy: {
    type: 'spring',
    damping: 20,
    stiffness: 320,
    mass: 0.8,
  } satisfies Transition,
  soft: {
    type: 'timing',
    duration: 320,
    easing: 'easeOut',
  } satisfies Transition,
  overlay: {
    type: 'timing',
    duration: 240,
    easing: 'easeOut',
  } satisfies Transition,
  loop: {
    type: 'timing',
    duration: 1100,
    easing: 'easeInOut',
    loop: 'reverse',
  } satisfies Transition,
  ambient: {
    type: 'timing',
    duration: 2800,
    easing: 'easeInOut',
    loop: 'reverse',
  } satisfies Transition,
  blink: {
    type: 'timing',
    duration: 520,
    easing: 'easeInOut',
    loop: 'reverse',
  } satisfies Transition,
  spin: {
    type: 'timing',
    duration: 14000,
    easing: 'linear',
    loop: 'repeat',
  } satisfies Transition,
};
