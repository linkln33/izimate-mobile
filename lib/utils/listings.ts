// Listings utilities
import { supabase } from '../supabase'
import type { ListingQuota } from '../types'

const LIMITED_LISTING_LIMIT = 10
const UNLIMITED = 999999

/**
 * Check listing creation quota for a user
 */
export async function checkListingQuota(userId: string): Promise<ListingQuota> {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (!userData || userError) {
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['active', 'matched', 'in_progress'])

    return {
      canCreate: (count || 0) < LIMITED_LISTING_LIMIT,
      current: count || 0,
      limit: LIMITED_LISTING_LIMIT,
      remaining: Math.max(0, LIMITED_LISTING_LIMIT - (count || 0)),
      requiresVerification: false,
    }
  }

  // Identity verification check disabled - users can create listings without verification
  // const identityVerified = userData.identity_verified || false
  // const identityVerificationStatus = userData.identity_verification_status || 'pending'

  // Level 1 verification check disabled
  // if (!identityVerified || identityVerificationStatus !== 'verified') {
  //   const { count } = await supabase
  //     .from('listings')
  //     .select('*', { count: 'exact', head: true })
  //     .eq('user_id', userId)
  //     .in('status', ['active', 'matched', 'in_progress'])

  //   return {
  //     canCreate: false,
  //     current: count || 0,
  //     limit: LIMITED_LISTING_LIMIT,
  //     remaining: 0,
  //     requiresVerification: true,
  //   }
  // }

  // Check if user has business verification (unlimited listings)
  const { data: providerProfile } = await supabase
    .from('provider_profiles')
    .select('business_verified')
    .eq('user_id', userId)
    .single()

  const isBusinessVerified = providerProfile?.business_verified || false
  const limit = isBusinessVerified ? UNLIMITED : LIMITED_LISTING_LIMIT

  const { count, error } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['active', 'matched', 'in_progress'])

  if (error) {
    console.error('Error checking listing quota:', error)
    return {
      canCreate: false,
      current: 0,
      limit,
      remaining: 0,
    }
  }

  const current = count || 0
  const remaining = isBusinessVerified ? UNLIMITED : Math.max(0, limit - current)

  return {
    canCreate: isBusinessVerified ? true : current < limit,
    current,
    limit,
    remaining,
    requiresBusinessVerification: !isBusinessVerified && current >= LIMITED_LISTING_LIMIT,
  }
}

/**
 * Calculate distance between two coordinates in km
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
