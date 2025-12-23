import { supabase } from '@/lib/supabase'

export interface RatingData {
  asDescribed: number
  timing: number
  communication: number
  cost: number
  performance: number
}

export interface ReviewSubmission {
  revieweeId: string
  jobId?: string
  ratings: RatingData
  reviewText?: string
  serviceType?: string
}

/**
 * Submit a new review and rating
 */
export async function submitReview(submission: ReviewSubmission) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const reviewData = {
    reviewer_id: user.id,
    reviewee_id: submission.revieweeId,
    job_id: submission.jobId || null,
    as_described: submission.ratings.asDescribed,
    timing: submission.ratings.timing,
    communication: submission.ratings.communication,
    cost: submission.ratings.cost,
    performance: submission.ratings.performance,
    review_text: submission.reviewText?.trim() || null,
    service_type: submission.serviceType || 'general',
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert([reviewData])
    .select()

  if (error) {
    console.error('Review submission error:', error)
    throw error
  }

  return data[0]
}

/**
 * Get user's rating statistics
 */
export async function getUserRatingStats(userId: string) {
  const { data, error } = await supabase
    .from('user_rating_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // Not found is OK
    console.error('Error fetching rating stats:', error)
    throw error
  }

  return data
}

/**
 * Get reviews for a user (paginated)
 */
export async function getUserReviews(userId: string, limit = 10, offset = 0) {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:reviewer_id(id, name, avatar_url),
      reviewee:reviewee_id(id, name, avatar_url)
    `)
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching user reviews:', error)
    throw error
  }

  return data
}

/**
 * Get pending ratings for a user (jobs completed but not yet rated)
 */
export async function getPendingRatings(userId: string) {
  // This would need to be implemented based on your jobs/matches table structure
  // For now, returning empty array as placeholder
  return []
}

/**
 * Check if user has already rated a specific job/person
 */
export async function hasUserRated(revieweeId: string, jobId?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  let query = supabase
    .from('reviews')
    .select('id')
    .eq('reviewer_id', user.id)
    .eq('reviewee_id', revieweeId)

  if (jobId) {
    query = query.eq('job_id', jobId)
  }

  const { data, error } = await query.single()

  if (error && error.code !== 'PGRST116') { // Not found is OK
    console.error('Error checking existing rating:', error)
    return false
  }

  return !!data
}

/**
 * Calculate rating statistics from raw ratings
 */
export function calculateRatingStats(ratings: RatingData) {
  const values = Object.values(ratings)
  const average = values.reduce((sum, rating) => sum + rating, 0) / values.length
  const percentage = Math.round((average / 5) * 100)
  
  return {
    average: Math.round(average * 10) / 10,
    percentage,
    excellentCount: values.filter(rating => rating >= 4.5).length,
  }
}

/**
 * Format rating for display
 */
export function formatRating(rating: number | null | undefined): string {
  if (!rating || rating === 0) return 'No rating'
  return rating.toFixed(1)
}

/**
 * Get rating color based on value
 */
export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return '#10b981' // Green
  if (rating >= 4.0) return '#fbbf24' // Yellow
  if (rating >= 3.0) return '#f59e0b' // Orange
  return '#ef4444' // Red
}

/**
 * Get rating description based on value
 */
export function getRatingDescription(rating: number): string {
  if (rating >= 4.5) return 'Excellent'
  if (rating >= 4.0) return 'Good'
  if (rating >= 3.0) return 'Average'
  if (rating >= 2.0) return 'Below Average'
  return 'Poor'
}