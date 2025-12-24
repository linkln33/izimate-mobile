import { useState, useEffect } from 'react'
import { View, StyleSheet, Alert, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { InAppBookingCalendar } from './InAppBookingCalendar'
import { GuestCheckout } from './GuestCheckout'
import { BiometricBookingConfirmation } from './BiometricBookingConfirmation'
import { authenticateForBooking } from '@/lib/utils/biometric-auth'
import { sendBookingConfirmation } from '@/lib/utils/booking-notifications'
import { NativeCalendarService } from '@/lib/utils/native-calendar'
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
  serviceAddress?: string
  serviceAddressLat?: number
  serviceAddressLng?: number
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

  const handleUserCheckout = async (addressData?: { address: string; lat?: number; lng?: number }) => {
    if (!currentUser || !bookingSelection) return

    try {
      setLoading(true)
      
      // Update booking selection with address if provided
      const updatedSelection = addressData ? {
        ...bookingSelection,
        serviceAddress: addressData.address,
        serviceAddressLat: addressData.lat,
        serviceAddressLng: addressData.lng,
      } : bookingSelection
      
      // Get provider profile ID (bookings.provider_id references provider_profiles.id, not users.id)
      // Use database function to get or create provider profile (bypasses RLS issues)
      let providerProfileId: string | null = null
      
      try {
        // Use database function to get or create provider profile
        // This function runs with SECURITY DEFINER, so it can bypass RLS
        const { data: profileData, error: functionError } = await supabase
          .rpc('get_provider_profile_id', { p_user_id: listing.user_id })

        if (functionError) {
          if (__DEV__) {
            console.error('❌ Error calling get_provider_profile_id function:', functionError)
          }
          // Fallback: try direct query
          const { data: providerProfile, error: profileError } = await supabase
            .from('provider_profiles')
            .select('id')
            .eq('user_id', listing.user_id)
            .maybeSingle()

          if (providerProfile) {
            providerProfileId = providerProfile.id
            if (__DEV__) {
              console.log('✅ Found provider profile via direct query:', providerProfileId)
            }
          } else {
            if (__DEV__) {
              console.error('❌ Provider profile not found for user_id:', listing.user_id)
            }
            Alert.alert(
              'Booking Error',
              'The service provider needs to complete their profile setup. Please contact the provider or try booking a different service.'
            )
            return
          }
        } else {
          providerProfileId = profileData as string
          if (__DEV__) {
            console.log('✅ Got provider profile ID from function:', providerProfileId)
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error('❌ Unexpected error getting provider profile:', error)
        }
        Alert.alert('Error', 'Failed to process booking. Please try again.')
        return
      }

      if (!providerProfileId) {
        if (__DEV__) {
          console.error('❌ No provider profile ID determined')
        }
        Alert.alert('Error', 'Unable to determine provider profile. Please contact support.')
        return
      }
      
      // Check if listing has auto_confirm enabled
      const { data: serviceSettings } = await supabase
        .from('service_settings')
        .select('auto_confirm')
        .eq('listing_id', listing.id)
        .single()

      const autoConfirm = serviceSettings?.auto_confirm ?? false
      const bookingStatus = autoConfirm ? 'confirmed' : 'pending'
      
      // Create booking for logged-in user
      const bookingDateTime = new Date(`${updatedSelection.date}T${updatedSelection.time}`)
      const endDateTime = new Date(bookingDateTime.getTime() + 60 * 60 * 1000) // Default 1 hour

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          listing_id: listing.id,
          provider_id: providerProfileId, // Use provider_profile.id, not user.id
          customer_id: currentUser.id,
          start_time: bookingDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          service_name: updatedSelection.serviceName,
          service_price: updatedSelection.servicePrice,
          currency: updatedSelection.currency,
          status: bookingStatus,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          service_address: updatedSelection.serviceAddress || null,
          service_address_lat: updatedSelection.serviceAddressLat || null,
          service_address_lng: updatedSelection.serviceAddressLng || null,
        })
        .select()
        .single()

      if (error) throw error

      // Send notifications to provider and customer
      try {
        if (bookingStatus === 'confirmed') {
          await sendBookingConfirmation(
            booking,
            currentUser,
            provider,
            listing
          )
        } else {
          // For pending bookings, send booking request notification
          const { sendBookingRequest } = await import('@/lib/utils/booking-notifications')
          await sendBookingRequest(
            booking,
            currentUser,
            provider,
            listing
          )
        }
      } catch (notifError) {
        console.warn('Failed to send booking notifications:', notifError)
        // Don't fail booking if notification fails
      }

      // Save event to user's calendar
      try {
        const calendarService = NativeCalendarService.getInstance()
        let hasPermission = await calendarService.hasPermissions()
        
        // Request permission if not granted
        if (!hasPermission) {
          hasPermission = await calendarService.requestPermissions()
        }
        
        if (hasPermission) {
          // Get user's calendars
          const calendars = await calendarService.getCalendars()
          
          // Find primary calendar or use first available
          const primaryCalendar = calendars.find(cal => cal.isPrimary) || calendars[0]
          
          if (primaryCalendar) {
            const statusNote = bookingStatus === 'pending' 
              ? '\n⚠️ Status: Pending - Waiting for provider confirmation'
              : '\n✅ Status: Confirmed'
            
            // Save event as tentative if booking is pending, busy if confirmed
            // This marks the event as "tentative" in the user's calendar when pending
            const eventAvailability: 'tentative' | 'busy' = bookingStatus === 'pending' ? 'tentative' : 'busy'
            
            await calendarService.createEvent(primaryCalendar.id, {
              title: `${bookingSelection.serviceName} with ${provider.name}${bookingStatus === 'pending' ? ' (Pending)' : ''}`,
              startDate: bookingDateTime,
              endDate: endDateTime,
              notes: `Service: ${bookingSelection.serviceName}\nProvider: ${provider.name}\nPrice: ${bookingSelection.currency}${bookingSelection.servicePrice}\nBooking ID: ${booking.id}${statusNote}`,
              location: listing.location_address || undefined,
              allDay: false,
              availability: eventAvailability, // Mark as tentative when pending
            })
            
            if (__DEV__) {
              console.log(`✅ Calendar event saved as ${eventAvailability} for ${bookingStatus} booking`)
            }
          }
        }
      } catch (calendarError) {
        console.warn('Failed to save booking to calendar:', calendarError)
        // Don't fail booking if calendar save fails
      }

      // Call onComplete callback
      onComplete?.(booking.id)
      
      // Redirect to dashboard immediately
      router.replace('/(tabs)/dashboard')
      
      // Show success message (non-blocking, after navigation)
      const alertTitle = bookingStatus === 'confirmed' 
        ? 'Booking Confirmed! 🎉' 
        : 'Booking Request Sent! 📋'
      const alertMessage = bookingStatus === 'confirmed'
        ? `Your booking for "${bookingSelection.serviceName}" has been confirmed.`
        : `Your booking request for "${bookingSelection.serviceName}" has been sent. The provider will review and confirm your request.`

      // Show alert after navigation completes (non-blocking)
      setTimeout(() => {
        Alert.alert(alertTitle, alertMessage)
      }, 300)

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
          date={new Date(`${bookingSelection.date}T${bookingSelection.time}`).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
          time={new Date(`${bookingSelection.date}T${bookingSelection.time}`).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
          initialAddress={bookingSelection.serviceAddress}
          initialLat={bookingSelection.serviceAddressLat}
          initialLng={bookingSelection.serviceAddressLng}
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
