// Follow/Unfollow utilities
import { supabase } from '../supabase'
import type { UserFollow, User } from '../types'
import { createNotification } from './notifications'

/**
 * Follow a user
 */
export async function followUser(
  followerId: string,
  followingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Prevent self-follow
    if (followerId === followingId) {
      return { success: false, error: 'Cannot follow yourself' }
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single()

    if (existing) {
      return { success: false, error: 'Already following this user' }
    }

    // Create follow relationship
    const { error } = await supabase
      .from('user_follows')
      .insert({
        follower_id: followerId,
        following_id: followingId,
      })

    if (error) {
      console.error('Error following user:', error)
      return { success: false, error: error.message }
    }

    // Get follower info for notification
    const { data: followerData } = await supabase
      .from('users')
      .select('name')
      .eq('id', followerId)
      .single()

    // Notify the user being followed
    if (followerData) {
      await createNotification(
        followingId,
        'new_follower',
        'New Follower! 👥',
        `${followerData.name} started following you`,
        `/user/${followerId}`
      )
    }

    return { success: true }
  } catch (error: any) {
    console.error('Exception following user:', error)
    return { success: false, error: error?.message || 'Failed to follow user' }
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)

    if (error) {
      console.error('Error unfollowing user:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Exception unfollowing user:', error)
    return { success: false, error: error?.message || 'Failed to unfollow user' }
  }
}

/**
 * Check if a user is following another user
 */
export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine
      console.error('Error checking follow status:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Exception checking follow status:', error)
    return false
  }
}

/**
 * Get followers count for a user
 */
export async function getFollowersCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)

    if (error) {
      console.error('Error getting followers count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Exception getting followers count:', error)
    return 0
  }
}

/**
 * Get following count for a user
 */
export async function getFollowingCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId)

    if (error) {
      console.error('Error getting following count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Exception getting following count:', error)
    return 0
  }
}

/**
 * Get list of followers for a user
 */
export async function getFollowers(
  userId: string,
  limit: number = 50
): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        follower:users!follower_id (
          id,
          name,
          avatar_url,
          bio,
          verification_status
        )
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error getting followers:', error)
      return []
    }

    return (data || []).map((item: any) => item.follower).filter(Boolean)
  } catch (error) {
    console.error('Exception getting followers:', error)
    return []
  }
}

/**
 * Get list of users a user is following
 */
export async function getFollowing(
  userId: string,
  limit: number = 50
): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        following:users!following_id (
          id,
          name,
          avatar_url,
          bio,
          verification_status
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error getting following:', error)
      return []
    }

    return (data || []).map((item: any) => item.following).filter(Boolean)
  } catch (error) {
    console.error('Exception getting following:', error)
    return []
  }
}

/**
 * Notify followers when a user creates a new listing
 */
export async function notifyFollowersOfNewListing(
  userId: string,
  listingId: string,
  listingTitle: string
): Promise<void> {
  try {
    // Get all followers
    const followers = await getFollowers(userId, 1000) // Get up to 1000 followers

    if (followers.length === 0) {
      return
    }

    // Get user info for notification
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single()

    if (!userData) {
      return
    }

    // Create notifications for all followers
    const notifications = followers.map((follower) =>
      createNotification(
        follower.id,
        'followed_user_new_listing',
        'New Listing from Followed User! 🎉',
        `${userData.name} posted a new listing: "${listingTitle}"`,
        `/listings/${listingId}`
      )
    )

    // Send all notifications in parallel
    await Promise.all(notifications)
  } catch (error) {
    console.error('Error notifying followers of new listing:', error)
    // Don't throw - notification failure shouldn't break listing creation
  }
}

