import { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  ActivityIndicator, 
  Alert,
  RefreshControl,
  Modal,
  ScrollView
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Booking } from '@/lib/types'

interface BookingHistoryItem extends Booking {
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
}

interface BookingHistoryProps {
  userId: string
  showQuickActions?: boolean
}

type FilterType = 'all' | 'upcoming' | 'completed' | 'cancelled'

export function BookingHistory({ userId, showQuickActions = true }: BookingHistoryProps) {
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([])
  const [filteredBookings, setFilteredBookings] = useState<BookingHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all')
  const [selectedBooking, setSelectedBooking] = useState<BookingHistoryItem | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadBookings()
  }, [userId])

  useEffect(() => {
    filterBookings()
  }, [bookings, selectedFilter])

  const loadBookings = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          *,
          listing:listings(id, title, category, booking_enabled),
          provider:provider_profiles!provider_id(user:users!user_id(id, name, avatar_url))
        `)
        .eq('customer_id', userId)
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Error loading booking history:', error)
        Alert.alert('Error', 'Failed to load your booking history')
        return
      }

      setBookings((bookingsData || []) as BookingHistoryItem[])
    } catch (error) {
      console.error('Failed to load booking history:', error)
      Alert.alert('Error', 'Failed to load your booking history')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filterBookings = () => {
    const now = new Date()
    let filtered = bookings

    switch (selectedFilter) {
      case 'upcoming':
        filtered = bookings.filter(booking => 
          new Date(booking.start_time) > now && 
          ['pending', 'confirmed'].includes(booking.status)
        )
        break
      case 'completed':
        filtered = bookings.filter(booking => booking.status === 'completed')
        break
      case 'cancelled':
        filtered = bookings.filter(booking => 
          ['cancelled', 'no_show'].includes(booking.status)
        )
        break
      default:
        filtered = bookings
    }

    setFilteredBookings(filtered)
  }

  const handleQuickRebook = async (booking: BookingHistoryItem) => {
    if (!booking.listing.booking_enabled) {
      Alert.alert('Unavailable', 'This service is no longer available for booking')
      return
    }

    setActionLoading(booking.id)
    
    try {
      // Navigate to booking calendar with pre-filled information
      router.push({
        pathname: '/booking/calendar',
        params: {
          listingId: booking.listing.id,
          providerId: booking.provider.id,
          serviceName: booking.service_name,
          servicePrice: booking.service_price,
          currency: booking.currency,
          isRebooking: 'true',
          previousBookingId: booking.id,
        }
      })
    } catch (error) {
      console.error('Error initiating rebooking:', error)
      Alert.alert('Error', 'Failed to start rebooking process. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelBooking = async (booking: BookingHistoryItem) => {
    const bookingDate = new Date(booking.start_time)
    const now = new Date()
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilBooking < 24) {
      Alert.alert(
        'Late Cancellation',
        'Cancelling within 24 hours may result in a cancellation fee. Do you want to proceed?',
        [
          { text: 'Keep Booking', style: 'cancel' },
          { text: 'Cancel Anyway', style: 'destructive', onPress: () => confirmCancellation(booking) }
        ]
      )
    } else {
      confirmCancellation(booking)
    }
  }

  const confirmCancellation = async (booking: BookingHistoryItem) => {
    setActionLoading(booking.id)
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'customer'
        })
        .eq('id', booking.id)

      if (error) throw error

      // Update local state
      setBookings(prev => 
        prev.map(b => 
          b.id === booking.id 
            ? { ...b, status: 'cancelled' as const }
            : b
        )
      )

      Alert.alert('Success', 'Your booking has been cancelled')
      setShowBookingModal(false)
    } catch (error) {
      console.error('Error cancelling booking:', error)
      Alert.alert('Error', 'Failed to cancel booking. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewBookingDetails = (booking: BookingHistoryItem) => {
    setSelectedBooking(booking)
    setShowBookingModal(true)
  }

  const handleContactProvider = (providerId: string) => {
    router.push(`/chat/provider/${providerId}`)
  }

  const handleRateService = (booking: BookingHistoryItem) => {
    router.push(`/bookings/${booking.id}/rate`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b'
      case 'confirmed': return '#10b981'
      case 'completed': return '#6366f1'
      case 'cancelled': return '#ef4444'
      case 'no_show': return '#9ca3af'
      default: return '#6b7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline'
      case 'confirmed': return 'checkmark-circle-outline'
      case 'completed': return 'checkmark-done-circle'
      case 'cancelled': return 'close-circle-outline'
      case 'no_show': return 'alert-circle-outline'
      default: return 'help-circle-outline'
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const FilterTab = ({ filter, label, count }: { filter: FilterType, label: string, count: number }) => (
    <Pressable
      style={[styles.filterTab, selectedFilter === filter && styles.filterTabActive]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[styles.filterTabCount, selectedFilter === filter && styles.filterTabCountActive]}>
        {count}
      </Text>
      <Text style={[styles.filterTabText, selectedFilter === filter && styles.filterTabTextActive]}>
        {label}
      </Text>
    </Pressable>
  )

  const renderBookingItem = ({ item }: { item: BookingHistoryItem }) => {
    const { date, time } = formatDateTime(item.start_time)
    const isUpcoming = new Date(item.start_time) > new Date() && ['pending', 'confirmed'].includes(item.status)
    const canCancel = isUpcoming && item.status !== 'cancelled'
    const canRebook = item.status === 'completed' && item.listing.booking_enabled

    return (
      <Pressable
        style={styles.bookingCard}
        onPress={() => handleViewBookingDetails(item)}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <Text style={styles.serviceName} numberOfLines={1}>
              {item.service_name || item.listing.title}
            </Text>
            <Text style={styles.providerName} numberOfLines={1}>
              with {item.provider.name}
            </Text>
            <Text style={styles.categoryText}>{item.listing.category}</Text>
          </View>
          
          <View style={styles.bookingStatus}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Ionicons 
                name={getStatusIcon(item.status) as any} 
                size={14} 
                color={getStatusColor(item.status)} 
              />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.dateTimeInfo}>
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <Text style={styles.dateTimeText}>{date} at {time}</Text>
          </View>
          
          {item.service_price && (
            <View style={styles.priceInfo}>
              <Ionicons name="card-outline" size={16} color="#6b7280" />
              <Text style={styles.priceText}>
                {item.currency || '$'}{item.service_price}
              </Text>
            </View>
          )}
        </View>

        {showQuickActions && (
          <View style={styles.quickActions}>
            {canRebook && (
              <Pressable
                style={[styles.quickActionButton, styles.rebookButton]}
                onPress={() => handleQuickRebook(item)}
                disabled={actionLoading === item.id}
              >
                {actionLoading === item.id ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={16} color="#ffffff" />
                    <Text style={styles.quickActionText}>Book Again</Text>
                  </>
                )}
              </Pressable>
            )}
            
            {item.status === 'completed' && (
              <Pressable
                style={[styles.quickActionButton, styles.rateButton]}
                onPress={() => handleRateService(item)}
              >
                <Ionicons name="star-outline" size={16} color="#f59e0b" />
                <Text style={[styles.quickActionText, { color: '#f59e0b' }]}>Rate</Text>
              </Pressable>
            )}
            
            {canCancel && (
              <Pressable
                style={[styles.quickActionButton, styles.cancelButton]}
                onPress={() => handleCancelBooking(item)}
                disabled={actionLoading === item.id}
              >
                <Ionicons name="close" size={16} color="#ef4444" />
                <Text style={[styles.quickActionText, { color: '#ef4444' }]}>Cancel</Text>
              </Pressable>
            )}
          </View>
        )}
      </Pressable>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f25842" />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </View>
    )
  }

  const upcomingCount = bookings.filter(b => 
    new Date(b.start_time) > new Date() && ['pending', 'confirmed'].includes(b.status)
  ).length
  const completedCount = bookings.filter(b => b.status === 'completed').length
  const cancelledCount = bookings.filter(b => ['cancelled', 'no_show'].includes(b.status)).length

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Bookings</Text>
        <Text style={styles.headerSubtitle}>Manage your appointments</Text>
      </View>

      <View style={styles.filterTabs}>
        <FilterTab filter="all" label="All" count={bookings.length} />
        <FilterTab filter="upcoming" label="Upcoming" count={upcomingCount} />
        <FilterTab filter="completed" label="Completed" count={completedCount} />
        <FilterTab filter="cancelled" label="Cancelled" count={cancelledCount} />
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBookingItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBookings(true)}
            colors={['#f25842']}
            tintColor="#f25842"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No bookings found</Text>
            <Text style={styles.emptyStateText}>
              {selectedFilter === 'all' 
                ? 'You haven\'t made any bookings yet'
                : `No ${selectedFilter} bookings to display`}
            </Text>
          </View>
        }
      />

      {/* Booking Details Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBookingModal(false)}
      >
        {selectedBooking && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowBookingModal(false)}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {/* Modal content would go here - service details, provider info, etc. */}
              <Text style={styles.modalServiceName}>
                {selectedBooking.service_name || selectedBooking.listing.title}
              </Text>
              <Text style={styles.modalProviderName}>
                with {selectedBooking.provider.name}
              </Text>
              
              {/* Add more booking details as needed */}
            </ScrollView>
          </View>
        )}
      </Modal>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterTabActive: {
    backgroundColor: '#f25842',
    borderColor: '#f25842',
  },
  filterTabCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  filterTabCountActive: {
    color: '#ffffff',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  bookingStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDetails: {
    marginBottom: 12,
    gap: 8,
  },
  dateTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#374151',
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f25842',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  rebookButton: {
    backgroundColor: '#f25842',
  },
  rateButton: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  cancelButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
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
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalServiceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalProviderName: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 16,
  },
})
