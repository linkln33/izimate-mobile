import { useState } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { sendBookingConfirmation } from '@/lib/utils/booking-notifications'
import { BiometricBookingConfirmation } from './BiometricBookingConfirmation'
import { authenticateForBooking } from '@/lib/utils/biometric-auth'
import { formatCurrency } from '@/lib/utils/currency'
import { TrustSignals } from './TrustSignals'
import type { Listing, User } from '@/lib/types'

interface GuestCheckoutProps {
  listing: Listing
  provider: User
  selectedDate: string
  selectedTime: string
  serviceName: string
  servicePrice: number
  currency?: string
  onBookingComplete?: (bookingId: string) => void
  onCancel?: () => void
}

interface GuestInfo {
  name: string
  email: string
  phone: string
  notes?: string
}

export function GuestCheckout({
  listing,
  provider,
  selectedDate,
  selectedTime,
  serviceName,
  servicePrice,
  currency,
  onBookingComplete,
  onCancel
}: GuestCheckoutProps) {
  const finalCurrency = currency || listing.currency || 'GBP';
  const router = useRouter()
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showBiometricConfirmation, setShowBiometricConfirmation] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [emailOptIn, setEmailOptIn] = useState(false)

  const validateGuestInfo = () => {
    if (!guestInfo.name.trim()) {
      Alert.alert('Required Field', 'Please enter your name')
      return false
    }
    if (!guestInfo.email.trim()) {
      Alert.alert('Required Field', 'Please enter your email')
      return false
    }
    if (!guestInfo.phone.trim()) {
      Alert.alert('Required Field', 'Please enter your phone number')
      return false
    }
    if (!agreedToTerms) {
      Alert.alert('Terms Required', 'Please agree to the terms and conditions')
      return false
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(guestInfo.email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address')
      return false
    }

    // Basic phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(guestInfo.phone.replace(/\s/g, ''))) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number')
      return false
    }

    return true
  }

  const handleProceedToConfirmation = () => {
    if (validateGuestInfo()) {
      setShowBiometricConfirmation(true)
    }
  }

  const handleBiometricConfirmationCancel = () => {
    setShowBiometricConfirmation(false)
  }

  const handleCompleteBooking = async () => {
    if (!validateGuestInfo()) return

    setLoading(true)
    try {
      // Create a temporary guest user record
      const { data: guestUser, error: userError } = await supabase
        .from('guest_users')
        .insert({
          name: guestInfo.name,
          email: guestInfo.email,
          phone: guestInfo.phone,
          email_opt_in: emailOptIn,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (userError) {
        console.error('Error creating guest user:', userError)
        throw new Error('Failed to create guest user')
      }

      // Create the booking
      const bookingDateTime = new Date(`${selectedDate}T${selectedTime}`)
      const endDateTime = new Date(bookingDateTime.getTime() + 60 * 60 * 1000) // Default 1 hour duration

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          listing_id: listing.id,
          provider_id: provider.id,
          customer_id: guestUser.id,
          guest_booking: true,
          start_time: bookingDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          service_name: serviceName,
          service_price: servicePrice,
          currency: finalCurrency,
          status: 'pending',
          customer_notes: guestInfo.notes,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          metadata: {
            guest_info: guestInfo,
            booking_source: 'guest_checkout'
          }
        })
        .select()
        .single()

      if (bookingError) {
        console.error('Error creating booking:', bookingError)
        throw new Error('Failed to create booking')
      }

      // Send confirmation notifications
      await sendBookingConfirmation(
        booking,
        { ...guestUser, id: guestUser.id } as User,
        provider,
        listing
      )

      // Show success message
      Alert.alert(
        'Booking Confirmed! 🎉',
        `Your booking for "${serviceName}" has been confirmed. You'll receive a confirmation email at ${guestInfo.email}`,
        [
          {
            text: 'OK',
            onPress: () => {
              onBookingComplete?.(booking.id)
              setShowConfirmation(false)
            }
          }
        ]
      )

    } catch (error) {
      console.error('Error completing guest booking:', error)
      Alert.alert(
        'Booking Failed',
        'There was an error processing your booking. Please try again or contact support.',
        [
          { text: 'Try Again', style: 'default' },
          { text: 'Contact Support', onPress: () => {
            // Open support contact
          }}
        ]
      )
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = () => {
    const date = new Date(`${selectedDate}T${selectedTime}`)
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  const { date, time } = formatDateTime()

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={onCancel}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </Pressable>
          <Text style={styles.headerTitle}>Guest Checkout</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Booking Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          
          <View style={styles.summaryItem}>
            <Ionicons name="briefcase-outline" size={20} color="#6b7280" />
            <Text style={styles.summaryText}>{serviceName}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Ionicons name="person-outline" size={20} color="#6b7280" />
            <View style={styles.providerInfoContainer}>
              <Text style={styles.summaryText}>with {provider.name}</Text>
              <TrustSignals provider={provider} />
            </View>
          </View>
          
          <View style={styles.summaryItem}>
            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
            <Text style={styles.summaryText}>{date}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Ionicons name="time-outline" size={20} color="#6b7280" />
            <Text style={styles.summaryText}>{time}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Ionicons name="card-outline" size={20} color="#6b7280" />
            <Text style={styles.summaryPrice}>{formatCurrency(servicePrice, finalCurrency)}</Text>
          </View>
        </View>

        {/* Guest Information Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Your Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={guestInfo.name}
              onChangeText={(text) => setGuestInfo(prev => ({ ...prev, name: text }))}
              placeholder="Enter your full name"
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={guestInfo.email}
              onChangeText={(text) => setGuestInfo(prev => ({ ...prev, email: text }))}
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={guestInfo.phone}
              onChangeText={(text) => setGuestInfo(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={guestInfo.notes}
              onChangeText={(text) => setGuestInfo(prev => ({ ...prev, notes: text }))}
              placeholder="Any special requests or notes for the provider"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Checkboxes */}
        <View style={styles.checkboxCard}>
          <Pressable 
            style={styles.checkboxItem}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && <Ionicons name="checkmark" size={16} color="#ffffff" />}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the <Text style={styles.linkText}>Terms of Service</Text> and{' '}
              <Text style={styles.linkText}>Privacy Policy</Text> *
            </Text>
          </Pressable>

          <Pressable 
            style={styles.checkboxItem}
            onPress={() => setEmailOptIn(!emailOptIn)}
          >
            <View style={[styles.checkbox, emailOptIn && styles.checkboxChecked]}>
              {emailOptIn && <Ionicons name="checkmark" size={16} color="#ffffff" />}
            </View>
            <Text style={styles.checkboxText}>
              I'd like to receive updates and promotions via email
            </Text>
          </Pressable>
        </View>

        {/* Guest Benefits */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Why create an account?</Text>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.benefitText}>Track all your bookings in one place</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.benefitText}>Quick rebooking with saved preferences</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.benefitText}>Exclusive offers and discounts</Text>
          </View>
          
          <Pressable 
            style={styles.createAccountButton}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.createAccountText}>Create Account Instead</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <Pressable
          style={[styles.confirmButton, (!guestInfo.name || !guestInfo.email || !guestInfo.phone || !agreedToTerms) && styles.confirmButtonDisabled]}
          onPress={handleProceedToConfirmation}
          disabled={!guestInfo.name || !guestInfo.email || !guestInfo.phone || !agreedToTerms}
        >
          <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          <Ionicons name="arrow-forward" size={20} color="#ffffff" />
        </Pressable>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Confirm Your Booking</Text>
            <Pressable onPress={() => setShowConfirmation(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.confirmationSummary}>
              <Text style={styles.confirmationTitle}>{serviceName}</Text>
              <Text style={styles.confirmationProvider}>with {provider.name}</Text>
              <Text style={styles.confirmationDateTime}>{date} at {time}</Text>
              <Text style={styles.confirmationPrice}>{formatCurrency(servicePrice, finalCurrency)}</Text>
            </View>

            <View style={styles.confirmationDetails}>
              <Text style={styles.detailsTitle}>Your Details</Text>
              <Text style={styles.detailsText}>Name: {guestInfo.name}</Text>
              <Text style={styles.detailsText}>Email: {guestInfo.email}</Text>
              <Text style={styles.detailsText}>Phone: {guestInfo.phone}</Text>
              {guestInfo.notes && (
                <Text style={styles.detailsText}>Notes: {guestInfo.notes}</Text>
              )}
            </View>

            <View style={styles.confirmationNote}>
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text style={styles.noteText}>
                You'll receive a confirmation email with booking details and the provider's contact information.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable 
              style={styles.modalCancelButton}
              onPress={() => setShowConfirmation(false)}
            >
              <Text style={styles.modalCancelText}>Go Back</Text>
            </Pressable>
            <Pressable 
              style={[styles.modalConfirmButton, loading && styles.modalConfirmButtonDisabled]}
              onPress={handleCompleteBooking}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.modalConfirmText}>Complete Booking</Text>
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Biometric Confirmation Modal */}
      <Modal
        visible={showBiometricConfirmation}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleBiometricConfirmationCancel}
      >
        <BiometricBookingConfirmation
          serviceName={serviceName}
          providerName={provider.name}
          price={servicePrice}
          currency={finalCurrency}
          date={formatDateTime().date}
          time={formatDateTime().time}
          onConfirm={handleCompleteBooking}
          onCancel={handleBiometricConfirmationCancel}
          loading={loading}
        />
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 32,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#374151',
  },
  providerInfoContainer: {
    flex: 1,
    gap: 4,
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f25842',
  },
  formCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  checkboxCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#f25842',
    borderColor: '#f25842',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  linkText: {
    color: '#f25842',
    fontWeight: '600',
  },
  benefitsCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#6b7280',
  },
  createAccountButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  createAccountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f25842',
  },
  bottomAction: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f25842',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  confirmationSummary: {
    alignItems: 'center',
    marginBottom: 32,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmationProvider: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 8,
  },
  confirmationDateTime: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
  },
  confirmationPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f25842',
  },
  confirmationDetails: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  detailsText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  confirmationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalConfirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f25842',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
})
