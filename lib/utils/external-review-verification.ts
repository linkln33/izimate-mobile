/**
 * External Review Verification System
 * Automatically verifies and processes external reviews (Facebook, Google)
 * and grants incentives if eligible
 */

import { supabase } from '../supabase'
import { verifyFacebookReview } from './facebook-reviews'
import { verifyGoogleReview } from './google-reviews'
import { getReviewIncentiveSettings, checkReviewEligibility, createReviewIncentiveCoupon } from './review-incentives'

interface ExternalReviewSubmission {
  customerId: string
  providerId: string
  listingId: string | null
  bookingId: string | null
  platform: 'facebook' | 'google'
  reviewUrl: string
}

interface VerificationResult {
  verified: boolean
  externalReviewId?: string
  incentiveGranted: boolean
  couponId?: string
  couponCode?: string
  error?: string
}

/**
 * Process external review submission and automatically verify
 */
export async function processExternalReview(
  submission: ExternalReviewSubmission
): Promise<VerificationResult> {
  try {
    // Get review incentive settings
    const settings = await getReviewIncentiveSettings(
      submission.providerId,
      submission.listingId || undefined
    )

    if (!settings || !settings.enabled) {
      return {
        verified: false,
        incentiveGranted: false,
        error: 'Review incentives not enabled for this provider',
      }
    }

    // Check if platform is enabled
    const platforms = settings.review_platforms || ['in_app']
    if (!platforms.includes(submission.platform)) {
      return {
        verified: false,
        incentiveGranted: false,
        error: `${submission.platform} reviews are not enabled for this listing`,
      }
    }

    // Check eligibility
    const eligibility = await checkReviewEligibility(
      submission.customerId,
      submission.providerId,
      submission.bookingId || undefined
    )

    if (!eligibility.eligible) {
      return {
        verified: false,
        incentiveGranted: false,
        error: eligibility.reason || 'Not eligible for incentive',
      }
    }

    // Verify review based on platform
    let verificationResult: { verified: boolean; externalReviewId?: string; error?: string }

    if (submission.platform === 'facebook') {
      // Get Facebook credentials from settings or provider profile
      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('facebook_page_id, facebook_access_token')
        .eq('user_id', submission.providerId)
        .single()

      if (!providerProfile?.facebook_page_id || !providerProfile?.facebook_access_token) {
        return {
          verified: false,
          incentiveGranted: false,
          error: 'Facebook page not configured. Please add your Facebook page ID and access token in settings.',
        }
      }

      verificationResult = await verifyFacebookReview(
        submission.providerId,
        submission.listingId,
        submission.customerId,
        submission.bookingId,
        submission.reviewUrl,
        providerProfile.facebook_page_id,
        providerProfile.facebook_access_token
      )
    } else if (submission.platform === 'google') {
      // Get Google credentials from settings or provider profile
      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('google_place_id')
        .eq('user_id', submission.providerId)
        .single()

      const { data: incentiveSettings } = await supabase
        .from('review_incentive_settings')
        .select('google_place_id, google_api_key')
        .eq('provider_id', submission.providerId)
        .eq('listing_id', submission.listingId)
        .single()

      const placeId = incentiveSettings?.google_place_id || providerProfile?.google_place_id
      const apiKey = incentiveSettings?.google_api_key || process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY

      if (!placeId || !apiKey) {
        return {
          verified: false,
          incentiveGranted: false,
          error: 'Google Business not configured. Please add your Google Place ID and API key in settings.',
        }
      }

      verificationResult = await verifyGoogleReview(
        submission.providerId,
        submission.listingId,
        submission.customerId,
        submission.bookingId,
        submission.reviewUrl,
        placeId,
        apiKey
      )
    } else {
      return {
        verified: false,
        incentiveGranted: false,
        error: 'Unsupported platform',
      }
    }

    if (!verificationResult.verified || !verificationResult.externalReviewId) {
      return {
        verified: false,
        incentiveGranted: false,
        externalReviewId: verificationResult.externalReviewId,
        error: verificationResult.error || 'Review verification failed',
      }
    }

    // Get the external review to check rating
    const { data: externalReview } = await supabase
      .from('external_reviews')
      .select('*')
      .eq('id', verificationResult.externalReviewId)
      .single()

    if (!externalReview) {
      return {
        verified: true,
        incentiveGranted: false,
        externalReviewId: verificationResult.externalReviewId,
        error: 'External review not found after verification',
      }
    }

    // Check if review meets minimum rating requirement
    const meetsMinRating = externalReview.rating >= settings.min_rating
    const hasTextReview = !settings.require_text_review || !!externalReview.review_text

    if (!meetsMinRating || !hasTextReview) {
      return {
        verified: true,
        incentiveGranted: false,
        externalReviewId: verificationResult.externalReviewId,
        error: `Review does not meet requirements. Minimum rating: ${settings.min_rating}, Text required: ${settings.require_text_review}`,
      }
    }

    // Grant incentive
    let couponId: string | undefined
    let couponCode: string | undefined

    if (settings.auto_generate_coupon) {
      const coupon = await createReviewIncentiveCoupon(
        submission.providerId,
        settings,
        externalReview.rating
      )

      if (coupon) {
        couponId = coupon.id
        couponCode = coupon.code
      }
    }

    // Create incentive claim
    if (couponId) {
      await supabase
        .from('review_incentive_claims')
        .insert({
          customer_id: submission.customerId,
          provider_id: submission.providerId,
          incentive_type: settings.incentive_type,
          incentive_value: settings.discount_percentage || settings.discount_amount || 0,
          coupon_id: couponId,
          coupon_code: couponCode,
        })
    }

    return {
      verified: true,
      externalReviewId: verificationResult.externalReviewId,
      incentiveGranted: true,
      couponId,
      couponCode,
    }
  } catch (error: any) {
    console.error('Failed to process external review:', error)
    return {
      verified: false,
      incentiveGranted: false,
      error: error.message || 'Failed to process review',
    }
  }
}

/**
 * Manually verify an external review (for provider/admin use)
 */
export async function manuallyVerifyExternalReview(
  externalReviewId: string,
  providerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify the review belongs to the provider
    const { data: review, error: fetchError } = await supabase
      .from('external_reviews')
      .select('*')
      .eq('id', externalReviewId)
      .eq('provider_id', providerId)
      .single()

    if (fetchError || !review) {
      return { success: false, error: 'Review not found' }
    }

    // Get settings to check eligibility
    const settings = await getReviewIncentiveSettings(providerId, review.listing_id || undefined)

    if (!settings || !settings.enabled) {
      return { success: false, error: 'Review incentives not enabled' }
    }

    // Check if review meets requirements
    const meetsMinRating = review.rating >= settings.min_rating
    const hasTextReview = !settings.require_text_review || !!review.review_text

    if (!meetsMinRating || !hasTextReview) {
      return { success: false, error: 'Review does not meet incentive requirements' }
    }

    // Update review as verified
    const { error: updateError } = await supabase
      .from('external_reviews')
      .update({
        verification_status: 'verified',
        verification_method: 'manual',
        is_verified: true,
      })
      .eq('id', externalReviewId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Grant incentive if customer is eligible
    if (review.customer_id) {
      const eligibility = await checkReviewEligibility(
        review.customer_id,
        providerId,
        review.booking_id || undefined
      )

      if (eligibility.eligible && settings.auto_generate_coupon) {
        const coupon = await createReviewIncentiveCoupon(
          providerId,
          settings,
          review.rating
        )

        if (coupon && review.customer_id) {
          await supabase
            .from('review_incentive_claims')
            .insert({
              customer_id: review.customer_id,
              provider_id: providerId,
              incentive_type: settings.incentive_type,
              incentive_value: settings.discount_percentage || settings.discount_amount || 0,
              coupon_id: coupon.id,
              coupon_code: coupon.code,
            })
        }
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Failed to manually verify review:', error)
    return { success: false, error: error.message || 'Failed to verify review' }
  }
}

