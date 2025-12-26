import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Image, Alert, ScrollView, Platform } from 'react-native'
import { useRouter, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { approveLike, rejectLike } from '@/lib/utils/approvals'
import { checkListingQuota } from '@/lib/utils/listings'
import { ListingCard } from '@/components/listings/ListingCard'
import type { Listing, User } from '@/lib/types'
import { normalizePhotoUrls } from '@/lib/utils/images'
import { pastelDesignSystem } from '@/lib/pastel-design-system'
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem

interface EnrichedListing extends Listing {
  customer?: User
  favoritesCount?: number
  likedByUsers?: Array<{ user: User; swipedAt: string }>
}

export default function OfferScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const [listings, setListings] = useState<EnrichedListing[]>([])
  const [loading, setLoading] = useState(true)
  const [quota, setQuota] = useState<any>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  // Ensure tab bar is visible when this screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Tab bar should automatically show for screens in (tabs) group
    })
    return unsubscribe
  }, [navigation])

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/(auth)/login')
        return
      }

      // Load quota
      const quotaData = await checkListingQuota(user.id)
      setQuota(quotaData)

      // Load listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!listingsData) {
        setLoading(false)
        return
      }

      // Load full user data for currency
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (userData) {
        setUser(userData as User)
      }

      // Batch fetch reviews for the user (all listings belong to same user)
          let customerRating: number | undefined
          let positivePercentage: number | undefined
      if (userData) {
            const { data: reviews } = await supabase
              .from('reviews')
              .select('rating')
          .eq('reviewee_id', userData.id)

            if (reviews && reviews.length > 0) {
              const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
              customerRating = Math.round(avgRating * 10) / 10
              
              const positiveCount = reviews.filter((r) => (r.rating || 0) >= 4).length
              positivePercentage = Math.round((positiveCount / reviews.length) * 100)
            }
          }

      // Batch fetch all swipes for all listings in one query
      const listingIds = listingsData.map(l => l.id)
      const { data: allSwipes } = await supabase
            .from('swipes')
        .select('listing_id, swiper_id, created_at, direction, swipe_type')
        .in('listing_id', listingIds)
            .in('direction', ['right', 'super'])

      // Batch fetch all matches for all listings
      const { data: allMatches } = await supabase
              .from('matches')
        .select('listing_id, customer_id')
        .in('listing_id', listingIds)

      // Get all unique customer IDs who liked any listing
      const allCustomerIds = [...new Set(
        allSwipes
          ?.filter(s => s.swipe_type === 'customer_on_listing' && s.direction === 'right')
          .map(s => s.swiper_id)
          .filter(Boolean) || []
      )]

      // Batch fetch all customer user data
      const { data: allCustomers } = allCustomerIds.length > 0
        ? await supabase
                .from('users')
                .select('id, name, avatar_url, verification_status')
            .in('id', allCustomerIds)
        : { data: null }

      // Create maps for fast lookup
      const swipesByListing = new Map<string, typeof allSwipes>()
      const matchesByListing = new Map<string, Set<string>>()
      
      if (allSwipes) {
        allSwipes.forEach(swipe => {
          if (!swipesByListing.has(swipe.listing_id)) {
            swipesByListing.set(swipe.listing_id, [])
          }
          swipesByListing.get(swipe.listing_id)!.push(swipe)
        })
      }

      if (allMatches) {
        allMatches.forEach(match => {
          if (!matchesByListing.has(match.listing_id)) {
            matchesByListing.set(match.listing_id, new Set())
          }
          matchesByListing.get(match.listing_id)!.add(match.customer_id)
        })
      }

      // Enrich listings (all in-memory, no more queries)
      const enriched = listingsData.map((listing) => {
        const listingSwipes = swipesByListing.get(listing.id) || []
        const listingMatches = matchesByListing.get(listing.id) || new Set()
        
        // Count favorites
        const favoritesCount = listingSwipes.filter(s => 
          s.direction === 'right' || s.direction === 'super'
        ).length

        // Get customers who liked (only pending ones)
        const customerSwipes = listingSwipes.filter(s => 
          s.swipe_type === 'customer_on_listing' && 
          s.direction === 'right' &&
          !listingMatches.has(s.swiper_id)
        )

        const likedByUsers: Array<{ user: User; swipedAt: string }> = customerSwipes
                  .map(swipe => {
            const userData = allCustomers?.find(u => u.id === swipe.swiper_id)
                    return userData ? {
                      user: userData as User,
                      swipedAt: swipe.created_at,
                    } : null
                  })
                  .filter(Boolean) as Array<{ user: User; swipedAt: string }>

          return {
            ...listing,
          customer: userData as User | undefined,
            customerRating,
            positivePercentage,
          favoritesCount,
            likedByUsers,
          }
        })

      setListings(enriched)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleApprove = useCallback(async (listingId: string, swipeId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Find the swipe ID from the likedByUsers
    const listing = listings.find(l => l.id === listingId)
    if (!listing || !listing.likedByUsers || listing.likedByUsers.length === 0) return

    // For now, we'll need to get the actual swipe ID
    // This is a simplified version - in production, you'd pass the swipe ID
    Alert.alert('Approve', 'This will create a match. Feature coming soon.')
  }, [listings])

  const handleReject = useCallback(async (listingId: string) => {
    Alert.alert('Reject', 'Feature coming soon.')
  }, [])

  const handleEdit = useCallback((listingId: string) => {
    router.push(`/listings/create?id=${listingId}`)
  }, [router])

  const handleDelete = useCallback((listingId: string) => {
    // Prevent multiple rapid clicks
    if (deleting === listingId) {
      console.log('⏳ Delete already in progress for listing:', listingId)
      return
    }

    console.log('🗑️ Delete button pressed for listing:', listingId)
    
    // Alert.alert doesn't work in web browsers, use window.confirm for web
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')
      if (confirmed) {
        console.log('✅ Delete confirmed, starting deletion...')
        performDelete(listingId)
      } else {
        console.log('❌ Delete cancelled')
      }
    } else {
      // Use requestAnimationFrame to ensure Alert is called after any pending renders
      requestAnimationFrame(() => {
        Alert.alert(
          'Delete Listing',
          'Are you sure you want to delete this listing? This action cannot be undone.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                console.log('✅ Delete confirmed, starting deletion...')
                performDelete(listingId)
              },
            },
          ]
        )
      })
    }
  }, [deleting, listings])

  const performDelete = useCallback(async (listingId: string) => {
    setDeleting(listingId)
    console.log('🗑️ Confirmed delete for listing:', listingId)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setDeleting(null)
        Alert.alert('Error', 'You must be logged in to delete listings.')
        return
      }

      console.log('👤 User ID:', user.id)
      console.log('📤 Deleting listing from database...')
      
      // First, verify the listing belongs to the user
      const { data: listingData, error: checkError } = await supabase
        .from('listings')
        .select('id, user_id')
        .eq('id', listingId)
        .single()

      if (checkError) {
        console.error('❌ Error checking listing:', checkError)
        setDeleting(null)
        Alert.alert('Error', 'Listing not found.')
        return
      }

      if (listingData.user_id !== user.id) {
        console.error('❌ User does not own this listing')
        setDeleting(null)
        Alert.alert('Error', 'You do not have permission to delete this listing.')
        return
      }

      // Delete the listing
      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('❌ Database error:', deleteError)
        console.error('❌ Error details:', JSON.stringify(deleteError, null, 2))
        setDeleting(null)
        Alert.alert('Error', `Failed to delete listing: ${deleteError.message || 'Unknown error'}`)
        return
      }

      console.log('✅ Listing deleted successfully')
      
      // Remove from local state immediately for better UX
      setListings(prevListings => prevListings.filter(l => l.id !== listingId))
      
      // Reload data to refresh stats and quota
      await loadData()
      
      setDeleting(null)
      Alert.alert('Success', 'Listing deleted successfully.')
    } catch (error: any) {
      console.error('❌ Error deleting listing:', error)
      console.error('❌ Error stack:', error?.stack)
      setDeleting(null)
      Alert.alert('Error', `Failed to delete listing: ${error?.message || 'Unknown error'}`)
    }
  }, [loadData])

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f25842" />
        <Text style={styles.loadingText}>Loading your listings...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>

      {/* Quota Info */}
      {quota && (
        <View style={styles.quotaContainer}>
          <Text style={styles.quotaText}>
            Listings: {quota.current}/{quota.limit} ({quota.remaining} remaining)
          </Text>
        </View>
      )}

      {/* Listings */}
      {listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="briefcase-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptyText}>Create your first listing to start offering services!</Text>
          <Pressable
            style={styles.createListingButton}
            onPress={() => router.push('/listings/create')}
          >
            <Text style={styles.createListingButtonText}>Create Listing</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          renderItem={({ item }) => {
            const likedBy = item.likedByUsers || []
            
            // Normalize photos array using shared utility
            const normalizedPhotos = normalizePhotoUrls(item.photos)
            
            const listingWithNormalizedPhotos = {
              ...item,
              photos: normalizedPhotos,
            }

            return (
              <View style={styles.listingCardWrapper}>
                <ListingCard 
                  listing={listingWithNormalizedPhotos}
                  showActions={true}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDeleting={deleting === item.id}
                />
                
                {/* Liked by section - separate container below card */}
                {likedBy.length > 0 && (
                  <View style={styles.likesContainer}>
                    <Text style={styles.likesTitle}>
                      {likedBy.length} customer{likedBy.length > 1 ? 's' : ''} liked this
                    </Text>
                    {likedBy.slice(0, 3).map((like, idx) => (
                      <View key={idx} style={styles.likeItem}>
                        {like.user.avatar_url ? (
                          <Image
                            source={{ uri: like.user.avatar_url }}
                            style={styles.likeAvatar}
                          />
                        ) : (
                          <View style={styles.likeAvatarPlaceholder}>
                            <Ionicons name="person" size={16} color="#6b7280" />
                          </View>
                        )}
                        <Text style={styles.likeName}>{like.user.name}</Text>
                        <View style={styles.likeActions}>
                          <Pressable
                            style={styles.approveButton}
                            onPress={() => handleApprove(item.id, '')}
                          >
                            <Ionicons name="checkmark" size={16} color="#10b981" />
                          </Pressable>
                          <Pressable
                            style={styles.rejectButton}
                            onPress={() => handleReject(item.id)}
                          >
                            <Ionicons name="close" size={16} color="#ef4444" />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Create New Listing Button - below each listing */}
                <Pressable
                  style={styles.createNewButton}
                  onPress={() => router.push('/listings/create')}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#f25842" />
                  <Text style={styles.createNewButtonText}>Create New Listing</Text>
                </Pressable>
              </View>
            )
          }}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadData}
          // Ensure content doesn't cover tab bar
          style={styles.list}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.background,
    paddingBottom: 0, // Tab bar will handle bottom spacing
    paddingTop: Platform.OS === 'ios' ? 50 : 12, // Add top padding for status bar
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: surfaces.onSurfaceVariant,
  },
  quotaContainer: {
    backgroundColor: pastelColors.warning[50],
    padding: spacing.md,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    ...elevation.level2,
  },
  quotaText: {
    fontSize: 14,
    color: surfaces.onSurface,
    textAlign: 'center',
    fontWeight: '500',
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
  likesContainer: {
    padding: spacing.lg,
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    ...elevation.level2,
  },
  likesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  likesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  likeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  likeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  likeAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeName: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  likeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
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
  createListingButton: {
    marginTop: spacing['2xl'],
    backgroundColor: pastelColors.primary[500],
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    ...elevation.level1,
  },
  createListingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: pastelColors.primary[300],
    borderStyle: 'dashed',
    ...elevation.level1,
  },
  createNewButtonText: {
    color: pastelColors.primary[500],
    fontSize: 16,
    fontWeight: '600',
  },
})
