import { useState, useEffect } from 'react'
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { BookingFlowManager } from '@/components/booking/BookingFlowManager'
import type { Listing, User } from '@/lib/types'

export default function BookingScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const listingId = params.listingId as string

  const [listing, setListing] = useState<Listing | null>(null)
  const [provider, setProvider] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (listingId) {
      loadBookingData()
    }
  }, [listingId])

  const loadBookingData = async () => {
    try {
      setLoading(true)

      // Load listing details
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single()

      if (listingError) {
        console.error('Error loading listing:', listingError)
        Alert.alert('Error', 'Failed to load listing details')
        router.replace('/(tabs)/swipe')
        return
      }

      if (!listingData.booking_enabled) {
        Alert.alert('Booking Unavailable', 'This service is not available for online booking')
        router.replace('/(tabs)/swipe')
        return
      }

      setListing(listingData as Listing)

      // Load provider details
      const { data: providerData, error: providerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', listingData.user_id)
        .single()

      if (providerError) {
        console.error('Error loading provider:', providerError)
        Alert.alert('Error', 'Failed to load provider details')
        router.replace('/(tabs)/swipe')
        return
      }

      setProvider(providerData as User)

    } catch (error) {
      console.error('Error loading booking data:', error)
      Alert.alert('Error', 'Failed to load booking information')
      router.replace('/(tabs)/swipe')
    } finally {
      setLoading(false)
    }
  }

  const handleBookingComplete = (bookingId: string) => {
    // Navigation is handled by BookingFlowManager (redirects to dashboard)
    // This callback is just for any additional handling if needed
  }

  const handleCancel = () => {
    // Use replace instead of back to avoid navigation errors
    // Always use replace to ensure we have a valid route
    router.replace('/(tabs)/swipe')
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f25842" />
      </View>
    )
  }

  if (!listing || !provider) {
    return <View style={styles.container} />
  }

  return (
    <View style={styles.container}>
      <BookingFlowManager
        listing={listing}
        provider={provider}
        onComplete={handleBookingComplete}
        onCancel={handleCancel}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
})
