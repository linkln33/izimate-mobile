import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Booking, User, Listing } from '@/lib/types'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { triggerLight, triggerSuccess } from '@/lib/utils/haptics'
import { getUserCurrency, formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { pastelDesignSystem } from '@/lib/pastel-design-system'
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem

interface QuickRebookingItem {
  id: string
  listing: {
    id: string
    title: string
    category: string
    booking_enabled?: boolean
  }
  provider: {
    id: string
    name: string
    avatar_url?: string
  }
  lastBooking: {
    id: string
    service_name?: string
    service_price?: number
    currency?: string
    updated_at: string
    rating?: number
  }
  bookingCount: number
}

interface UpcomingBooking {
  id: string
  start_time: string
  end_time: string
  service_name?: string
  service_price?: number
  currency?: string
  status: string
  listing: {
    id: string
    title: string
    category: string
  }
  provider: {
    id: string
    name: string
    avatar_url?: string
  }
}

interface QuickRebookingWidgetProps {
  userId: string
  maxItems?: number
}

export function QuickRebookingWidget({ userId, maxItems = 5 }: QuickRebookingWidgetProps) {
  const router = useRouter()
  const [rebookingItems, setRebookingItems] = useState<QuickRebookingItem[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [rebookingLoading, setRebookingLoading] = useState<string | null>(null)
  const [userCurrency, setUserCurrency] = useState<CurrencyCode>('GBP')

  // Get user's currency preference
  const loadUserCurrency = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('currency, country')
        .eq('id', userId)
        .single()

      if (userData) {
        const currency = getUserCurrency(userData.currency, userData.country)
        setUserCurrency(currency)
      }
    } catch (error) {
      console.error('Error loading user currency:', error)
    }
  }

  useEffect(() => {
    loadUserCurrency()
    loadRebookingOptions()
    loadUpcomingBookings()
  }, [userId])

  // Reload currency when screen comes into focus (e.g., after currency change)
  useFocusEffect(
    React.useCallback(() => {
      loadUserCurrency()
    }, [userId])
  )

  const loadRebookingOptions = async () => {
    try {
      setLoading(true)

      // Get completed bookings for this user, grouped by provider/listing
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          id,
          listing_id,
          provider_id,
          service_name,
          service_price,
          currency,
          updated_at,
          listing:listings(id, title, category, booking_enabled),
          provider:provider_profiles!provider_id(user:users!user_id(id, name, avatar_url))
        `)
        .eq('customer_id', userId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(50) // Get recent completed bookings

      if (error) {
        console.error('Error loading rebooking options:', error)
        return
      }

      // Group by provider and listing, keeping the most recent booking
      const groupedBookings = new Map<string, QuickRebookingItem>()

      bookingsData?.forEach((booking: any) => {
        const key = `${booking.provider_id}-${booking.listing_id}`
        
        if (!groupedBookings.has(key)) {
          groupedBookings.set(key, {
            id: key,
            listing: booking.listing,
            provider: booking.provider,
            lastBooking: {
              id: booking.id,
              service_name: booking.service_name,
              service_price: booking.service_price,
              currency: booking.currency,
              updated_at: booking.updated_at,
            },
            bookingCount: 1,
          })
        } else {
          const existing = groupedBookings.get(key)!
          existing.bookingCount++
          // Keep the most recent booking
          if (new Date(booking.updated_at) > new Date(existing.lastBooking.updated_at)) {
            existing.lastBooking = {
              id: booking.id,
              service_name: booking.service_name,
              service_price: booking.service_price,
              currency: booking.currency,
              updated_at: booking.updated_at,
            }
          }
        }
      })

      // Convert to array and sort by most recent booking
      const sortedItems = Array.from(groupedBookings.values())
        .filter(item => item.listing.booking_enabled) // Only show bookable services
        .sort((a, b) => new Date(b.lastBooking.updated_at).getTime() - new Date(a.lastBooking.updated_at).getTime())
        .slice(0, maxItems)

      setRebookingItems(sortedItems)
    } catch (error) {
      console.error('Failed to load rebooking options:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickRebook = async (item: QuickRebookingItem) => {
    setRebookingLoading(item.id)
    
    try {
      // Navigate to booking flow with pre-filled information
      router.push({
        pathname: `/booking/${item.listing.id}`,
        params: {
          serviceName: item.lastBooking.service_name,
          servicePrice: item.lastBooking.service_price,
          currency: item.lastBooking.currency,
          isRebooking: 'true',
          previousBookingId: item.lastBooking.id,
        }
      })
    } catch (error) {
      console.error('Error initiating rebooking:', error)
      Alert.alert('Error', 'Failed to start rebooking process. Please try again.')
    } finally {
      setRebookingLoading(null)
    }
  }

  const handleViewProvider = (providerId: string) => {
    router.push(`/providers/${providerId}`)
  }

  const loadUpcomingBookings = async () => {
    try {
      const now = new Date().toISOString()
      
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          service_name,
          service_price,
          currency,
          status,
          listing:listings(id, title, category),
          provider:provider_profiles!provider_id(user:users!user_id(id, name, avatar_url))
        `)
        .eq('customer_id', userId)
        .gte('start_time', now)
        .in('status', ['pending', 'confirmed'])
        .order('start_time', { ascending: true })
        .limit(maxItems)

      if (error) {
        console.error('Error loading upcoming bookings:', error)
        return
      }

      const formattedBookings = (bookingsData || []).map((booking: any) => ({
        id: booking.id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        service_name: booking.service_name,
        service_price: booking.service_price,
        currency: booking.currency,
        status: booking.status,
        listing: booking.listing || { id: '', title: 'Service', category: '' },
        provider: booking.provider?.user || { id: '', name: 'Unknown Provider', avatar_url: undefined },
      }))

      setUpcomingBookings(formattedBookings)
    } catch (error) {
      console.error('Failed to load upcoming bookings:', error)
    }
  }

  const formatLastBooking = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  const formatUpcomingDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    
    // Use local date components for accurate day calculation
    const dateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const nowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diffMs = dateLocal.getTime() - nowLocal.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    // For hours calculation, use actual time difference
    const diffHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) return 'Starting soon'
    if (diffHours < 24 && diffDays === 0) return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `In ${diffDays} days`
    if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''}`
    
    // Format as date using local date components
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const handleViewBooking = (bookingId: string) => {
    triggerLight()
    router.push(`/bookings/${bookingId}`)
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upcoming Bookings</Text>
          <Text style={styles.headerSubtitle}>Your scheduled appointments</Text>
        </View>
        <SkeletonLoader type="booking" count={3} />
      </View>
    )
  }

  // Show upcoming bookings if no rebooking options
  if (rebookingItems.length === 0) {
    if (upcomingBookings.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={surfaces.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>No upcoming bookings</Text>
          <Text style={styles.emptyText}>You don't have any upcoming bookings scheduled</Text>
        </View>
      )
    }

    // Show upcoming bookings
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upcoming Bookings</Text>
          <Text style={styles.headerSubtitle}>Your scheduled appointments</Text>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {upcomingBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <Pressable
                style={styles.cardContent}
                onPress={() => handleViewBooking(booking.id)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.providerInfo}>
                    <View style={styles.providerAvatar}>
                      <Text style={styles.providerInitial}>
                        {booking.provider.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.providerDetails}>
                      <Text style={styles.providerName} numberOfLines={1}>
                        {booking.provider.name}
                      </Text>
                      <Text style={styles.categoryText} numberOfLines={1}>
                        {booking.listing.category}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[styles.statusBadge, booking.status === 'confirmed' ? styles.statusConfirmed : styles.statusPending]}>
                    <Text style={styles.statusText}>
                      {booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName} numberOfLines={2}>
                    {booking.service_name || booking.listing.title}
                  </Text>
                  
                  <View style={styles.bookingMeta}>
                    <Ionicons name="time-outline" size={14} color="#6b7280" />
                    <Text style={styles.timeText}>
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </Text>
                  </View>

                  <View style={styles.bookingMeta}>
                    <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                    <Text style={styles.dateText}>
                      {formatUpcomingDate(booking.start_time)}
                    </Text>
                  </View>

                  {booking.service_price && (
                    <Text style={styles.priceText}>
                      {formatCurrency(booking.service_price, booking.currency || userCurrency)}
                    </Text>
                  )}
                </View>

                <View style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={16} color={pastelColors.secondary[600]} />
                </View>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Book Again</Text>
        <Text style={styles.headerSubtitle}>Your favorite services</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {rebookingItems.map((item) => (
          <View key={item.id} style={styles.rebookingCard}>
            <Pressable
              style={styles.cardContent}
              onPress={() => handleQuickRebook(item)}
              disabled={rebookingLoading === item.id}
            >
              <View style={styles.cardHeader}>
                <View style={styles.providerInfo}>
                  <View style={styles.providerAvatar}>
                    <Text style={styles.providerInitial}>
                      {item.provider.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.providerDetails}>
                    <Text style={styles.providerName} numberOfLines={1}>
                      {item.provider.name}
                    </Text>
                    <Text style={styles.categoryText} numberOfLines={1}>
                      {item.listing.category}
                    </Text>
                  </View>
                </View>
                
                <Pressable
                  style={styles.viewProviderButton}
                  onPress={() => handleViewProvider(item.provider.id)}
                >
                  <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                </Pressable>
              </View>

              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName} numberOfLines={2}>
                  {item.lastBooking.service_name || item.listing.title}
                </Text>
                
                <View style={styles.bookingMeta}>
                  <Text style={styles.lastBookingText}>
                    Last booked {formatLastBooking(item.lastBooking.updated_at)}
                  </Text>
                  {item.bookingCount > 1 && (
                    <Text style={styles.bookingCountText}>
                      • {item.bookingCount} times
                    </Text>
                  )}
                </View>

                {item.lastBooking.service_price && (
                  <Text style={styles.priceText}>
                    {formatCurrency(item.lastBooking.service_price, item.lastBooking.currency || userCurrency)}
                  </Text>
                )}
              </View>

              <View style={styles.rebookButton}>
                {rebookingLoading === item.id ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={16} color="#ffffff" />
                    <Text style={styles.rebookButtonText}>Book Again</Text>
                  </>
                )}
              </View>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: pastelColors.primary[100], // Light teal #E0FBFB
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingBottom: spacing.sm,
    ...elevation.level2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: pastelColors.primary[100], // Light teal #E0FBFB
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing['3xl'],
    backgroundColor: pastelColors.primary[100], // Light teal #E0FBFB
    borderRadius: borderRadius.lg,
    ...elevation.level2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: surfaces.onSurface,
    marginBottom: spacing.xxs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
  },
  scrollView: {
    paddingLeft: 20,
  },
  scrollContent: {
    paddingRight: 20,
    paddingBottom: 16,
  },
  rebookingCard: {
    width: 280,
    marginRight: spacing.lg,
    backgroundColor: pastelColors.primary[100], // Light teal #E0FBFB
    borderRadius: borderRadius.lg,
    ...elevation.level3,
  },
  cardContent: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: pastelColors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  providerInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.xxs,
  },
  categoryText: {
    fontSize: 11,
    color: surfaces.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  viewProviderButton: {
    padding: 4,
  },
  serviceInfo: {
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '500',
    color: surfaces.onSurface,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  lastBookingText: {
    fontSize: 12,
    color: surfaces.onSurfaceVariant,
  },
  bookingCountText: {
    fontSize: 12,
    color: surfaces.onSurfaceVariant,
    marginLeft: spacing.xs,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: surfaces.onSurface,
  },
  rebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.primary[400], // Slightly darker teal for better contrast
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rebookButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: pastelColors.primary[900], // Very dark teal for better contrast
    marginLeft: 6,
  },
  bookingCard: {
    width: 240,
    marginRight: spacing.md,
    backgroundColor: pastelColors.primary[100], // Light teal #E0FBFB
    borderRadius: borderRadius.lg,
    ...elevation.level3,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusPending: {
    backgroundColor: pastelColors.warning[100],
  },
  statusConfirmed: {
    backgroundColor: pastelColors.success[100],
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: surfaces.onSurface,
    textTransform: 'capitalize',
  },
  timeText: {
    fontSize: 12,
    color: surfaces.onSurfaceVariant,
    marginLeft: spacing.xs,
  },
  dateText: {
    fontSize: 12,
    color: surfaces.onSurfaceVariant,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: surfaces.outline,
    marginTop: spacing.sm,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: pastelColors.secondary[600],
    marginRight: spacing.xs,
  },
})
