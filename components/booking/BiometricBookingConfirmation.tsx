import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { 
  authenticateForBooking, 
  isBiometricAvailable, 
  getBiometricTypeName,
  promptBiometricSetup
} from '@/lib/utils/biometric-auth'

interface BiometricBookingConfirmationProps {
  serviceName: string
  providerName: string
  price: number
  currency: string
  date: string
  time: string
  onConfirm: () => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function BiometricBookingConfirmation({
  serviceName,
  providerName,
  price,
  currency,
  date,
  time,
  onConfirm,
  onCancel,
  loading = false
}: BiometricBookingConfirmationProps) {
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricTypes, setBiometricTypes] = useState<string[]>([])
  const [authenticating, setAuthenticating] = useState(false)
  const [checkingBiometrics, setCheckingBiometrics] = useState(true)

  useEffect(() => {
    checkBiometricAvailability()
  }, [])

  const checkBiometricAvailability = async () => {
    try {
      const { isAvailable, biometricTypes } = await isBiometricAvailable()
      setBiometricAvailable(isAvailable)
      setBiometricTypes(biometricTypes)
    } catch (error) {
      console.error('Error checking biometric availability:', error)
      setBiometricAvailable(false)
    } finally {
      setCheckingBiometrics(false)
    }
  }

  const handleBiometricConfirm = async () => {
    if (authenticating || loading) return

    setAuthenticating(true)
    try {
      const result = await authenticateForBooking({
        serviceName,
        providerName,
        price,
        currency
      })

      if (result.success) {
        await onConfirm()
      } else if (result.error !== 'User cancelled') {
        Alert.alert('Authentication Failed', result.error || 'Please try again')
      }
    } catch (error) {
      console.error('Error during biometric confirmation:', error)
      Alert.alert('Error', 'Authentication failed. Please try again.')
    } finally {
      setAuthenticating(false)
    }
  }

  const handleManualConfirm = async () => {
    if (loading) {
      console.log('Confirm booking blocked: loading is true')
      return
    }

    console.log('Confirm Booking button pressed')
    
    try {
      console.log('Confirm Booking: Calling onConfirm callback')
      await onConfirm()
      console.log('Confirm Booking: onConfirm completed successfully')
    } catch (error) {
      console.error('Error confirming booking:', error)
      Alert.alert('Error', 'Failed to confirm booking. Please try again.')
    }
  }

  const handleSetupBiometrics = async () => {
    try {
      await promptBiometricSetup()
      // After showing setup prompt, recheck availability
      await checkBiometricAvailability()
    } catch (error) {
      console.error('Error in setup biometrics:', error)
      Alert.alert('Error', 'Failed to open biometric setup. Please check your device settings.')
    }
  }

  const getBiometricIcon = () => {
    if (biometricTypes.includes('Face ID')) {
      return 'scan-outline'
    } else if (biometricTypes.includes('Fingerprint')) {
      return 'finger-print-outline'
    }
    return 'shield-checkmark-outline'
  }

  const getBiometricLabel = () => {
    if (biometricTypes.length > 0) {
      return `Confirm with ${biometricTypes[0]}`
    }
    return `Confirm with ${getBiometricTypeName()}`
  }

  if (checkingBiometrics) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f25842" />
          <Text style={styles.loadingText}>Checking biometric availability...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Confirm Your Booking</Text>
        <Text style={styles.headerSubtitle}>Secure confirmation required</Text>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{serviceName}</Text>
          <Text style={styles.providerName}>with {providerName}</Text>
        </View>

        <View style={styles.bookingMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
            <Text style={styles.metaText}>{date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={20} color="#6b7280" />
            <Text style={styles.metaText}>{time}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="card-outline" size={20} color="#6b7280" />
            <Text style={styles.priceText}>{currency}{price}</Text>
          </View>
        </View>
      </View>

      <View style={styles.authSection}>
        {biometricAvailable ? (
          <>
            <View style={styles.biometricPrompt}>
              <View style={styles.biometricIcon}>
                <Ionicons 
                  name={getBiometricIcon() as any} 
                  size={48} 
                  color="#f25842" 
                />
              </View>
              <Text style={styles.biometricTitle}>
                {getBiometricLabel()}
              </Text>
              <Text style={styles.biometricDescription}>
                Use your biometric authentication to securely confirm this booking
              </Text>
            </View>

            <Pressable
              style={[styles.biometricButton, (authenticating || loading) && styles.buttonDisabled]}
              onPress={handleBiometricConfirm}
              disabled={authenticating || loading}
            >
              {authenticating || loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name={getBiometricIcon() as any} size={24} color="#ffffff" />
                  <Text style={styles.biometricButtonText}>
                    {getBiometricLabel()}
                  </Text>
                </>
              )}
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        ) : (
          <View style={styles.noBiometricPrompt}>
            <View style={styles.biometricIcon}>
              <Ionicons name="shield-outline" size={48} color="#6b7280" />
            </View>
            <Text style={styles.noBiometricTitle}>
              Biometric Authentication Unavailable
            </Text>
            <Text style={styles.noBiometricDescription}>
              Set up {getBiometricTypeName()} for faster booking confirmations
            </Text>
            
            <Pressable 
              style={styles.setupButton} 
              onPress={handleSetupBiometrics}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={20} color="#f25842" />
              <Text style={styles.setupButtonText}>Setup Biometrics</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          style={[styles.manualButton, loading && styles.buttonDisabled]}
          onPress={handleManualConfirm}
          disabled={loading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#f25842" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color="#f25842" />
              <Text style={styles.manualButtonText}>Confirm Booking</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable 
          style={[styles.cancelButton, loading && styles.buttonDisabled]} 
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.securityNote}>
        <Ionicons name="shield-checkmark" size={16} color="#10b981" />
        <Text style={styles.securityNoteText}>
          Your booking is secured with end-to-end encryption
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  bookingDetails: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
    textAlign: 'center',
  },
  providerName: {
    fontSize: 16,
    color: '#6b7280',
  },
  bookingMeta: {
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    fontSize: 16,
    color: '#374151',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f25842',
  },
  authSection: {
    flex: 1,
    justifyContent: 'center',
  },
  biometricPrompt: {
    alignItems: 'center',
    marginBottom: 32,
  },
  biometricIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  biometricTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  biometricDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f25842',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  noBiometricPrompt: {
    alignItems: 'center',
    marginBottom: 32,
  },
  noBiometricTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  noBiometricDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f25842',
    gap: 6,
  },
  setupButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f25842',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f25842',
    gap: 8,
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f25842',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actions: {
    marginTop: 24,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  securityNoteText: {
    fontSize: 12,
    color: '#10b981',
  },
})
