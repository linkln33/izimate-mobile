/**
 * Haptic Feedback Utility
 * Provides tactile feedback for better user experience
 * Platform-safe: Works on iOS, Android, and Web (with fallback)
 */

import { Platform } from 'react-native';

// Dynamically import haptic feedback only on native platforms
let ReactNativeHapticFeedback: any = null;

if (Platform.OS !== 'web') {
  try {
    ReactNativeHapticFeedback = require('react-native-haptic-feedback').default;
  } catch (error) {
    console.warn('Haptic feedback not available:', error);
  }
}

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

/**
 * Trigger haptic feedback (platform-safe)
 * Falls back to no-op on web
 */
function triggerHaptic(type: string) {
  if (Platform.OS === 'web') {
    // Web doesn't support haptics, but we can use a visual feedback or no-op
    return;
  }

  if (ReactNativeHapticFeedback) {
    try {
      ReactNativeHapticFeedback.trigger(type, hapticOptions);
    } catch (error) {
      // Silently fail if haptics aren't available
      if (__DEV__) {
        console.warn('Haptic feedback failed:', error);
      }
    }
  }
}

/**
 * Trigger light impact haptic feedback
 * Use for: Button presses, taps, selections
 */
export function triggerLight() {
  triggerHaptic('impactLight');
}

/**
 * Trigger medium impact haptic feedback
 * Use for: Important actions, confirmations
 */
export function triggerMedium() {
  triggerHaptic('impactMedium');
}

/**
 * Trigger heavy impact haptic feedback
 * Use for: Critical actions, errors
 */
export function triggerHeavy() {
  triggerHaptic('impactHeavy');
}

/**
 * Trigger success haptic feedback
 * Use for: Successful actions, completions
 */
export function triggerSuccess() {
  triggerHaptic('notificationSuccess');
}

/**
 * Trigger warning haptic feedback
 * Use for: Warnings, cautions
 */
export function triggerWarning() {
  triggerHaptic('notificationWarning');
}

/**
 * Trigger error haptic feedback
 * Use for: Errors, failures
 */
export function triggerError() {
  triggerHaptic('notificationError');
}

/**
 * Trigger selection haptic feedback
 * Use for: Picker selections, switches
 */
export function triggerSelection() {
  triggerHaptic('selection');
}

