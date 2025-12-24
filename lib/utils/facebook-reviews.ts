/**
 * Facebook Reviews API Integration
 * Handles automatic verification of Facebook page reviews
 */

import { supabase } from '../supabase'

interface FacebookReviewData {
  id: string
  created_time: string
  message?: string
  rating?: number
  reviewer?: {
    name: string
    id: string
  }
}

interface FacebookPageReview {
  reviewId: string
  reviewerName: string
  rating: number
  reviewText?: string
  reviewDate: string
  reviewUrl: string
}

/**
 * Fetch reviews from Facebook Page using Graph API
 */
export async function fetchFacebookPageReviews(
  pageId: string,
  accessToken: string
): Promise<FacebookPageReview[]> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/ratings?access_token=${accessToken}&fields=reviewer,rating,review_text,created_time,review_id`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Facebook API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    const reviews: FacebookPageReview[] = []

    if (data.data && Array.isArray(data.data)) {
      for (const review of data.data) {
        reviews.push({
          reviewId: review.review_id || review.id,
          reviewerName: review.reviewer?.name || 'Anonymous',
          rating: review.rating || 0,
          reviewText: review.review_text || '',
          reviewDate: review.created_time,
          reviewUrl: `https://www.facebook.com/${pageId}/reviews`,
        })
      }
    }

    return reviews
  } catch (error) {
    console.error('Failed to fetch Facebook reviews:', error)
    throw error
  }
}

/**
 * Verify a Facebook review and create external_review record
 */
export async function verifyFacebookReview(
  providerId: string,
  listingId: string | null,
  customerId: string,
  bookingId: string | null,
  reviewUrl: string,
  pageId: string,
  accessToken: string
): Promise<{ verified: boolean; externalReviewId?: string; error?: string }> {
  try {
    // Fetch recent reviews from Facebook
    const reviews = await fetchFacebookPageReviews(pageId, accessToken)
    
    // Try to match the review URL or find recent reviews
    // For now, we'll create a pending review and mark it as verified if we find a match
    const { data: existingReview } = await supabase
      .from('external_reviews')
      .select('*')
      .eq('provider_id', providerId)
      .eq('source', 'facebook')
      .eq('external_url', reviewUrl)
      .single()

    if (existingReview) {
      // Update existing review
      const { data, error } = await supabase
        .from('external_reviews')
        .update({
          customer_id: customerId,
          booking_id: bookingId,
          verification_status: 'verified',
          verification_method: 'api',
          is_verified: true,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', existingReview.id)
        .select()
        .single()

      if (error) throw error
      return { verified: true, externalReviewId: data.id }
    }

    // Find matching review from API
    const matchingReview = reviews.find(r => 
      r.reviewUrl === reviewUrl || 
      (r.reviewDate && new Date(r.reviewDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Within last 7 days
    )

    if (matchingReview) {
      // Create verified external review
      const { data, error } = await supabase
        .from('external_reviews')
        .insert({
          provider_id: providerId,
          listing_id: listingId,
          customer_id: customerId,
          booking_id: bookingId,
          source: 'facebook',
          external_review_id: matchingReview.reviewId,
          external_url: reviewUrl,
          reviewer_name: matchingReview.reviewerName,
          rating: matchingReview.rating,
          review_text: matchingReview.reviewText,
          review_date: new Date(matchingReview.reviewDate).toISOString(),
          verification_status: 'verified',
          verification_method: 'api',
          is_verified: true,
          last_synced_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return { verified: true, externalReviewId: data.id }
    }

    // If no match found, create pending review
    const { data, error } = await supabase
      .from('external_reviews')
      .insert({
        provider_id: providerId,
        listing_id: listingId,
        customer_id: customerId,
        booking_id: bookingId,
        source: 'facebook',
        external_review_id: `pending_${Date.now()}`,
        external_url: reviewUrl,
        verification_status: 'pending',
        verification_method: 'manual',
        is_verified: false,
      })
      .select()
      .single()

    if (error) throw error
    return { verified: false, externalReviewId: data.id, error: 'Review not found in recent Facebook reviews. Please verify manually.' }
  } catch (error: any) {
    console.error('Failed to verify Facebook review:', error)
    return { verified: false, error: error.message || 'Failed to verify review' }
  }
}

/**
 * Sync Facebook reviews for a provider
 */
export async function syncFacebookReviews(
  providerId: string,
  pageId: string,
  accessToken: string
): Promise<{ synced: number; errors: number }> {
  try {
    const reviews = await fetchFacebookPageReviews(pageId, accessToken)
    let synced = 0
    let errors = 0

    for (const review of reviews) {
      try {
        // Check if review already exists
        const { data: existing } = await supabase
          .from('external_reviews')
          .select('id')
          .eq('provider_id', providerId)
          .eq('source', 'facebook')
          .eq('external_review_id', review.reviewId)
          .single()

        if (!existing) {
          // Insert new review
          await supabase
            .from('external_reviews')
            .insert({
              provider_id: providerId,
              source: 'facebook',
              external_review_id: review.reviewId,
              external_url: review.reviewUrl,
              reviewer_name: review.reviewerName,
              rating: review.rating,
              review_text: review.reviewText,
              review_date: new Date(review.reviewDate).toISOString(),
              verification_status: 'verified',
              verification_method: 'api',
              is_verified: true,
              last_synced_at: new Date().toISOString(),
            })
          synced++
        } else {
          // Update existing review
          await supabase
            .from('external_reviews')
            .update({
              reviewer_name: review.reviewerName,
              rating: review.rating,
              review_text: review.reviewText,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
        }
      } catch (err) {
        console.error('Error syncing review:', review.reviewId, err)
        errors++
      }
    }

    return { synced, errors }
  } catch (error) {
    console.error('Failed to sync Facebook reviews:', error)
    throw error
  }
}

