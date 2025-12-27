/**
 * Affiliate Tracking Utilities
 * Industry-standard implementation for tracking referrals and processing conversions
 * 
 * Best Practices:
 * - Track referrals immediately on signup (not delayed)
 * - Process conversions when subscription is confirmed
 * - Handle errors gracefully (don't block user flow)
 * - Log all tracking events for debugging
 */

import logger from './logger'

const API_URL = process.env.EXPO_PUBLIC_SITE_URL || 'https://izimate.com'

/**
 * Track a referral when a new user signs up with a referral code
 * Industry standard: Track immediately on signup to capture the referral
 * 
 * @param userId - The ID of the newly signed up user
 * @param referralCode - The referral code used during signup
 * @returns Promise<boolean> - Returns true if tracking was successful
 */
export async function trackReferral(
  userId: string,
  referralCode: string
): Promise<boolean> {
  if (!userId || !referralCode) {
    logger.warn('Missing userId or referralCode for tracking')
    return false
  }

  try {
    logger.info('Tracking referral:', { userId, referralCode })

    const response = await fetch(`${API_URL}/api/affiliate/track-referral`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        referralCode,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Failed to track referral:', {
        status: response.status,
        error: errorData.error || 'Unknown error',
      })
      return false
    }

    logger.info('✅ Referral tracked successfully')
    return true
  } catch (error) {
    logger.error('Error tracking referral:', error)
    // Don't throw - tracking failure shouldn't block user signup
    return false
  }
}

/**
 * Process affiliate conversion when a referred user subscribes to a paid plan
 * Industry standard: Process conversion immediately after subscription confirmation
 * 
 * @param userId - The ID of the user who subscribed
 * @param plan - The plan type ('pro' or 'business')
 * @param subscriptionId - Optional Stripe subscription ID
 * @returns Promise<boolean> - Returns true if conversion was processed successfully
 */
export async function processAffiliateConversion(
  userId: string,
  plan: 'pro' | 'business',
  subscriptionId?: string
): Promise<boolean> {
  if (!userId || !plan) {
    logger.warn('Missing userId or plan for conversion processing')
    return false
  }

  try {
    logger.info('Processing affiliate conversion:', { userId, plan, subscriptionId })

    const response = await fetch(`${API_URL}/api/affiliate/process-conversion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        plan,
        subscriptionId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // If user has no referral code, that's okay (not an error)
      if (response.status === 200 && errorData.message) {
        logger.info('No referral code for user:', errorData.message)
        return true
      }

      logger.error('Failed to process conversion:', {
        status: response.status,
        error: errorData.error || 'Unknown error',
      })
      return false
    }

    const data = await response.json()
    logger.info('✅ Conversion processed successfully:', data)
    return true
  } catch (error) {
    logger.error('Error processing conversion:', error)
    // Don't throw - conversion processing failure shouldn't block subscription
    return false
  }
}

/**
 * Track referral and save referral code in one operation
 * This is the recommended approach for signup flows
 * 
 * @param userId - The ID of the newly signed up user
 * @param referralCode - The referral code used during signup
 * @param supabase - Supabase client instance
 * @returns Promise<boolean> - Returns true if both operations succeeded
 */
export async function trackReferralOnSignup(
  userId: string,
  referralCode: string,
  supabase: any
): Promise<boolean> {
  if (!userId || !referralCode) {
    return false
  }

  try {
    // Step 1: Save referral code to user profile (for record keeping)
    const { error: updateError } = await supabase
      .from('users')
      .update({ referred_by_code: referralCode })
      .eq('id', userId)

    if (updateError) {
      logger.error('Error saving referral code to user profile:', updateError)
      // Continue anyway - we'll still try to track
    } else {
      logger.info('✅ Referral code saved to user profile')
    }

    // Step 2: Track referral via API (creates referral record)
    const tracked = await trackReferral(userId, referralCode)

    return tracked
  } catch (error) {
    logger.error('Error in trackReferralOnSignup:', error)
    return false
  }
}

