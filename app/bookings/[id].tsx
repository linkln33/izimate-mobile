import { useEffect, useState } from 'react'
import { View, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { BookingDetails } from '@/components/booking/BookingDetails'
import type { Booking, Listing, User } from '@/lib/types'
import type { ServiceSettings } from '@/lib/utils/slot-calculator'

export default function BookingDetailsScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const [provider, setProvider] = useState<User | null>(null)
  const [customer, setCustomer] = useState<User | null>(null)
  const [serviceSettings, setServiceSettings] = useState<ServiceSettings | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBookingData()
  }, [id])

  const loadBookingData = async () => {
    if (!id) {
      Alert.alert('Error', 'Booking ID is required')
      router.back()
      return
    }

    try {
      setLoading(true)

      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        Alert.alert('Error', 'You must be logged in to view booking details')
        router.back()
        return
      }
      setCurrentUserId(authUser.id)

      // Load booking with related data
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          listing:listings(*),
          provider_profile:provider_profiles!provider_id(
            id,
            user:users!user_id(*)
          ),
          customer:users!customer_id(*)
        `)
        .eq('id', id)
        .single()

      if (bookingError || !bookingData) {
        console.error('Error loading booking:', bookingError)
        Alert.alert('Error', 'Booking not found')
        router.back()
        return
      }

      setBooking(bookingData as Booking)
      setListing(bookingData.listing as Listing)
      
      // Extract provider from provider_profile relation
      if (bookingData.provider_profile?.user) {
        setProvider(bookingData.provider_profile.user as User)
      }

      // Extract customer
      if (bookingData.customer) {
        setCustomer(bookingData.customer as User)
      }

      // Load service settings for cancellation policy
      if (bookingData.listing?.id) {
        const { data: settingsData } = await supabase
          .from('service_settings')
          .select('*')
          .eq('listing_id', bookingData.listing.id)
          .single()

        if (settingsData) {
          setServiceSettings(settingsData as ServiceSettings)
        }
      }

    } catch (error) {
      console.error('Error loading booking data:', error)
      Alert.alert('Error', 'Failed to load booking details')
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  const handleReschedule = () => {
    if (listing) {
      router.push(`/booking/${listing.id}`)
    }
  }

  const handleContact = () => {
    if (provider) {
      router.push(`/chat/${provider.id}`)
    }
  }

  const handleRate = () => {
    if (booking && provider) {
      // Navigate to review screen (you may need to create this)
      router.push(`/review?bookingId=${booking.id}&providerId=${provider.id}`)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f25842" />
      </View>
    )
  }

  if (!booking || !listing || !currentUserId) {
    return <View style={styles.container} />
  }

  return (
    <BookingDetails
      booking={booking}
      listing={listing}
      provider={provider}
      customer={customer}
      serviceSettings={serviceSettings}
      currentUserId={currentUserId}
      onCancel={handleCancel}
      onReschedule={handleReschedule}
      onContact={handleContact}
      onRate={handleRate}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
})

