import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/types'

interface TrustSignalsProps {
  provider: User
  onPress?: () => void
}

interface ProviderStats {
  rating: number
  reviewCount: number
  verified: boolean
}

export function TrustSignals({ provider, onPress }: TrustSignalsProps) {
  const [stats, setStats] = useState<ProviderStats>({
    rating: 0,
    reviewCount: 0,
    verified: provider.verification_status === 'verified',
  })

  useEffect(() => {
    loadProviderStats()
  }, [provider.id])

  const loadProviderStats = async () => {
    try {
      // Get provider profile for rating
      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('rating, jobs_completed')
        .eq('user_id', provider.id)
        .single()

      // Get review count
      const { data: reviews } = await supabase
        .from('reviews')
        .select('id', { count: 'exact' })
        .eq('reviewee_id', provider.id)

      setStats({
        rating: providerProfile?.rating || 0,
        reviewCount: reviews?.length || 0,
        verified: provider.verification_status === 'verified',
      })
    } catch (error) {
      console.error('Error loading provider stats:', error)
    }
  }

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    return (
      <View style={styles.starsContainer}>
        {[...Array(fullStars)].map((_, i) => (
          <Ionicons key={`full-${i}`} name="star" size={14} color="#fbbf24" />
        ))}
        {hasHalfStar && (
          <Ionicons name="star-half" size={14} color="#fbbf24" />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#d1d5db" />
        ))}
      </View>
    )
  }

  const Container = onPress ? Pressable : View

  return (
    <Container style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        {stats.rating > 0 && (
          <View style={styles.ratingSection}>
            {renderStars(stats.rating)}
            <Text style={styles.ratingText}>
              {stats.rating.toFixed(1)}
            </Text>
            {stats.reviewCount > 0 && (
              <Text style={styles.reviewCount}>
                ({stats.reviewCount} {stats.reviewCount === 1 ? 'review' : 'reviews'})
              </Text>
            )}
          </View>
        )}

        {stats.verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>
    </Container>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  reviewCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
})

