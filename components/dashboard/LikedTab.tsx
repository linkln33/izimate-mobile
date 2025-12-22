import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { createShadowStyle } from '@/utils/shadowStyles'
import type { Listing, User } from '@/lib/types'

interface LikedListing extends Listing {
  customer?: User
  customerRating?: number
  swipedAt: string
}

export function LikedTab() {
  const router = useRouter()
  const [likedListings, setLikedListings] = useState<LikedListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLikedListings()
  }, [])

  const loadLikedListings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's right swipes
      const { data: swipes } = await supabase
        .from('swipes')
        .select('listing_id, created_at')
        .eq('swiper_id', user.id)
        .eq('direction', 'right')
        .eq('swipe_type', 'customer_on_listing')
        .order('created_at', { ascending: false })

      if (!swipes || swipes.length === 0) {
        setLoading(false)
        return
      }

      const listingIds = swipes.map(s => s.listing_id).filter(Boolean) as string[]

      // Fetch listings
      const { data: listings } = await supabase
        .from('listings')
        .select('*')
        .in('id', listingIds)
        .eq('status', 'active')

      if (!listings) {
        setLoading(false)
        return
      }

      // Enrich with customer data
      const enriched = await Promise.all(
        listings.map(async (listing) => {
          const swipe = swipes.find(s => s.listing_id === listing.id)
          const { data: customer } = await supabase
            .from('users')
            .select('*')
            .eq('id', listing.user_id)
            .single()

          return {
            ...listing,
            customer: customer || undefined,
            swipedAt: swipe?.created_at || listing.created_at,
          }
        })
      )

      setLikedListings(enriched)
    } catch (error) {
      console.error('Error loading liked listings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f25842" />
      </View>
    )
  }

  if (likedListings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No liked listings</Text>
        <Text style={styles.emptyText}>
          Start swiping to like listings you're interested in!
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Liked Listings</Text>
      <FlatList
        data={likedListings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const mainPhoto = item.photos && item.photos.length > 0 ? item.photos[0] : null

          return (
            <View style={styles.listingCard}>
              {mainPhoto && (
                <Image source={{ uri: mainPhoto }} style={styles.listingImage} />
              )}
              <View style={styles.listingContent}>
                <Text style={styles.listingTitle}>{item.title}</Text>
                <Text style={styles.listingCategory}>{item.category}</Text>
                <Text style={styles.listingDescription} numberOfLines={2}>
                  {item.description}
                </Text>
                {item.customer && (
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>Posted by {item.customer.name}</Text>
                  </View>
                )}
              </View>
            </View>
          )
        }}
        contentContainerStyle={styles.listContent}
      />
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  listContent: {
    padding: 16,
  },
  listingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...createShadowStyle(0.1, 4, { width: 0, height: 2 }, '#000', 3),
  },
  listingImage: {
    width: '100%',
    height: 200,
  },
  listingContent: {
    padding: 16,
  },
  listingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  listingCategory: {
    fontSize: 14,
    color: '#f25842',
    fontWeight: '600',
    marginBottom: 8,
  },
  listingDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  customerInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  customerName: {
    fontSize: 12,
    color: '#6b7280',
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
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
})
