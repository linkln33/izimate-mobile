// Matching utilities - mirrors web app lib/matching.ts
import { supabase } from '../supabase'
import { createNotification } from './notifications'
import type { SwipeResult, Match, Listing } from '../types'

/**
 * Record a swipe action
 */
export async function recordSwipe(
  swiperId: string,
  listingId: string | null,
  providerId: string | null,
  swipeType: 'provider_on_listing' | 'customer_on_provider' | 'customer_on_listing',
  direction: 'right' | 'left' | 'super',
  requestDetails?: {
    requestedTimeSlotStart?: string
    requestedTimeSlotEnd?: string
    requestedPrice?: number
    customerMessage?: string
  }
): Promise<SwipeResult> {
  try {
    const { data, error } = await supabase
      .from('swipes')
      .insert({
        swiper_id: swiperId,
        listing_id: listingId,
        provider_id: providerId,
        swipe_type: swipeType,
        direction,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Already swiped on this item' }
      }
      return { success: false, error: error.message }
    }

    // Check for match if it's a right swipe or super like
    if (direction === 'right' || direction === 'super') {
      if (swipeType === 'customer_on_listing' && listingId) {
        // Customer swiping on another customer's listing
        // Flow: Like → Owner Approval → Match (no instant matches)
        
        const { data: listing } = await supabase
          .from('listings')
          .select('user_id, status, title, category, budget_min, budget_max, urgency, preferred_date, location_address')
          .eq('id', listingId)
          .single()

        if (!listing || listing.status !== 'active') {
          return { success: false, error: 'Listing not found or no longer available' }
        }

        const listingOwnerId = listing.user_id

        // Build notification message
        let notificationMessage = 'A customer liked your listing. Approve to create a match and start negotiating.'
        
        const contextParts: string[] = []
        if (listing.category) {
          contextParts.push(`Service: ${listing.category}`)
        }
        if (listing.budget_min || listing.budget_max) {
          const budget = listing.budget_min && listing.budget_max
            ? `£${listing.budget_min}-${listing.budget_max}`
            : listing.budget_min
            ? `£${listing.budget_min}+`
            : `Up to £${listing.budget_max}`
          contextParts.push(`Budget: ${budget}`)
        }
        if (listing.urgency) {
          const urgencyLabels: Record<string, string> = {
            asap: 'ASAP',
            this_week: 'This Week',
            flexible: 'Flexible',
          }
          contextParts.push(`Timing: ${urgencyLabels[listing.urgency] || listing.urgency}`)
        }
        
        if (contextParts.length > 0) {
          notificationMessage = `New service request matches your listing:\n\n${contextParts.join('\n')}\n\nApprove to create a match and start negotiating.`
        }

        // Send notification to listing owner
        await createNotification(
          listingOwnerId,
          'liked',
          'New Service Request!',
          notificationMessage,
          `/dashboard?tab=listings&listing=${listingId}`
        )

        return { success: true }
      } else {
        // Check for instant match
        const match = await checkForMatch(swiperId, listingId, providerId, swipeType)
        if (match) {
          return { success: true, match }
        }
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if a swipe creates a mutual match
 */
async function checkForMatch(
  swiperId: string,
  listingId: string | null,
  providerId: string | null,
  swipeType: 'provider_on_listing' | 'customer_on_provider' | 'customer_on_listing'
): Promise<Match | null> {
  try {
    if (swipeType === 'provider_on_listing' && listingId) {
      const { data: listing } = await supabase
        .from('listings')
        .select('user_id')
        .eq('id', listingId)
        .single()

      if (!listing) return null

      const customerId = listing.user_id

      // Check if customer already swiped right on this provider
      const { data: existingSwipe } = await supabase
        .from('swipes')
        .select('*')
        .eq('swiper_id', customerId)
        .eq('provider_id', swiperId)
        .eq('listing_id', listingId)
        .in('direction', ['right', 'super'])
        .single()

      if (existingSwipe) {
        // Create match
        const { data: match, error } = await supabase
          .from('matches')
          .insert({
            listing_id: listingId,
            customer_id: customerId,
            provider_id: swiperId,
            status: 'pending',
            super_liked_by: existingSwipe.direction === 'super' ? customerId : swiperId,
          })
          .select()
          .single()

        if (!error && match) {
          await supabase
            .from('listings')
            .update({ status: 'matched', match_count: 1 })
            .eq('id', listingId)

          await createNotification(
            customerId,
            'match',
            'New Match!',
            'A provider is interested in your job',
            `/chat/${match.id}`
          )

          return match
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error checking for match:', error)
    return null
  }
}

/**
 * Get or create a match for chat (chat is always available)
 * If a match already exists, return it. Otherwise, create a new match.
 */
export async function getOrCreateMatchForChat(
  currentUserId: string,
  listingId: string
): Promise<{ success: boolean; match?: Match; error?: string }> {
  try {
    // Get listing to find the owner
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('user_id')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return { success: false, error: 'Listing not found' }
    }

    const listingOwnerId = listing.user_id

    // Check if match already exists
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('*')
      .or(`and(customer_id.eq.${currentUserId},provider_id.eq.${listingOwnerId},listing_id.eq.${listingId}),and(customer_id.eq.${listingOwnerId},provider_id.eq.${currentUserId},listing_id.eq.${listingId})`)
      .single()

    if (existingMatch) {
      return { success: true, match: existingMatch }
    }

    // Create new match (chat is always available)
    const { data: newMatch, error: matchError } = await supabase
      .from('matches')
      .insert({
        listing_id: listingId,
        customer_id: listingOwnerId,
        provider_id: currentUserId,
        status: 'pending',
      })
      .select()
      .single()

    if (matchError || !newMatch) {
      return { success: false, error: matchError?.message || 'Failed to create match' }
    }

    // Send notification to listing owner
    await createNotification(
      listingOwnerId,
      'match',
      'New Chat',
      'Someone wants to chat about your listing',
      `/chat/${newMatch.id}`
    )

    return { success: true, match: newMatch }
  } catch (error: any) {
    console.error('Error getting or creating match for chat:', error)
    return { success: false, error: error.message || 'Failed to create match' }
  }
}

/**
 * Get super like quota for a user
 */
export async function getSuperLikeQuota(userId: string): Promise<{
  canSuperLike: boolean
  used: number
  limit: number
  remaining: number
}> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('swipes')
    .select('*', { count: 'exact', head: true })
    .eq('swiper_id', userId)
    .eq('direction', 'super')
    .gte('created_at', startOfDay.toISOString())

  const DAILY_SUPER_LIKES = 3
  const used = count || 0

  return {
    canSuperLike: used < DAILY_SUPER_LIKES,
    used,
    limit: DAILY_SUPER_LIKES,
    remaining: DAILY_SUPER_LIKES - used,
  }
}
