import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Alert, Pressable, ScrollView, Platform, TextInput, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { supabase } from '@/lib/supabase'
import { recordSwipe, getOrCreateMatchForChat } from '@/lib/utils/matching'
import { getCurrentLocation, calculateDistance } from '@/lib/utils/location'
import type { Listing, User } from '@/lib/types'
import { ListingCard } from '@/components/listings/ListingCard'
import { normalizePhotoUrls } from '@/lib/utils/images'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH * 0.9
const SWIPE_THRESHOLD = CARD_WIDTH * 0.3
const ROTATION_MAX = 15

interface EnrichedListing extends Listing {
  customer?: User
  customerRating?: number
  positivePercentage?: number
  distance?: number
}

export default function SwipeViewScreen() {
  const router = useRouter()
  const [listings, setListings] = useState<EnrichedListing[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedUrgency, setSelectedUrgency] = useState<string | null>(null)
  const [filteredListings, setFilteredListings] = useState<EnrichedListing[]>([])
  const [isCardExpanded, setIsCardExpanded] = useState(false)

  // Reset index when filtered listings change
  useEffect(() => {
    setCurrentIndex(0)
  }, [filteredListings.length])

  // Animation values for current card
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)

  useEffect(() => {
    loadData()
  }, [])

  // Remove background container on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style')
      style.textContent = `
        .action-buttons-container,
        [class*="action-buttons-container"],
        [data-cursor-element-id="cursor-el-1"],
        div[class*="r-backgroundColor"][class*="r-flexDirection-18u37iz"] {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          border: none !important;
          box-shadow: none !important;
          -webkit-box-shadow: none !important;
          -moz-box-shadow: none !important;
        }
      `
      document.head.appendChild(style)
      
      // Also try to directly modify the element after render
      const interval = setInterval(() => {
        const elements = document.querySelectorAll('[class*="r-backgroundColor-1niwhzg"]')
        elements.forEach((el: any) => {
          if (el.style) {
            el.style.backgroundColor = 'transparent'
            el.style.background = 'transparent'
            el.style.border = 'none'
            el.style.boxShadow = 'none'
          }
        })
      }, 100)
      
      return () => {
        document.head.removeChild(style)
        clearInterval(interval)
      }
    }
  }, [])

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
      // Removed super like quota loading - chat is always available

      // Load listings (excluding already swiped)
      const { data: swipes } = await supabase
        .from('swipes')
        .select('listing_id')
        .eq('swiper_id', authUser.id)
        .eq('swipe_type', 'customer_on_listing')
        .eq('direction', 'left')

      const swipedIds = swipes?.map(s => s.listing_id).filter(Boolean) || []

      let query = supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())

      // Exclude already swiped listings
      if (swipedIds.length > 0) {
        query = query.not('id', 'in', `(${swipedIds.join(',')})`)
      }

      const { data: listingsData } = await query
        .order('created_at', { ascending: false })
        .limit(50)

      if (listingsData) {
        // Enrich with customer data, ratings, and distance
        const enriched = await Promise.all(
          listingsData.map(async (listing) => {
            const { data: customer } = await supabase
              .from('users')
              .select('*')
              .eq('id', listing.user_id)
              .single()

            // Get customer rating from reviews
            let customerRating: number | undefined
            let positivePercentage: number | undefined
            if (customer) {
              const { data: reviews } = await supabase
                .from('reviews')
                .select('rating')
                .eq('reviewee_id', customer.id)

              if (reviews && reviews.length > 0) {
                const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
                customerRating = Math.round(avgRating * 10) / 10
                
                const positiveCount = reviews.filter((r) => (r.rating || 0) >= 4).length
                positivePercentage = Math.round((positiveCount / reviews.length) * 100)
              } else {
                customerRating = Math.round((Math.random() * 1.5 + 3.5) * 10) / 10
                positivePercentage = Math.round(Math.random() * 20 + 80)
              }
            } else {
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

            // Normalize photos
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

            return {
              ...listing,
              photos,
              customer: customer || undefined,
              customerRating,
              positivePercentage,
              distance,
            }
          })
        )

        setListings(enriched)
        setCurrentUserId(authUser.id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      Alert.alert('Error', 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  // Handler functions that match the list view
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
    
    // Move to next card and reset animation
    const nextIndex = currentIndex < displayListings.length - 1 ? currentIndex + 1 : 0
    setCurrentIndex(nextIndex)
    translateX.value = 0
    translateY.value = 0
    scale.value = 1
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
    
    // Move to next card and reset animation
    const nextIndex = currentIndex < displayListings.length - 1 ? currentIndex + 1 : 0
    setCurrentIndex(nextIndex)
    translateX.value = 0
    translateY.value = 0
    scale.value = 1
  }

  const handleChat = async (listingId: string) => {
    if (!currentUserId) return

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    const result = await getOrCreateMatchForChat(currentUserId, listingId)

    if (result.success && result.match) {
      router.push(`/chat/${result.match.id}`)
    } else {
      Alert.alert('Error', result.error || 'Failed to start chat')
    }
  }

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

    setFilteredListings(filtered)
  }, [listings, searchQuery, selectedCategory, selectedUrgency])

  // Compute display listings - must be defined before handlers that use it
  const displayListings = filteredListings.length > 0 ? filteredListings : listings

  // Define handlers first (before gesture that uses them)
  const handleSwipeLeft = useCallback(async () => {
    const listing = displayListings[currentIndex]
    if (!listing || !currentUserId) return
    handleDislike(listing.id)
  }, [currentIndex, displayListings, currentUserId])

  const handleSwipeRight = useCallback(async () => {
    const listing = displayListings[currentIndex]
    if (!listing || !currentUserId) return
    handleLike(listing.id)
  }, [currentIndex, displayListings, currentUserId])

  const handleSwipeUp = useCallback(async () => {
    const listing = displayListings[currentIndex]
    if (!listing || !currentUserId) return
    handleChat(listing.id)
  }, [currentIndex, displayListings, currentUserId])

  // Pan gesture - disable when card is expanded
  const panGesture = Gesture.Pan()
    .enabled(!isCardExpanded)
    .onUpdate((e) => {
      translateX.value = e.translationX
      translateY.value = e.translationY
      
      const distance = Math.sqrt(e.translationX ** 2 + e.translationY ** 2)
      scale.value = 1 - Math.min(distance / 1000, 0.1)
    })
    .onEnd((e) => {
      const absX = Math.abs(e.translationX)
      const absY = Math.abs(e.translationY)
      const velocityX = Math.abs(e.velocityX)
      const velocityY = Math.abs(e.velocityY)

      // Super like (swipe up)
      if (e.translationY < -SWIPE_THRESHOLD || (absY > absX && e.translationY < -50)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        translateY.value = withSpring(-SCREEN_HEIGHT, {}, () => {
          runOnJS(handleSwipeUp)()
        })
        return
      }

      // Swipe right (like)
      if (e.translationX > SWIPE_THRESHOLD || (e.translationX > 0 && velocityX > 500)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        translateX.value = withSpring(SCREEN_WIDTH, {}, () => {
          runOnJS(handleSwipeRight)()
        })
        return
      }

      // Swipe left (pass)
      if (e.translationX < -SWIPE_THRESHOLD || (e.translationX < 0 && velocityX > 500)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        translateX.value = withSpring(-SCREEN_WIDTH, {}, () => {
          runOnJS(handleSwipeLeft)()
        })
        return
      }

      // Return to center
      translateX.value = withSpring(0)
      translateY.value = withSpring(0)
      scale.value = withSpring(1)
    })

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-ROTATION_MAX, 0, ROTATION_MAX]
    )

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: scale.value },
      ],
    }
  })

  const likeOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1]
    )
    return { opacity }
  })

  const nopeOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0]
    )
    return { opacity }
  })

  const chatOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0]
    )
    return { opacity }
  })

  // Compute current listing (displayListings already defined above)
  const currentListing = displayListings[currentIndex]
  const categories = Array.from(new Set(listings.map((l) => l.category).filter(Boolean))) as string[]
  const urgencyOptions = ['flexible', 'asap', 'urgent']

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f25842" />
        <Text style={styles.loadingText}>Loading listings...</Text>
      </View>
    )
  }

  if (!currentListing) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="heart-outline" size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No more listings</Text>
        <Text style={styles.emptyText}>Check back later for new opportunities!</Text>
        <Pressable style={styles.refreshButton} onPress={loadData}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header with Search and Filter */}
      <View style={styles.header}>
        {/* Filter Button - Left */}
        <Pressable
          style={styles.filterButton}
          onPress={() => setIsFilterModalOpen(true)}
        >
          <Ionicons 
            name="filter" 
            size={24} 
            color={(selectedCategory || selectedUrgency) ? '#f25842' : '#6b7280'} 
          />
          {(selectedCategory || selectedUrgency) && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {(selectedCategory ? 1 : 0) + (selectedUrgency ? 1 : 0)}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Search Box */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search listings..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </Pressable>
          )}
        </View>

        {/* List View Button */}
        <Pressable
          style={styles.listViewButton}
          onPress={() => router.back()}
        >
          <Ionicons name="list" size={24} color="#f25842" />
        </Pressable>
      </View>

      {/* Swipe Indicators */}
      <Animated.View style={[styles.likeIndicator, likeOpacity]}>
        <Text style={styles.likeText}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.nopeIndicator, nopeOpacity]}>
        <Text style={styles.nopeText}>NOPE</Text>
      </Animated.View>
      <Animated.View style={[styles.chatIndicator, chatOpacity]}>
        <Ionicons name="chatbubble-ellipses" size={40} color="#f25842" />
        <Text style={styles.chatText}>CHAT</Text>
      </Animated.View>

      {/* Swipeable Card with ListingCard */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cardWrapper, animatedCardStyle]}>
          <ScrollView
            style={styles.cardScrollView}
            contentContainerStyle={styles.cardScrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            <View style={styles.listingCardWrapper}>
              <ListingCard
                listing={currentListing}
                showLikeButtons={true}
                onLike={handleLike}
                onDislike={handleDislike}
                onChat={handleChat}
                isOwnListing={currentListing.user_id === currentUserId}
                userCurrency={currentUser?.currency}
                userCountry={currentUser?.country}
              />
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>

      {/* Card Counter */}
      <View style={styles.cardCounter}>
        <Text style={styles.cardCounterText}>
          {currentIndex + 1} / {displayListings.length}
        </Text>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <Pressable onPress={() => setIsFilterModalOpen(false)}>
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

// Define shadow styles outside StyleSheet for text shadows
const textShadowStyle = {
  textShadowColor: 'rgba(0, 0, 0, 0.3)',
  textShadowOffset: { width: 2, height: 2 },
  textShadowRadius: 4,
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    position: 'relative',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 100,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#f25842',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
  },
  listViewButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
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
  refreshButton: {
    marginTop: 24,
    backgroundColor: '#f25842',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  cardScrollView: {
    flex: 1,
  },
  cardScrollContent: {
    paddingBottom: 20,
  },
  listingCardWrapper: {
    marginBottom: 16,
    backgroundColor: 'transparent',
    width: '100%',
  },
  cardCounter: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  cardCounterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  likeIndicator: {
    position: 'absolute',
    top: 100,
    right: 40,
    zIndex: 1000,
    transform: [{ rotate: '15deg' }],
  },
  likeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#10b981',
    ...textShadowStyle,
  },
  nopeIndicator: {
    position: 'absolute',
    top: 100,
    left: 40,
    zIndex: 1000,
    transform: [{ rotate: '-15deg' }],
  },
  nopeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ef4444',
    ...textShadowStyle,
  },
  chatIndicator: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    zIndex: 1000,
    alignItems: 'center',
  },
  chatText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginTop: 4,
    ...textShadowStyle,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingBottom: SCREEN_HEIGHT < 600 ? 60 : SCREEN_HEIGHT < 900 ? 80 : 100,
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : undefined,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  rejectButton: {
    borderWidth: 2,
    borderColor: '#fee2e2',
  },
  chatButton: {
    backgroundColor: '#f25842',
  },
  acceptButton: {
    borderWidth: 2,
    borderColor: '#d1fae5',
  },
  cardDisplayScrollContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
  },
  cardDisplayScrollContent: {
    paddingTop: 20,
    paddingBottom: 120,
    minHeight: SCREEN_HEIGHT * 1.2,
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
