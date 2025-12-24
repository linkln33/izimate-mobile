/**
 * Review Incentive System
 * Handles discount rewards for leaving reviews
 */

import { supabase } from '../supabase';

interface ReviewIncentiveSettings {
  id: string;
  provider_id: string;
  listing_id?: string;
  enabled: boolean;
  incentive_type: 'discount' | 'credit' | 'points';
  discount_percentage?: number;
  discount_amount?: number;
  min_rating: number;
  require_text_review: boolean;
  max_uses_per_customer: number;
  auto_generate_coupon: boolean;
  coupon_code_prefix: string;
  coupon_valid_days: number;
  incentive_message: string;
}

interface ReviewSubmission {
  reviewer_id: string;
  reviewee_id: string;
  booking_id?: string;
  ratings: {
    asDescribed: number;
    timing: number;
    communication: number;
    cost: number;
    performance: number;
  };
  reviewText?: string;
  serviceType?: string;
}

/**
 * Get review incentive settings for a provider/listing
 */
export async function getReviewIncentiveSettings(
  providerId: string,
  listingId?: string
): Promise<ReviewIncentiveSettings | null> {
  try {
    let query = supabase
      .from('review_incentive_settings')
      .select('*')
      .eq('provider_id', providerId)
      .eq('enabled', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (listingId) {
      query = query.eq('listing_id', listingId);
    } else {
      query = query.is('listing_id', null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data?.[0] as ReviewIncentiveSettings) || null;
  } catch (error) {
    console.error('Failed to get review incentive settings:', error);
    return null;
  }
}

/**
 * Check if customer is eligible for review incentive
 */
export async function checkReviewEligibility(
  customerId: string,
  providerId: string,
  bookingId?: string
): Promise<{ eligible: boolean; reason?: string }> {
  try {
    const settings = await getReviewIncentiveSettings(providerId, bookingId ? undefined : undefined);
    
    if (!settings || !settings.enabled) {
      return { eligible: false, reason: 'Review incentives not enabled' };
    }

    // Check if customer has already claimed max uses
    const { data: claims } = await supabase
      .from('review_incentive_claims')
      .select('id')
      .eq('customer_id', customerId)
      .eq('provider_id', providerId)
      .eq('is_used', false);

    if (claims && claims.length >= settings.max_uses_per_customer) {
      return { eligible: false, reason: 'Maximum incentive uses reached' };
    }

    return { eligible: true };
  } catch (error) {
    console.error('Failed to check review eligibility:', error);
    return { eligible: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Process review and grant incentive if eligible
 */
export async function processReviewWithIncentive(
  reviewSubmission: ReviewSubmission,
  bookingId?: string
): Promise<{ reviewId: string; couponId?: string; couponCode?: string }> {
  try {
    // Calculate overall rating
    const overallRating = (
      reviewSubmission.ratings.asDescribed +
      reviewSubmission.ratings.timing +
      reviewSubmission.ratings.communication +
      reviewSubmission.ratings.cost +
      reviewSubmission.ratings.performance
    ) / 5;

    // Get incentive settings
    const settings = await getReviewIncentiveSettings(reviewSubmission.reviewee_id, bookingId ? undefined : undefined);
    
    let couponId: string | undefined;
    let couponCode: string | undefined;

    // Check if eligible for incentive
    if (settings && settings.enabled) {
      const meetsMinRating = overallRating >= settings.min_rating;
      const hasTextReview = !settings.require_text_review || !!reviewSubmission.reviewText;

      if (meetsMinRating && hasTextReview) {
        // Check eligibility
        const eligibility = await checkReviewEligibility(
          reviewSubmission.reviewer_id,
          reviewSubmission.reviewee_id,
          bookingId
        );

        if (eligibility.eligible) {
          // Create coupon if auto-generate is enabled
          if (settings.auto_generate_coupon) {
            const coupon = await createReviewIncentiveCoupon(
              reviewSubmission.reviewee_id,
              settings,
              overallRating
            );
            
            if (coupon) {
              couponId = coupon.id;
              couponCode = coupon.code;
            }
          }

          // Create review with incentive info
          const { data: review, error: reviewError } = await supabase
            .from('reviews')
            .insert({
              reviewer_id: reviewSubmission.reviewer_id,
              reviewee_id: reviewSubmission.reviewee_id,
              booking_id: bookingId || null,
              discount_coupon_id: couponId || null,
              incentive_rewarded: true,
              incentive_amount: calculateIncentiveAmount(settings, overallRating),
              incentive_type: settings.incentive_type,
              as_described: reviewSubmission.ratings.asDescribed,
              timing: reviewSubmission.ratings.timing,
              communication: reviewSubmission.ratings.communication,
              cost: reviewSubmission.ratings.cost,
              performance: reviewSubmission.ratings.performance,
              review_text: reviewSubmission.reviewText || null,
              service_type: reviewSubmission.serviceType || 'general',
            })
            .select()
            .single();

          if (reviewError) throw reviewError;

          // Create incentive claim record
          if (couponId) {
            await supabase
              .from('review_incentive_claims')
              .insert({
                review_id: review.id,
                coupon_id: couponId,
                customer_id: reviewSubmission.reviewer_id,
                provider_id: reviewSubmission.reviewee_id,
                incentive_type: settings.incentive_type,
                incentive_value: calculateIncentiveAmount(settings, overallRating),
                coupon_code: couponCode,
              });
          }

          return {
            reviewId: review.id,
            couponId,
            couponCode,
          };
        }
      }
    }

    // Create review without incentive
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        reviewer_id: reviewSubmission.reviewer_id,
        reviewee_id: reviewSubmission.reviewee_id,
        booking_id: bookingId || null,
        as_described: reviewSubmission.ratings.asDescribed,
        timing: reviewSubmission.ratings.timing,
        communication: reviewSubmission.ratings.communication,
        cost: reviewSubmission.ratings.cost,
        performance: reviewSubmission.ratings.performance,
        review_text: reviewSubmission.reviewText || null,
        service_type: reviewSubmission.serviceType || 'general',
      })
      .select()
      .single();

    if (reviewError) throw reviewError;

    return { reviewId: review.id };
  } catch (error) {
    console.error('Failed to process review with incentive:', error);
    throw error;
  }
}

/**
 * Create a discount coupon for review incentive
 */
async function createReviewIncentiveCoupon(
  providerId: string,
  settings: ReviewIncentiveSettings,
  rating: number
): Promise<{ id: string; code: string } | null> {
  try {
    // Generate unique coupon code
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const couponCode = `${settings.coupon_code_prefix}-${timestamp}-${random}`;

    // Calculate discount value
    const discountValue = calculateIncentiveAmount(settings, rating);

    // Calculate validity dates
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + settings.coupon_valid_days);

    const { data: coupon, error } = await supabase
      .from('booking_coupons')
      .insert({
        provider_id: providerId,
        code: couponCode,
        title: `Review Reward - ${rating.toFixed(1)}⭐`,
        description: settings.incentive_message,
        discount_type: settings.discount_percentage ? 'percentage' : 'fixed_amount',
        discount_value: discountValue,
        valid_from: validFrom.toISOString().split('T')[0],
        valid_until: validUntil.toISOString().split('T')[0],
        max_uses: 1, // Single use coupon
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return { id: coupon.id, code: couponCode };
  } catch (error) {
    console.error('Failed to create review incentive coupon:', error);
    return null;
  }
}

/**
 * Calculate incentive amount based on settings
 */
function calculateIncentiveAmount(settings: ReviewIncentiveSettings, rating: number): number {
  if (settings.incentive_type === 'discount') {
    if (settings.discount_percentage) {
      // For percentage, we'll return the percentage value
      // The actual discount will be calculated when applying to booking
      return settings.discount_percentage;
    } else if (settings.discount_amount) {
      return settings.discount_amount;
    }
  }
  return 0;
}
