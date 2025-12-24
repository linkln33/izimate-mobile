import { useState, useEffect } from 'react'
import { View, StyleSheet, Alert, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { InAppBookingCalendar } from './InAppBookingCalendar'
import { GuestCheckout } from './GuestCheckout'
import { BiometricBookingConfirmation } from './BiometricBookingConfirmation'
import { authenticateForBooking } from '@/lib/utils/biometric-auth'
import type { Listing, User } from '@/lib/types'

interface BookingFlowManagerProps {
  listing: Listing
  provider: User
  initialStep?: 'calendar' | 'guest-checkout'
  onComplete?: (bookingId: string) => void
  onCancel?: () => void
}

type BookingStep = 'calendar' | 'guest-checkout' | 'user-checkout' | 'biometric-confirmation' | 'complete'

interface BookingSelection {
  date: string
  time: string
  serviceName: string
  servicePrice: number
  currency: string
}

export function BookingFlowManager({
  listing,
  provider,
  initialStep = 'calendar',
  onComplete,
  onCancel
}: BookingFlowManagerProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<BookingStep>(initialStep)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [bookingSelection, setBookingSelection] = useState<BookingSelection | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserAuth()
  }, [])

  const checkUserAuth = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        // Get full user profile
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (userData) {
          setCurrentUser(userData as User)
        }
      }
    } catch (error) {
      console.error('Error checking user auth:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCalendarSelection = (selection: {
    date: string
    time: string
    serviceName: string
    servicePrice: number
    currency?: string
  }) => {
    setBookingSelection({
      date: selection.date,
      time: selection.time,
      serviceName: selection.serviceName,
      servicePrice: selection.servicePrice,
      currency: selection.currency || listing.currency || 'GBP'
    })

    // If user is logged in, go to biometric confirmation, otherwise guest checkout
    if (currentUser) {
      setCurrentStep('biometric-confirmation')
    } else {
      // Show options: login, signup, or continue as guest
      Alert.alert(
        'Complete Your Booking',
        'How would you like to proceed?',
        [
          {
            text: 'Continue as Guest',
            onPress: () => setCurrentStep('guest-checkout')
          },
          {
            text: 'Sign In',
            onPress: () => router.push('/(auth)/login')
          },
          {
            text: 'Create Account',
            onPress: () => router.push('/(auth)/signup')
          }
        ]
      )
    }
  }

  const handleUserCheckout = async () => {
    if (!currentUser || !bookingSelection) return

    try {
      setLoading(true)
      
      // Create booking for logged-in user
      const bookingDateTime = new Date(`${bookingSelection.date}T${bookingSelection.time}`)
      const endDateTime = new Date(bookingDateTime.getTime() + 60 * 60 * 1000) // Default 1 hour

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          listing_id: listing.id,
          provider_id: provider.id,
          customer_id: currentUser.id,
          start_time: bookingDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          service_name: bookingSelection.serviceName,
          service_price: bookingSelection.servicePrice,
          currency: bookingSelection.currency,
          status: 'pending',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
        .select()
        .single()

      if (error) throw error

      Alert.alert(
        'Booking Confirmed! 🎉',
        `Your booking for "${bookingSelection.serviceName}" has been confirmed.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onComplete?.(booking.id)
              setCurrentStep('complete')
            }
          }
        ]
      )

    } catch (error) {
      console.error('Error creating user booking:', error)
      Alert.alert('Error', 'Failed to create booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGuestBookingComplete = (bookingId: string) => {
    onComplete?.(bookingId)
    setCurrentStep('complete')
  }

  const handleBackToCalendar = () => {
    setBookingSelection(null)
    setCurrentStep('calendar')
  }

  const handleCancel = () => {
    setBookingSelection(null)
    setCurrentStep('calendar')
    onCancel?.()
  }

  if (loading && currentStep !== 'guest-checkout') {
    return <View style={styles.container} />
  }

  switch (currentStep) {
    case 'calendar':
      return (
        <InAppBookingCalendar
          listing={listing}
          provider={provider}
          onBookingSelect={(selection) => {
            // Handle calendar selection for flow continuation
            handleCalendarSelection({
              date: selection.date,
              time: selection.time,
              serviceName: selection.serviceName,
              servicePrice: selection.servicePrice,
              currency: selection.currency || listing.currency || 'GBP',
              durationMinutes: selection.durationMinutes || 60
            });
          }}
          onClose={handleCancel}
        />
      )

    case 'guest-checkout':
      if (!bookingSelection) {
        setCurrentStep('calendar')
        return null
      }
      
      return (
        <GuestCheckout
          listing={listing}
          provider={provider}
          selectedDate={bookingSelection.date}
          selectedTime={bookingSelection.time}
          serviceName={bookingSelection.serviceName}
          servicePrice={bookingSelection.servicePrice}
          currency={bookingSelection.currency}
          onBookingComplete={handleGuestBookingComplete}
          onCancel={handleBackToCalendar}
        />
      )

    case 'biometric-confirmation':
      if (!bookingSelection || !currentUser) {
        setCurrentStep('calendar')
        return null
      }
      
      return (
        <BiometricBookingConfirmation
          serviceName={bookingSelection.serviceName}
          providerName={provider.name}
          price={bookingSelection.servicePrice}
          currency={bookingSelection.currency}
          date={new Date(bookingSelection.date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
          time={new Date(`${bookingSelection.date}T${bookingSelection.time}`).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
          onConfirm={handleUserCheckout}
          onCancel={handleBackToCalendar}
          loading={loading}
        />
      )

    case 'user-checkout':
      // This step is now handled by biometric confirmation
      return <View style={styles.container} />

    case 'complete':
      // Booking complete - could show a success screen
      return <View style={styles.container} />

    default:
      return <View style={styles.container} />
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
})
