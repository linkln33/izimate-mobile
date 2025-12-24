import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Booking, User, Listing } from '@/lib/types'

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

interface QuickRebookingWidgetProps {
  userId: string
  maxItems?: number
}

export function QuickRebookingWidget({ userId, maxItems = 5 }: QuickRebookingWidgetProps) {
  const router = useRouter()
  const [rebookingItems, setRebookingItems] = useState<QuickRebookingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [rebookingLoading, setRebookingLoading] = useState<string | null>(null)

  useEffect(() => {
    loadRebookingOptions()
  }, [userId])

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#f25842" />
        <Text style={styles.loadingText}>Loading your favorites...</Text>
      </View>
    )
  }

  if (rebookingItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="refresh-outline" size={48} color="#d1d5db" />
        <Text style={styles.emptyTitle}>No rebooking options</Text>
        <Text style={styles.emptyText}>Complete some bookings to see quick rebooking options here</Text>
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
                    {item.lastBooking.currency || '$'}{item.lastBooking.service_price}
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
    backgroundColor: '#ffffff',
    marginVertical: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
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
    marginRight: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    padding: 16,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f25842',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  viewProviderButton: {
    padding: 4,
  },
  serviceInfo: {
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastBookingText: {
    fontSize: 12,
    color: '#6b7280',
  },
  bookingCountText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f25842',
  },
  rebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f25842',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rebookButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },
})
