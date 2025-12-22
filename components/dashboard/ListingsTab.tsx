import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Image, ActivityIndicator, Platform, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { approveLike, rejectLike } from '@/lib/utils/approvals'
import { createShadowStyle } from '@/utils/shadowStyles'
import { ListingCard } from '@/components/listings/ListingCard'
import type { Listing, User } from '@/lib/types'
import { normalizePhotoUrls } from '@/lib/utils/images'

const getDimensions = () => Dimensions.get('window')

interface Props {
  listings: Listing[]
  onRefresh: () => void
  onNavigate: (tab: string) => void
}

export function ListingsTab({ listings, onRefresh, onNavigate }: Props) {
  const router = useRouter()
  const [likedByUsers, setLikedByUsers] = useState<Record<string, Array<{ user: User; swipedAt: string }>>>({})
  const [loading, setLoading] = useState(false)
  const [dimensions, setDimensions] = useState(getDimensions())

  // Listen for dimension changes (especially on web when window is resized)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window)
    })
    
    // On web, also listen to window resize
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleResize = () => {
        setDimensions(getDimensions())
      }
      window.addEventListener('resize', handleResize)
      return () => {
        subscription?.remove()
        window.removeEventListener('resize', handleResize)
      }
    }
    
    return () => {
      subscription?.remove()
    }
  }, [])

  useEffect(() => {
    loadLikedByUsers()
  }, [listings])

  const loadLikedByUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const likedBy: Record<string, Array<{ user: User; swipedAt: string }>> = {}

    for (const listing of listings) {
      const { data: swipes } = await supabase
        .from('swipes')
        .select('swiper_id, created_at')
        .eq('listing_id', listing.id)
        .eq('swipe_type', 'customer_on_listing')
        .eq('direction', 'right')
        .order('created_at', { ascending: false })

      if (swipes && swipes.length > 0) {
        const customerIds = swipes.map(s => s.swiper_id).filter(Boolean) as string[]

        // Check for existing matches
        const { data: existingMatches } = await supabase
          .from('matches')
          .select('customer_id')
          .eq('listing_id', listing.id)
          .in('customer_id', customerIds)

        const approvedIds = new Set(existingMatches?.map(m => m.customer_id) || [])
        const pendingIds = customerIds.filter(id => !approvedIds.has(id))

        if (pendingIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, name, avatar_url, verification_status')
            .in('id', pendingIds)

              if (users) {
                likedBy[listing.id] = swipes
                  .filter(s => pendingIds.includes(s.swiper_id))
                  .map(swipe => {
                    const userData = users.find(u => u.id === swipe.swiper_id)
                    return userData ? {
                      user: userData as User,
                      swipedAt: swipe.created_at,
                    } : null
                  })
                  .filter(Boolean) as Array<{ user: User; swipedAt: string }>
              }
        }
      }
    }

    setLikedByUsers(likedBy)
  }

  const handleApprove = async (listingId: string, swipeId: string) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const result = await approveLike(swipeId, user.id)
    if (result.success) {
      onRefresh()
    }
    setLoading(false)
  }

  const handleReject = async (listingId: string, swipeId: string) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await rejectLike(swipeId, user.id)
    onRefresh()
    setLoading(false)
  }

  if (listings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="briefcase-outline" size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No listings yet</Text>
        <Text style={styles.emptyText}>Create your first listing to get started!</Text>
        <Pressable
          style={styles.createButton}
          onPress={() => router.push('/listings/create')}
        >
          <Text style={styles.createButtonText}>Create Listing</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Listings</Text>
        <Pressable
          style={styles.createButton}
          onPress={() => router.push('/listings/create')}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.createButtonText}>New</Text>
        </Pressable>
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          Platform.OS === 'web' && { 
            maxWidth: Math.min(600, dimensions.width - 32),
            alignSelf: 'center',
            width: '100%',
          }
        ]}
        renderItem={({ item }) => {
          const likedBy = likedByUsers[item.id] || []
          
          // Normalize photos array using shared utility
          const normalizedPhotos = normalizePhotoUrls(item.photos)
          
          const listingWithNormalizedPhotos = {
            ...item,
            photos: normalizedPhotos,
          }

          return (
            <View style={[styles.listingCardWrapper, { maxWidth: Platform.OS === 'web' ? Math.min(600, dimensions.width - 32) : '100%' }]}>
              <ListingCard listing={listingWithNormalizedPhotos} />
              
              {/* Action buttons below the card */}
              <View style={styles.actionButtonsContainer}>
                {likedBy.length > 0 && (
                  <View style={styles.likesSection}>
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
                            onPress={() => handleReject(item.id, '')}
                          >
                            <Ionicons name="close" size={16} color="#ef4444" />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.listingActions}>
                  <Pressable
                    style={styles.editButton}
                    onPress={() => router.push(`/listings/${item.id}/edit`)}
                  >
                    <Ionicons name="create-outline" size={18} color="#6b7280" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )
        }}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={onRefresh}
      />
    </View>
  )
}

// Define shadow style outside StyleSheet.create() to avoid runtime issues
const listingCardShadow = createShadowStyle(0.1, 4, { width: 0, height: 2 }, '#000', 3)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f25842',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: '100%',
    }),
  },
  listingCardWrapper: {
    marginBottom: 16,
    backgroundColor: 'transparent',
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: '100%',
    }),
  },
  actionButtonsContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginTop: 12,
    ...listingCardShadow,
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
  listingActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
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
})
