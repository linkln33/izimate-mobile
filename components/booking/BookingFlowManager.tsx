import { useState, useEffect } from 'react'
import { View, StyleSheet, Alert, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { UnifiedCalendar } from '../calendar'
import { RentalBookingCalendar } from '../listings/booking/RentalBookingCalendar'
import { SubscriptionBooking } from '../listings/booking/SubscriptionBooking'
import { ProjectBooking } from '../listings/booking/ProjectBooking'
import { GuestCheckout } from './GuestCheckout'
import { BiometricBookingConfirmation } from './BiometricBookingConfirmation'
import { authenticateForBooking } from '@/lib/utils/biometric-auth'
import { sendBookingConfirmation } from '@/lib/utils/booking-notifications'
import { NativeCalendarService } from '@/lib/utils/native-calendar'
import type { Listing, User } from '@/lib/types'
import type { AvailabilityPeriod } from '../listings/booking/RentalAvailabilityCalendar'

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
  time?: string // Optional for rentals (date range bookings)
  endDate?: string // For rental bookings
  serviceName: string
  servicePrice: number
  currency: string
  serviceAddress?: string
  serviceAddressLat?: number
  serviceAddressLng?: number
  duration?: number // For rental bookings (number of days)
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
  const [rentalAvailabilityPeriods, setRentalAvailabilityPeriods] = useState<AvailabilityPeriod[]>([])

  useEffect(() => {
    checkUserAuth()
    if (listing.listing_type === 'rental' && listing.booking_enabled) {
      loadRentalAvailability()
    }
  }, [listing.id])

  const loadRentalAvailability = async () => {
    try {
      const listingAny = listing as any
      if (listingAny.rental_availability_periods) {
        if (Array.isArray(listingAny.rental_availability_periods)) {
          setRentalAvailabilityPeriods(listingAny.rental_availability_periods)
        } else if (typeof listingAny.rental_availability_periods === 'string') {
          try {
            const parsed = JSON.parse(listingAny.rental_availability_periods)
            setRentalAvailabilityPeriods(Array.isArray(parsed) ? parsed : [])
          } catch {
            setRentalAvailabilityPeriods([])
          }
        }
      }
    } catch (error) {
      console.error('Error loading rental availability:', error)
    }
  }

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
    time?: string
    serviceName: string
    servicePrice: number
    currency?: string
    endDate?: string
    duration?: number
  }) => {
    setBookingSelection({
      date: selection.date,
      time: selection.time,
      endDate: selection.endDate,
      duration: selection.duration,
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

  const handleRentalBookingSelect = (selection: {
    startDate: string
    endDate: string
    duration: number
    totalPrice: number
  }) => {
    const listingAny = listing as any
    const rentalDurationType = listingAny.rental_duration_type || 'daily'
    
    // Get the appropriate rate
    let rate = 0
    switch (rentalDurationType) {
      case 'hourly':
        rate = listingAny.rental_rate_hourly || 0
        break
      case 'daily':
        rate = listingAny.rental_rate_daily || 0
        break
      case 'weekly':
        rate = listingAny.rental_rate_weekly || 0
        break
      case 'monthly':
        rate = listingAny.rental_rate_monthly || 0
        break
    }

    handleCalendarSelection({
      date: selection.startDate,
      endDate: selection.endDate,
      duration: selection.duration,
      serviceName: listing.title || 'Rental',
      servicePrice: selection.totalPrice,
      currency: listing.currency || 'GBP',
    })
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
      
      // Get service settings (auto_confirm and duration)
      const { data: serviceSettings } = await supabase
        .from('service_settings')
        .select('auto_confirm, default_duration_minutes, service_options')
        .eq('listing_id', listing.id)
        .maybeSingle()

      const autoConfirm = serviceSettings?.auto_confirm ?? false
      const bookingStatus = autoConfirm ? 'confirmed' : 'pending'
      
      // Get service duration from service_settings
      let serviceDuration = 60 // Default 1 hour
      if (serviceSettings) {
        // Try to find duration from service_options matching serviceName
        if (serviceSettings.service_options && Array.isArray(serviceSettings.service_options)) {
          const matchingService = serviceSettings.service_options.find(
            (opt: any) => opt.name === updatedSelection.serviceName
          )
          if (matchingService?.duration) {
            serviceDuration = matchingService.duration
          } else if (serviceSettings.default_duration_minutes) {
            serviceDuration = serviceSettings.default_duration_minutes
          }
        } else if (serviceSettings.default_duration_minutes) {
          serviceDuration = serviceSettings.default_duration_minutes
        }
      }
      
      // Create booking for logged-in user with correct duration
      const bookingDateTime = new Date(`${updatedSelection.date}T${updatedSelection.time}`)
      const endDateTime = new Date(bookingDateTime.getTime() + serviceDuration * 60 * 1000)

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
      // Show project booking for freelance (date-only, no time slots)
      if (listing.listing_type === 'freelance') {
        return (
          <ProjectBooking
            listing={listing}
            providerName={provider.name}
            onBookingSelect={(selection) => {
              setBookingSelection({
                date: selection.deliveryDate,
                time: '00:00', // Not relevant for projects
                serviceName: listing.title || 'Project',
                servicePrice: selection.price,
                currency: selection.currency,
                endDate: undefined,
                duration: undefined,
              })

              if (currentUser) {
                setCurrentStep('biometric-confirmation')
              } else {
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
            }}
            onClose={handleCancel}
            visible={true}
          />
        )
      }

      // Show subscription booking for subscriptions
      if (listing.listing_type === 'subscription') {
        return (
          <SubscriptionBooking
            listing={listing}
            providerName={provider.name}
            onBookingSelect={(selection) => {
              setBookingSelection({
                date: selection.startDate,
                time: '00:00', // Not relevant for subscriptions
                serviceName: listing.title || 'Subscription',
                servicePrice: selection.price,
                currency: selection.currency,
                // Store subscription-specific data
                endDate: undefined,
                duration: undefined,
              })

              if (currentUser) {
                setCurrentStep('biometric-confirmation')
              } else {
                Alert.alert(
                  'Complete Your Subscription',
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
            }}
            onClose={handleCancel}
            visible={true}
          />
        )
      }

      // Show rental calendar for rentals (date-range bookings)
      // Show UnifiedCalendar for services, experience, transportation (time-slot bookings)
      if (listing.listing_type === 'rental') {
        const listingAny = listing as any
        const rentalDurationType = listingAny.rental_duration_type || 'daily'
        
        // Get the appropriate rate
        let rate = 0
        switch (rentalDurationType) {
          case 'hourly':
            rate = listingAny.rental_rate_hourly || 0
            break
          case 'daily':
            rate = listingAny.rental_rate_daily || 0
            break
          case 'weekly':
            rate = listingAny.rental_rate_weekly || 0
            break
          case 'monthly':
            rate = listingAny.rental_rate_monthly || 0
            break
        }

        return (
          <RentalBookingCalendar
            listingId={listing.id}
            listingTitle={listing.title}
            providerId={listing.user_id}
            rentalDurationType={rentalDurationType}
            rentalRate={rate}
            currency={listing.currency || 'GBP'}
            availabilityPeriods={rentalAvailabilityPeriods}
            onBookingSelect={handleRentalBookingSelect}
            onClose={handleCancel}
            visible={true}
          />
        )
      }

      return (
        <UnifiedCalendar
          mode="booking"
          listingId={listing.id}
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
          visible={true}
          showTimeSlots={true}
          showServiceSelection={true}
          utility="getAvailableTimeSlots"
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
          endDate={bookingSelection.endDate}
          duration={bookingSelection.duration}
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
