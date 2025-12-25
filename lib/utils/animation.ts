/**
 * Animation Utilities
 * Standardized animation patterns using React Native Reanimated
 */

import { withTiming, withSpring, Easing } from 'react-native-reanimated'
import { animations } from '@/lib/theme'

export const animationPresets = {
  // Fade animations
  fadeIn: {
    opacity: withTiming(1, {
      duration: animations.normal,
      easing: Easing.out(Easing.ease),
    }),
  },
  fadeOut: {
    opacity: withTiming(0, {
      duration: animations.fast,
      easing: Easing.in(Easing.ease),
    }),
  },

  // Scale animations
  scaleIn: {
    transform: [{ scale: withSpring(1, { damping: 15, stiffness: 150 }) }],
  },
  scaleOut: {
    transform: [{ scale: withTiming(0.95, { duration: animations.fast }) }],
  },

  // Slide animations
  slideUp: {
    transform: [
      {
        translateY: withSpring(0, { damping: 15, stiffness: 150 }),
      },
    ],
  },
  slideDown: {
    transform: [
      {
        translateY: withTiming(100, { duration: animations.normal }),
      },
    ],
  },

  // Button press animations
  buttonPress: {
    transform: [{ scale: withTiming(0.95, { duration: animations.fast }) }],
  },
  buttonRelease: {
    transform: [{ scale: withSpring(1, { damping: 15, stiffness: 200 }) }],
  },
} as const

// Common animation durations
export const animationDurations = {
  fast: animations.fast,
  normal: animations.normal,
  slow: animations.slow,
} as const

// Easing functions
export const easingFunctions = {
  ease: Easing.ease,
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  linear: Easing.linear,
} as const

