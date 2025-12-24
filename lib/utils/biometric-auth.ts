import * as LocalAuthentication from 'expo-local-authentication'
import { Alert, Platform } from 'react-native'

export interface BiometricAuthResult {
  success: boolean
  error?: string
  biometricType?: string
}

/**
 * Check if biometric authentication is available on the device
 */
export async function isBiometricAvailable(): Promise<{
  isAvailable: boolean
  biometricTypes: string[]
  error?: string
}> {
  try {
    // Check if hardware is available
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    if (!hasHardware) {
      return {
        isAvailable: false,
        biometricTypes: [],
        error: 'Biometric hardware not available'
      }
    }

    // Check if biometrics are enrolled
    const isEnrolled = await LocalAuthentication.isEnrolledAsync()
    if (!isEnrolled) {
      return {
        isAvailable: false,
        biometricTypes: [],
        error: 'No biometrics enrolled'
      }
    }

    // Get available authentication types
    const authTypes = await LocalAuthentication.supportedAuthenticationTypesAsync()
    const biometricTypes = authTypes.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'Fingerprint'
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'Face ID'
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'Iris'
        default:
          return 'Biometric'
      }
    })

    return {
      isAvailable: true,
      biometricTypes
    }
  } catch (error) {
    console.error('Error checking biometric availability:', error)
    return {
      isAvailable: false,
      biometricTypes: [],
      error: 'Failed to check biometric availability'
    }
  }
}

/**
 * Authenticate user with biometrics
 */
export async function authenticateWithBiometrics(
  reason: string = 'Authenticate to confirm your booking'
): Promise<BiometricAuthResult> {
  try {
    // Check if biometrics are available
    const { isAvailable, biometricTypes, error } = await isBiometricAvailable()
    
    if (!isAvailable) {
      return {
        success: false,
        error: error || 'Biometric authentication not available'
      }
    }

    // Perform authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Password',
      disableDeviceFallback: false, // Allow fallback to device passcode
    })

    if (result.success) {
      return {
        success: true,
        biometricType: biometricTypes[0] // Return the primary biometric type
      }
    } else {
      let errorMessage = 'Authentication failed'
      
      if (result.error === 'user_cancel') {
        errorMessage = 'Authentication cancelled by user'
      } else if (result.error === 'user_fallback') {
        errorMessage = 'User chose to use device passcode'
      } else if (result.error === 'biometric_not_available') {
        errorMessage = 'Biometric authentication not available'
      } else if (result.error === 'biometric_not_enrolled') {
        errorMessage = 'No biometrics enrolled on device'
      } else if (result.error === 'passcode_not_set') {
        errorMessage = 'Device passcode not set'
      }

      return {
        success: false,
        error: errorMessage
      }
    }
  } catch (error) {
    console.error('Error during biometric authentication:', error)
    return {
      success: false,
      error: 'Biometric authentication failed'
    }
  }
}

/**
 * Get user-friendly biometric type name
 */
export function getBiometricTypeName(): string {
  if (Platform.OS === 'ios') {
    return 'Face ID or Touch ID'
  } else {
    return 'Fingerprint or Face Unlock'
  }
}

/**
 * Show biometric setup prompt if not available
 */
export async function promptBiometricSetup(): Promise<void> {
  const { isAvailable, error } = await isBiometricAvailable()
  
  if (!isAvailable) {
    const biometricName = getBiometricTypeName()
    
    Alert.alert(
      'Biometric Authentication',
      `${biometricName} is not set up on your device. Would you like to set it up in Settings for faster booking confirmations?`,
      [
        { text: 'Not Now', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            if (Platform.OS === 'ios') {
              // On iOS, we can't directly open biometric settings
              Alert.alert(
                'Setup Instructions',
                'Go to Settings > Face ID & Passcode (or Touch ID & Passcode) to set up biometric authentication.'
              )
            } else {
              // On Android, we can try to open security settings
              Alert.alert(
                'Setup Instructions',
                'Go to Settings > Security > Fingerprint or Face Unlock to set up biometric authentication.'
              )
            }
          }
        }
      ]
    )
  }
}

/**
 * Check if user has biometric authentication preference enabled
 */
export async function getBiometricPreference(): Promise<boolean> {
  try {
    // In a real app, you'd store this in secure storage or user preferences
    // For now, we'll just check if biometrics are available
    const { isAvailable } = await isBiometricAvailable()
    return isAvailable
  } catch (error) {
    console.error('Error getting biometric preference:', error)
    return false
  }
}

/**
 * Set user's biometric authentication preference
 */
export async function setBiometricPreference(enabled: boolean): Promise<void> {
  try {
    // In a real app, you'd store this in secure storage or user preferences
    // This is a placeholder for the preference storage logic
    console.log('Biometric preference set to:', enabled)
  } catch (error) {
    console.error('Error setting biometric preference:', error)
  }
}

/**
 * Authenticate for booking confirmation with fallback options
 */
export async function authenticateForBooking(
  bookingDetails: {
    serviceName: string
    providerName: string
    price: number
    currency: string
  }
): Promise<BiometricAuthResult> {
  const { serviceName, providerName, price, currency } = bookingDetails
  
  const reason = `Confirm booking for ${serviceName} with ${providerName} (${currency}${price})`
  
  // Try biometric authentication first
  const biometricResult = await authenticateWithBiometrics(reason)
  
  if (biometricResult.success) {
    return biometricResult
  }

  // If biometric fails, show fallback options
  return new Promise((resolve) => {
    Alert.alert(
      'Confirm Booking',
      `Please confirm your booking for:\n\n${serviceName}\nwith ${providerName}\n${currency}${price}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve({ success: false, error: 'User cancelled' })
        },
        {
          text: 'Confirm',
          onPress: () => resolve({ success: true })
        }
      ]
    )
  })
}
