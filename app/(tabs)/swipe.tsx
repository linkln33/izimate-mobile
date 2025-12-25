import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, Modal, Platform } from 'react-native'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { supabase } from '@/lib/supabase'
import { recordSwipe, getSuperLikeQuota } from '@/lib/utils/matching'
import { getCurrentLocation, calculateDistance } from '@/lib/utils/location'
import type { Listing, User, SuperLikeQuota } from '@/lib/types'
import { ListingCard } from '@/components/listings/ListingCard'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { normalizePhotoUrls } from '@/lib/utils/images'

interface EnrichedListing extends Listing {
  customer?: User
  customerRating?: number
  positivePercentage?: number
  distance?: number
}

export default function FindScreen() {
  const router = useRouter()
  const [listings, setListings] = useState<EnrichedListing[]>([])
  const [filteredListings, setFilteredListings] = useState<EnrichedListing[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [superLikeQuota, setSuperLikeQuota] = useState<SuperLikeQuota>({
    canSuperLike: true,
    used: 0,
    limit: 3,
    remaining: 3,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedUrgency, setSelectedUrgency] = useState<string | null>(null)
  // New filter states
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [maxDistance, setMaxDistance] = useState('')
  const [minRating, setMinRating] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  // Filter listings based on search and filters
  useEffect(() => {
    let filtered = [...listings]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (listing) =>
          listing.title?.toLowerCase().includes(query) ||
          listing.description?.toLowerCase().includes(query) ||
          listing.category?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((listing) => listing.category === selectedCategory)
    }

    // Urgency filter
    if (selectedUrgency) {
      filtered = filtered.filter((listing) => listing.urgency === selectedUrgency)
    }

    // Price filter
    if (minPrice) {
      const min = parseFloat(minPrice)
      filtered = filtered.filter(l => l.budget_min && l.budget_min >= min)
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice)
      filtered = filtered.filter(l => !l.budget_max || l.budget_max <= max)
    }

    // Distance filter
    if (maxDistance && userLocation) {
      const maxDist = parseFloat(maxDistance)
      filtered = filtered.filter(l => l.distance && l.distance <= maxDist)
    }

    // Rating filter
    if (minRating) {
      const minRat = parseFloat(minRating)
      filtered = filtered.filter(l => l.customerRating && l.customerRating >= minRat)
    }

    setFilteredListings(filtered)
  }, [listings, searchQuery, selectedCategory, selectedUrgency, minPrice, maxPrice, maxDistance, minRating, userLocation])

  const loadData = async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.replace('/(auth)/login')
        return
      }

      // Get user location
      try {
        const location = await getCurrentLocation()
        setUserLocation(location)
      } catch (error) {
        console.warn('Could not get location:', error)
      }

      // Load super like quota
      const quota = await getSuperLikeQuota(authUser.id)
      setSuperLikeQuota(quota)

      // Load ALL active listings with user data in one query (fixes N+1 problem)
      const { data: listingsData } = await supabase
        .from('listings')
        .select(`
          *,
          user:users!user_id(*)
        `)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (listingsData) {
        // Debug: log raw data
        console.log('Raw listings data:', listingsData.length, 'listings')
        if (listingsData.length > 0) {
          console.log('First listing photos:', listingsData[0].photos, 'Type:', typeof listingsData[0].photos)
        }
        
        // Get all unique user IDs for batch review query
        const userIds = [...new Set(listingsData.map((l: any) => l.user_id).filter(Boolean))]
        
        // Batch fetch all reviews for all users in one query
        const { data: allReviews } = await supabase
          .from('reviews')
          .select('reviewee_id, rating')
          .in('reviewee_id', userIds)

        // Create a map of user_id -> reviews for fast lookup
        const reviewsMap = new Map<string, number[]>()
        if (allReviews) {
          allReviews.forEach((review: any) => {
            if (!reviewsMap.has(review.reviewee_id)) {
              reviewsMap.set(review.reviewee_id, [])
            }
            reviewsMap.get(review.reviewee_id)!.push(review.rating)
          })
        }
        
        // Enrich listings with ratings and distance (all in-memory, no more queries)
        const enriched = listingsData.map((listing: any) => {
          const customer = listing.user as User | null
          
          // Get customer rating from reviews map
          let customerRating: number | undefined
          let positivePercentage: number | undefined
          if (customer) {
            const reviews = reviewsMap.get(customer.id) || []
            
            if (reviews.length > 0) {
              const avgRating = reviews.reduce((sum, r) => sum + (r || 0), 0) / reviews.length
              customerRating = Math.round(avgRating * 10) / 10 // Round to 1 decimal
              
              // Calculate positive percentage (4+ stars)
              const positiveCount = reviews.filter((r) => (r || 0) >= 4).length
              positivePercentage = Math.round((positiveCount / reviews.length) * 100)
            } else {
              // Generate random rating for demo listings (3.5 to 5.0)
              customerRating = Math.round((Math.random() * 1.5 + 3.5) * 10) / 10
              // Random positive percentage (80-100%)
              positivePercentage = Math.round(Math.random() * 20 + 80)
            }
          } else {
            // Generate random rating for demo listings when no customer data
            customerRating = Math.round((Math.random() * 1.5 + 3.5) * 10) / 10
            positivePercentage = Math.round(Math.random() * 20 + 80)
          }

          let distance: number | undefined
          if (userLocation && listing.location_lat && listing.location_lng) {
            distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              listing.location_lat,
              listing.location_lng
            )
          }

          // Ensure photos is always an array and filter out invalid values
          let photos: string[] = []
          if (listing.photos) {
            if (Array.isArray(listing.photos)) {
              photos = listing.photos.filter(
                (p: any) => p && typeof p === 'string' && p.trim().length > 0
              )
            } else if (typeof listing.photos === 'string') {
              try {
                const parsed = JSON.parse(listing.photos)
                if (Array.isArray(parsed)) {
                  photos = parsed.filter(
                    (p: any) => p && typeof p === 'string' && p.trim().length > 0
                  )
                } else {
                  photos = [listing.photos].filter(
                    (p: any) => p && typeof p === 'string' && p.trim().length > 0
                  )
                }
              } catch {
                if (listing.photos.trim().length > 0) {
                  photos = [listing.photos]
                }
              }
            }
          }
          
          // Normalize all photo URLs using shared utility
          photos = normalizePhotoUrls(photos)
          
          // Debug: log normalized URLs
          if (photos.length > 0) {
            console.log(`✅ Listing ${listing.id} normalized photos:`, photos[0])
          }
          
          // Debug log for photos (after normalization)
          if (photos.length > 0) {
            console.log(`✅ Listing ${listing.id} has ${photos.length} photo(s):`, photos[0])
          } else {
            console.log(`⚠️ Listing ${listing.id} has no valid photos. Raw photos:`, listing.photos)
          }

          // Check if this is the user's own listing
          const isOwnListing = listing.user_id === authUser.id

          return {
            ...listing,
            photos, // Normalize photos to always be an array
            customer: customer || undefined,
            customerRating,
            positivePercentage,
            distance,
            isOwnListing, // Add flag to identify own listings
          }
        })

        console.log('Enriched listings:', enriched.length)
        setListings(enriched)
        setCurrentUserId(authUser.id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (listingId: string) => {
    if (!currentUserId) return
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    
    const result = await recordSwipe(
      currentUserId,
      listingId,
      null,
      'customer_on_listing',
      'right'
    )

    if (result.match) {
      // Show match modal
      const { Alert } = await import('react-native')
      Alert.alert(
        'It\'s a Match!',
        'You matched with this listing. Start chatting!',
        [
          { text: 'Continue', style: 'cancel' },
          {
            text: 'View Match',
            onPress: () => router.push(`/chat/${result.match?.id}`),
          },
        ]
      )
    }

    // Refresh quota
    const quota = await getSuperLikeQuota(currentUserId)
    setSuperLikeQuota(quota)
    
    // Reload listings to update UI
    loadData()
  }

  const handleDislike = async (listingId: string) => {
    if (!currentUserId) return
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    
    await recordSwipe(
      currentUserId,
      listingId,
      null,
      'customer_on_listing',
      'left'
    )
    
    // Reload listings to update UI
    loadData()
  }

  const handleChat = async (listingId: string) => {
    if (!currentUserId) return

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Get or create match for chat
    const { getOrCreateMatchForChat } = await import('@/lib/utils/matching')
    const result = await getOrCreateMatchForChat(currentUserId, listingId)

    if (result.success && result.match) {
      // Navigate to chat
      router.push(`/chat/${result.match.id}`)
    } else {
      const { Alert } = await import('react-native')
      Alert.alert('Error', result.error || 'Failed to start chat')
    }

    if (result.match) {
      const { Alert } = await import('react-native')
      Alert.alert(
        'Super Match!',
        'You super liked and matched!',
        [
          { text: 'Continue', style: 'cancel' },
          {
            text: 'View Match',
            onPress: () => router.push(`/chat/${result.match?.id}`),
          },
        ]
      )
    }
    
    // Reload listings to update UI
    loadData()
  }

  const handleBookingComplete = (bookingId: string) => {
    console.log('Booking completed:', bookingId)
    // Optionally show a success message or navigate somewhere
    // You could also refresh the listings to update any booking status
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <SkeletonLoader type="card" count={3} />
      </View>
    )
  }

  // Get unique categories from listings
  const categories = Array.from(new Set(listings.map((l) => l.category).filter(Boolean))) as string[]
  const urgencyOptions = ['flexible', 'asap', 'urgent']

  const toggleFilter = (filterName: string) => {
    setExpandedFilter(expandedFilter === filterName ? null : filterName)
  }

  return (
    <View style={styles.container}>
      {/* Header with Search and Filter */}
      <View style={styles.header}>
        {/* Notification Bell */}
        <NotificationBell />

        {/* Search Box with Filter Button */}
        <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search listings..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
              underlineColorAndroid="transparent"
              selectionColor="#f25842"
          />
          {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6b7280" />
            </Pressable>
          )}
          </View>
          <Pressable
            style={styles.filterIconButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons 
              name={showFilters ? "funnel" : "funnel-outline"} 
              size={20} 
              color={showFilters ? "#f25842" : "#6b7280"} 
            />
          </Pressable>
        </View>

        {/* Swipe View Button */}
        <Pressable
          style={styles.swipeButton}
          onPress={() => router.push('/swipe-view')}
        >
          <Ionicons name="swap-horizontal" size={24} color="#f25842" />
        </Pressable>
      </View>

      {/* Collapsible Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Category Filter */}
          <View style={styles.filterPanel}>
            <Pressable 
              style={styles.filterHeader}
              onPress={() => toggleFilter('category')}
            >
              <Text style={styles.filterHeaderText}>Category</Text>
              <Ionicons 
                name={expandedFilter === 'category' ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#6b7280" 
              />
            </Pressable>
            {expandedFilter === 'category' && (
              <View style={styles.filterContent}>
                <View style={styles.categoryChips}>
                  <Pressable
                    style={[
                      styles.categoryChip,
                      selectedCategory === null && styles.categoryChipActive
                    ]}
                    onPress={() => setSelectedCategory(null)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory === null && styles.categoryChipTextActive
                    ]}>
                      All
                    </Text>
                  </Pressable>
                  {categories.map((category) => (
                    <Pressable
                      key={category}
                      style={[
                        styles.categoryChip,
                        selectedCategory === category && styles.categoryChipActive
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        selectedCategory === category && styles.categoryChipTextActive
                      ]}>
                        {category}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Price Filter */}
          <View style={styles.filterPanel}>
            <Pressable 
              style={styles.filterHeader}
              onPress={() => toggleFilter('price')}
            >
              <Text style={styles.filterHeaderText}>Price</Text>
              <Ionicons 
                name={expandedFilter === 'price' ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#6b7280" 
              />
            </Pressable>
            {expandedFilter === 'price' && (
              <View style={styles.filterContent}>
                <View style={styles.priceRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.filterLabel}>Min (£)</Text>
                    <TextInput
                      style={styles.filterInput}
                      value={minPrice}
                      onChangeText={setMinPrice}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.filterLabel}>Max (£)</Text>
                    <TextInput
                      style={styles.filterInput}
                      value={maxPrice}
                      onChangeText={setMaxPrice}
                      placeholder="1000"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Distance Filter */}
          <View style={styles.filterPanel}>
            <Pressable 
              style={styles.filterHeader}
              onPress={() => toggleFilter('distance')}
            >
              <Text style={styles.filterHeaderText}>Distance</Text>
              <Ionicons 
                name={expandedFilter === 'distance' ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#6b7280" 
              />
            </Pressable>
            {expandedFilter === 'distance' && (
              <View style={styles.filterContent}>
                <Text style={styles.filterLabel}>Max Distance (km)</Text>
                <TextInput
                  style={styles.filterInput}
                  value={maxDistance}
                  onChangeText={setMaxDistance}
                  placeholder="10"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
            )}
          </View>

          {/* Rating Filter */}
          <View style={styles.filterPanel}>
            <Pressable 
              style={styles.filterHeader}
              onPress={() => toggleFilter('rating')}
            >
              <Text style={styles.filterHeaderText}>Rating</Text>
              <Ionicons 
                name={expandedFilter === 'rating' ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#6b7280" 
              />
            </Pressable>
            {expandedFilter === 'rating' && (
              <View style={styles.filterContent}>
                <Text style={styles.filterLabel}>Minimum Rating</Text>
                <View style={styles.ratingButtons}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Pressable
                      key={rating}
                      style={[
                        styles.ratingButton,
                        minRating === rating.toString() && styles.ratingButtonActive
                      ]}
                      onPress={() => setMinRating(minRating === rating.toString() ? '' : rating.toString())}
                    >
                      <Ionicons 
                        name="star" 
                        size={16} 
                        color={minRating === rating.toString() ? '#ffffff' : '#f59e0b'} 
                      />
                      <Text style={[
                        styles.ratingButtonText,
                        minRating === rating.toString() && styles.ratingButtonTextActive
                      ]}>
                        {rating}+
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Urgency Filter */}
          <View style={styles.filterPanel}>
            <Pressable 
              style={styles.filterHeader}
              onPress={() => toggleFilter('urgency')}
            >
              <Text style={styles.filterHeaderText}>Urgency</Text>
              <Ionicons 
                name={expandedFilter === 'urgency' ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#6b7280" 
              />
            </Pressable>
            {expandedFilter === 'urgency' && (
              <View style={styles.filterContent}>
                <View style={styles.categoryChips}>
                  <Pressable
                    style={[
                      styles.categoryChip,
                      selectedUrgency === null && styles.categoryChipActive
                    ]}
                    onPress={() => setSelectedUrgency(null)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      selectedUrgency === null && styles.categoryChipTextActive
                    ]}>
                      All
                    </Text>
                  </Pressable>
                  {urgencyOptions.map((urgency) => (
                    <Pressable
                      key={urgency}
                      style={[
                        styles.categoryChip,
                        selectedUrgency === urgency && styles.categoryChipActive
                      ]}
                      onPress={() => setSelectedUrgency(urgency)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        selectedUrgency === urgency && styles.categoryChipTextActive
                      ]}>
                        {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Listings */}
      {filteredListings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No listings found</Text>
          <Text style={styles.emptyText}>Check back later for new opportunities!</Text>
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          renderItem={({ item }) => {
            // Normalize photo URLs - preserve R2 URLs
            const normalizePhotoUrl = (url: string): string => {
              if (!url || typeof url !== 'string') return ''
              // If already a full URL (http/https/data), return as is (preserves R2 URLs)
              if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
                return url
              }
              // If it's a relative path starting with /, convert to full URL
              if (url.startsWith('/')) {
                const baseUrl = 'https://www.izimate.com'
                return `${baseUrl}${url}`
              }
              // If it doesn't start with /, assume it's a filename and prepend /picture/
              return `https://www.izimate.com/picture/${url}`
            }
            
            // Normalize photos array
            const normalizedPhotos = item.photos && Array.isArray(item.photos)
              ? item.photos
                  .filter((p: any) => p && typeof p === 'string' && p.trim().length > 0)
                  .map((p: string) => normalizePhotoUrl(p.trim()))
              : []
            
            const listingWithNormalizedPhotos = {
              ...item,
              photos: normalizedPhotos,
            }

            return (
              <View style={styles.listingCardWrapper}>
                <ListingCard
                  listing={listingWithNormalizedPhotos}
                  showLikeButtons={true}
                  showBookingButton={true}
                  onLike={handleLike}
                  onDislike={handleDislike}
                  onChat={handleChat}
                  onBookingComplete={handleBookingComplete}
                  isOwnListing={item.user_id === currentUserId}
                  userCurrency={currentUser?.currency}
                  userCountry={currentUser?.country}
                />
              </View>
            )
          }}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadData}
          style={styles.list}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <Pressable onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </Pressable>
            </View>

            {/* Category Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Category</Text>
              <View style={styles.filterOptions}>
                <Pressable
                  style={[
                    styles.filterOption,
                    selectedCategory === null && styles.filterOptionActive,
                  ]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedCategory === null && styles.filterOptionTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                {categories.map((category) => (
                  <Pressable
                    key={category}
                    style={[
                      styles.filterOption,
                      selectedCategory === category && styles.filterOptionActive,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedCategory === category && styles.filterOptionTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Urgency Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Urgency</Text>
              <View style={styles.filterOptions}>
                <Pressable
                  style={[
                    styles.filterOption,
                    selectedUrgency === null && styles.filterOptionActive,
                  ]}
                  onPress={() => setSelectedUrgency(null)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedUrgency === null && styles.filterOptionTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                {urgencyOptions.map((urgency) => (
                  <Pressable
                    key={urgency}
                    style={[
                      styles.filterOption,
                      selectedUrgency === urgency && styles.filterOptionActive,
                    ]}
                    onPress={() => setSelectedUrgency(urgency)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedUrgency === urgency && styles.filterOptionTextActive,
                      ]}
                    >
                      {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Clear Filters Button */}
            {(selectedCategory || selectedUrgency) && (
              <Pressable
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSelectedCategory(null)
                  setSelectedUrgency(null)
                }}
              >
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
              </Pressable>
            )}

            {/* Apply Button */}
            <Pressable
              style={styles.applyButton}
              onPress={() => setIsFilterModalOpen(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  filterIconButton: {
    width: 48,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  swipeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding to ensure content doesn't cover tab bar
  },
  listingCardWrapper: {
    marginBottom: 16,
    backgroundColor: 'transparent',
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterOptionActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#f25842',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  filterOptionTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
  // Collapsible Filters
  filtersContainer: {
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterPanel: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
  },
  filterHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  filterContent: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 6,
  },
  filterInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryChipActive: {
    backgroundColor: '#f25842',
    borderColor: '#f25842',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  ratingButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ratingButtonActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  ratingButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  ratingButtonTextActive: {
    color: '#ffffff',
  },
  clearFiltersButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#f25842',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})
