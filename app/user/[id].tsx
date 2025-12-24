import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator, Platform, Dimensions } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import type { User, Listing } from '@/lib/types'
import { getUserReviews } from '@/lib/utils/ratings'
import { formatRelativeTime, formatDate } from '@/lib/utils/date'
import { normalizePhotoUrls } from '@/lib/utils/images'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface Review {
  id: string
  reviewer_id: string
  reviewee_id: string
  job_id: string | null
  as_described: number
  timing: number
  communication: number
  cost: number
  performance: number
  review_text: string | null
  service_type: string
  created_at: string
  reviewer?: {
    id: string
    name: string
    avatar_url: string | null
  } | null
}

interface UserStats {
  totalReviews: number
  averageRating: number
  positivePercentage: number
  memberSince: string
  listingsCount: number
  responseRate?: number
}

// Star Rating Component
function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <Ionicons key={`full-${i}`} name="star" size={size} color="#fbbf24" />
      ))}
      {hasHalfStar && (
        <Ionicons key="half" name="star-half" size={size} color="#fbbf24" />
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Ionicons key={`empty-${i}`} name="star-outline" size={size} color="#d1d5db" />
      ))}
    </View>
  )
}

export default function UserProfileScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  useEffect(() => {
    if (id) {
      loadUserProfile()
    }
  }, [id])

  const loadUserProfile = async () => {
    try {
      setLoading(true)

      // Check if viewing own profile
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser?.id === id) {
        setIsOwnProfile(true)
      }

      // Load user data with rating fields
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          rating,
          total_reviews,
          positive_reviews,
          rating_as_described,
          rating_timing,
          rating_communication,
          rating_cost,
          rating_performance
        `)
        .eq('id', id)
        .single()

      if (userError || !userData) {
        console.error('Error loading user:', userError)
        // Use replace with fallback route instead of back
        router.replace('/(tabs)/swipe')
        return
      }

      setUser(userData as User)
      
      if (__DEV__) {
        console.log('👤 User data loaded:', {
          id: userData.id,
          name: userData.name,
          rating: (userData as any).rating,
          total_reviews: (userData as any).total_reviews,
          positive_reviews: (userData as any).positive_reviews,
        })
      }

      // Load reviews - use same logic as listing cards
      let reviewsData: Review[] = []
      let customerRating: number | undefined
      let positivePercentage: number | undefined
      
      try {
        // Query reviews the same way listing cards do
        const { data: reviews, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            *,
            reviewer:reviewer_id(id, name, avatar_url)
          `)
          .eq('reviewee_id', id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (reviewsError) {
          console.error('❌ Reviews query error:', reviewsError)
        } else if (reviews && reviews.length > 0) {
          reviewsData = reviews as Review[]
          setReviews(reviewsData)
          
          // Calculate rating the same way listing cards do
          // Check if reviews have a 'rating' column, otherwise calculate from individual fields
          const ratings = reviews.map((r: any) => {
            // If rating column exists, use it
            if (r.rating !== undefined && r.rating !== null) {
              return r.rating
            }
            // Otherwise calculate from individual rating fields
            return (r.as_described + r.timing + r.communication + r.cost + r.performance) / 5
          })
          
          const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
          customerRating = Math.round(avgRating * 10) / 10
          
          // Calculate positive percentage (4+ stars)
          const positiveCount = ratings.filter((r) => r >= 4).length
          positivePercentage = Math.round((positiveCount / ratings.length) * 100)
          
          console.log('✅ Loaded reviews:', reviewsData.length, 'rating:', customerRating, 'positive:', positivePercentage)
        } else {
          console.log('⚠️ No reviews found for user:', id)
          // Use fallback rating from user table or generate demo rating
          customerRating = (userData as any).rating || Math.round((Math.random() * 1.5 + 3.5) * 10) / 10
          positivePercentage = (userData as any).positive_reviews || Math.round(Math.random() * 20 + 80)
        }
      } catch (reviewError) {
        console.error('❌ Error loading reviews:', reviewError)
        // Use fallback
        customerRating = (userData as any).rating || 0
        positivePercentage = (userData as any).positive_reviews || 0
      }

      // Set stats using calculated values
      const finalStats: UserStats = {
        totalReviews: reviewsData.length,
        averageRating: customerRating || 0,
        positivePercentage: positivePercentage || 0,
        memberSince: userData.created_at,
        listingsCount: 0, // Will be updated below
      }
      
      setStats(finalStats)

      // Load active listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', id)
        .in('status', ['active', 'matched', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (listingsData) {
        // Normalize photos for each listing
        const listingsWithNormalizedPhotos = listingsData.map(listing => ({
          ...listing,
          photos: normalizePhotoUrls(listing.photos || []),
        }))
        setListings(listingsWithNormalizedPhotos as Listing[])
        
        if (stats) {
          setStats({ ...stats, listingsCount: listingsData.length })
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMessage = async () => {
    if (!user) return

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/(auth)/login')
      return
    }

    // Prevent messaging yourself
    if (authUser.id === user.id) {
      return
    }

    try {
      // Try to create or get a direct match between users
      const { getOrCreateDirectMatch, getOrCreateMatchForChat } = await import('@/lib/utils/matching')
      
      // First, try to use a listing if available (better context)
      if (listings.length > 0) {
        const result = await getOrCreateMatchForChat(authUser.id, listings[0].id)
        if (result.success && result.match) {
          router.push(`/chat/${result.match.id}`)
          return
        }
      }

      // Fallback to direct match (no listing required)
      const directResult = await getOrCreateDirectMatch(authUser.id, user.id)
      
      if (directResult.success && directResult.match) {
        router.push(`/chat/${directResult.match.id}`)
      } else {
        // Show error and fallback to messages
        if (__DEV__) {
          console.error('Failed to create match:', directResult.error)
        }
        router.push('/(tabs)/messages')
      }
    } catch (error) {
      console.error('Error in handleMessage:', error)
      router.push('/(tabs)/messages')
    }
  }

  const handleViewListing = (listingId: string) => {
    // Navigate to listing detail or show in modal
    router.push(`/listings/${listingId}`)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f25842" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-outline" size={64} color="#9ca3af" />
        <Text style={styles.errorText}>User not found</Text>
        <Pressable 
          style={styles.backButton} 
          onPress={() => {
            // Check if we can go back, otherwise navigate to swipe screen
            if (typeof router.canGoBack === 'function' && router.canGoBack()) {
              router.back()
            } else {
              // Fallback to swipe screen if no previous screen
              router.replace('/(tabs)/swipe')
            }
          }}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    )
  }

  // Use stats if available, otherwise show 0
  const displayRating = stats?.averageRating ?? 0
  const positivePercentage = stats?.positivePercentage ?? 0
  const totalReviews = stats?.totalReviews ?? 0
  
  // Debug log
  if (__DEV__) {
    console.log('📊 Profile Stats:', {
      displayRating,
      positivePercentage,
      totalReviews,
      reviewsCount: reviews.length,
      stats,
    })
  }

  return (
      <View style={styles.wrapper}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable 
          style={styles.backButton} 
          onPress={() => {
            // Check if we can go back, otherwise navigate to swipe screen
            if (typeof router.canGoBack === 'function' && router.canGoBack()) {
              router.back()
            } else {
              // Fallback to swipe screen if no previous screen
              router.replace('/(tabs)/swipe')
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.navTitle}>User Profile</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
        <View style={styles.headerContent}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#ffffff" />
            </View>
          )}
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{user.name || 'User'}</Text>
              {user.verification_status === 'verified' && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#a855f7" />
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              )}
              {user.verification_status === 'pro' && (
                <View style={styles.proBadge}>
                  <Ionicons name="star" size={14} color="#fbbf24" />
                  <Text style={styles.proBadgeText}>Pro</Text>
                </View>
              )}
            </View>
            {user.location_address && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                <Text style={styles.locationText}>{user.location_address}</Text>
              </View>
            )}
            {user.bio && (
              <Text style={styles.bio} numberOfLines={2}>
                {user.bio}
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <View style={styles.actionButtons}>
            <Pressable style={styles.messageButton} onPress={handleMessage}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#ffffff" />
              <Text style={styles.messageButtonText}>Message</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Stats Section - eBay Style */}
      <View style={styles.statsSection}>
        <View style={styles.statsCard}>
          <View style={styles.statsTopRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{positivePercentage}%</Text>
              <Text style={styles.statLabel}>Positive Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {reviews.length > 0 
                  ? reviews.filter((r: any) => {
                      const avg = r.rating || ((r.as_described + r.timing + r.communication + r.cost + r.performance) / 5)
                      return avg >= 4.5
                    }).length
                  : 0}/5
              </Text>
              <Text style={styles.statLabel}>Excellent Areas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalReviews}</Text>
              <Text style={styles.statLabel}>Total Reviews</Text>
            </View>
          </View>
          <View style={styles.statsBottomRow}>
            <StarRating rating={displayRating} size={20} />
            <Text style={styles.basedOnText}>Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</Text>
          </View>
        </View>
      </View>

      {/* Detailed Rating Breakdown */}
      {reviews.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rating Breakdown</Text>
          <View style={styles.ratingBreakdown}>
            {['as_described', 'timing', 'communication', 'cost', 'performance'].map((key) => {
              const ratings = reviews.map((r: any) => r[key]).filter((r: number) => r > 0)
              const avg = ratings.length > 0 
                ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
                : 0
              const label = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
              
              return (
                <View key={key} style={styles.ratingItem}>
                  <Text style={styles.ratingLabel}>{label}</Text>
                  <View style={styles.ratingBarContainer}>
                    <View style={styles.ratingBar}>
                      <View style={[styles.ratingBarFill, { width: `${(avg / 5) * 100}%` }]} />
                    </View>
                    <Text style={styles.ratingValue}>{avg.toFixed(1)}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* Recent Reviews */}
      {reviews.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          {reviews.slice(0, 10).map((review) => {
            const avgRating = (review.as_described + review.timing + review.communication + review.cost + review.performance) / 5
            return (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    {review.reviewer?.avatar_url ? (
                      <Image 
                        source={{ uri: review.reviewer.avatar_url }} 
                        style={styles.reviewerAvatar} 
                      />
                    ) : (
                      <View style={styles.reviewerAvatarPlaceholder}>
                        <Ionicons name="person" size={16} color="#6b7280" />
                      </View>
                    )}
                    <View>
                      <Text style={styles.reviewerName}>
                        {review.reviewer?.name || 'Anonymous'}
                      </Text>
                      <Text style={styles.reviewDate}>
                        {formatRelativeTime(review.created_at)}
                      </Text>
                    </View>
                  </View>
                  <StarRating rating={avgRating} size={14} />
                </View>
                {review.review_text && (
                  <Text style={styles.reviewText}>{review.review_text}</Text>
                )}
                {review.service_type && (
                  <Text style={styles.serviceType}>Service: {review.service_type}</Text>
                )}
              </View>
            )
          })}
        </View>
      )}

      {/* Active Listings */}
      {listings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Active Listings ({listings.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listingsScroll}>
            {listings.map((listing) => (
              <Pressable
                key={listing.id}
                style={styles.listingCard}
                onPress={() => handleViewListing(listing.id)}
              >
                {listing.photos && listing.photos.length > 0 && (
                  <Image
                    source={{ uri: listing.photos[0] }}
                    style={styles.listingImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.listingInfo}>
                  <Text style={styles.listingTitle} numberOfLines={2}>
                    {listing.title}
                  </Text>
                  {listing.budget_min && (
                    <Text style={styles.listingPrice}>
                      {listing.currency || 'GBP'} {listing.budget_min}
                      {listing.budget_max && ` - ${listing.budget_max}`}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Empty States */}
      {listings.length === 0 && (
        <View style={styles.emptySection}>
          <Ionicons name="list-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>No active listings</Text>
        </View>
      )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        paddingTop: 50,
      },
    }),
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  navSpacer: {
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#f25842',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f25842',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 10,
    color: '#7c3aed',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proBadgeText: {
    fontSize: 10,
    color: '#d97706',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
  },
  bio: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  actionButtons: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f25842',
    paddingVertical: 12,
    borderRadius: 8,
  },
  messageButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statsTopRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statsBottomRow: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 12,
  },
  basedOnText: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  ratingBreakdown: {
    gap: 12,
  },
  ratingItem: {
    gap: 6,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  ratingBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 4,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    minWidth: 40,
    textAlign: 'right',
  },
  reviewCard: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  reviewerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  reviewText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  serviceType: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  listingsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  listingCard: {
    width: 200,
    marginRight: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  listingImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f3f4f6',
  },
  listingInfo: {
    padding: 12,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  listingPrice: {
    fontSize: 14,
    color: '#f25842',
    fontWeight: '600',
  },
  emptySection: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginTop: 12,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9ca3af',
  },
})

