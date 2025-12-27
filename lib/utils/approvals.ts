// Approval utilities - mirrors web app lib/matching-approvals.ts
import { supabase } from '../supabase'
import { createNotification } from './notifications'
import type { Match, PendingApproval } from '../types'

/**
 * Approve a pending approval request
 */
export async function approvePendingRequest(
  approvalId: string,
  providerId: string
): Promise<{ success: boolean; match?: Match; error?: string }> {
  try {
    const { data: approval, error: approvalError } = await supabase
      .from('pending_approvals')
      .select('*, listings(*), users!pending_approvals_customer_id_fkey(*)')
      .eq('id', approvalId)
      .eq('provider_id', providerId)
      .eq('status', 'pending')
      .single()

    if (approvalError || !approval) {
      return { success: false, error: 'Approval not found or already processed' }
    }

    // Update approval status
    await supabase
      .from('pending_approvals')
      .update({
        status: 'approved',
        provider_response_time: new Date().toISOString(),
      })
      .eq('id', approvalId)

    // Create match
    const listing = approval.listings as any
    const customer = approval.users as any

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        listing_id: approval.listing_id,
        customer_id: approval.customer_id,
        provider_id: providerId,
        status: 'pending',
        proposed_date: approval.requested_time_slot_start || null,
        proposed_price: approval.requested_price || null,
        approved_by_provider: true,
        approval_requested_at: approval.created_at,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (matchError || !match) {
      return { success: false, error: 'Failed to create match' }
    }

    // Send notification to customer
    await createNotification(
      approval.customer_id,
      'match',
      'Request Approved!',
      'Your service request has been approved. Start chatting to finalize details.',
      `/chat/${match.id}`
    )

    return { success: true, match }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Reject a pending approval request
 */
export async function rejectPendingRequest(
  approvalId: string,
  providerId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: approval, error } = await supabase
      .from('pending_approvals')
      .update({
        status: 'rejected',
        provider_response_time: new Date().toISOString(),
        provider_notes: reason,
      })
      .eq('id', approvalId)
      .eq('provider_id', providerId)
      .eq('status', 'pending')
      .select()
      .single()

    if (error || !approval) {
      return { success: false, error: 'Failed to reject approval' }
    }

    // Send notification to customer
    await createNotification(
      approval.customer_id,
      'rejection',
      'Request Not Available',
      reason || 'The provider is not available for this request.',
      `/find`
    )

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get pending approvals for a provider
 */
export async function getPendingApprovals(providerId: string) {
  try {
    const { data, error } = await supabase
      .from('pending_approvals')
      .select(`
        *,
        listings(*),
        users!pending_approvals_customer_id_fkey(*)
      `)
      .eq('provider_id', providerId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    return { data, error }
  } catch (error) {
    console.error('Error getting pending approvals:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Approve a like (simple approve/disapprove for customer likes)
 */
export async function approveLike(
  swipeId: string,
  listingOwnerId: string
): Promise<{ success: boolean; match?: Match; error?: string }> {
  try {
    // Get the swipe record
    const { data: swipe, error: swipeError } = await supabase
      .from('swipes')
      .select('*, listings(*)')
      .eq('id', swipeId)
      .eq('swipe_type', 'customer_on_listing')
      .eq('direction', 'right')
      .single()

    if (swipeError || !swipe) {
      return { success: false, error: 'Swipe not found' }
    }

    const listing = swipe.listings as any
    if (listing.user_id !== listingOwnerId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Note: The swipes table doesn't have an 'approved' column
    // Approval status is determined by the existence of a match
    // Create match (this is the source of truth for approval)
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        listing_id: swipe.listing_id,
        customer_id: swipe.swiper_id,
        provider_id: listingOwnerId,
        status: 'pending',
      })
      .select()
      .single()

    if (matchError || !match) {
      return { success: false, error: 'Failed to create match' }
    }

    // Send notification to customer
    await createNotification(
      swipe.swiper_id,
      'match',
      'New Match!',
      'The listing owner approved your like. Start chatting!',
      `/chat/${match.id}`
    )

    return { success: true, match }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Reject a like
 */
export async function rejectLike(
  swipeId: string,
  listingOwnerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: swipe, error: swipeError } = await supabase
      .from('swipes')
      .select('*, listings(*)')
      .eq('id', swipeId)
      .single()

    if (swipeError || !swipe) {
      return { success: false, error: 'Swipe not found' }
    }

    const listing = swipe.listings as any
    if (listing.user_id !== listingOwnerId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Note: The swipes table doesn't have an 'approved' column
    // Rejection is handled by not creating a match
    // The swipe record remains but no match is created
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
