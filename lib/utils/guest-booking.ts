import { supabase } from '../supabase'
import { createNotification } from './notifications'
import { sendBookingConfirmation } from './booking-notifications'
import type { Listing, User } from '../types'

export interface GuestUser {
  id: string
  name: string
  email: string
  phone: string
  email_opt_in: boolean
  created_at: string
}

export interface GuestBooking {
  id: string
  listing_id: string
  provider_id: string
  guest_customer_id: string
  start_time: string
  end_time: string
  service_name: string
  service_price: number
  currency: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  customer_notes?: string
  provider_notes?: string
  timezone: string
  metadata?: any
  created_at: string
  guest_booking: true
}

export interface GuestBookingDetails {
  booking: GuestBooking
  guest_customer: GuestUser
  provider: User
  listing: Listing
}

/**
 * Create a guest user record
 */
export async function createGuestUser(guestInfo: {
  name: string
  email: string
  phone: string
  email_opt_in?: boolean
}): Promise<{ data: GuestUser | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('guest_users')
      .insert({
        name: guestInfo.name,
        email: guestInfo.email,
        phone: guestInfo.phone,
        email_opt_in: guestInfo.email_opt_in || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating guest user:', error)
      return { data: null, error: error.message }
    }

    return { data: data as GuestUser, error: null }
  } catch (error) {
    console.error('Exception creating guest user:', error)
    return { data: null, error: 'Failed to create guest user' }
  }
}

/**
 * Create a guest booking
 */
export async function createGuestBooking(bookingData: {
  listing_id: string
  provider_id: string
  guest_customer_id: string
  start_time: string
  end_time: string
  service_name: string
  service_price: number
  currency?: string
  customer_notes?: string
  timezone?: string
  metadata?: any
}): Promise<{ data: GuestBooking | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...bookingData,
        guest_booking: true,
        status: 'pending',
        currency: bookingData.currency || 'USD',
        timezone: bookingData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating guest booking:', error)
      return { data: null, error: error.message }
    }

    return { data: data as GuestBooking, error: null }
  } catch (error) {
    console.error('Exception creating guest booking:', error)
    return { data: null, error: 'Failed to create guest booking' }
  }
}

/**
 * Get guest booking details including guest user, provider, and listing info
 */
export async function getGuestBookingDetails(bookingId: string): Promise<{
  data: GuestBookingDetails | null
  error: string | null
}> {
  try {
    const { data, error } = await supabase.rpc('get_guest_booking_details', {
      p_booking_id: bookingId
    })

    if (error) {
      console.error('Error getting guest booking details:', error)
      return { data: null, error: error.message }
    }

    if (data?.error) {
      return { data: null, error: data.error }
    }

    return { data: data as GuestBookingDetails, error: null }
  } catch (error) {
    console.error('Exception getting guest booking details:', error)
    return { data: null, error: 'Failed to get booking details' }
  }
}

/**
 * Convert guest bookings to user bookings when guest creates account
 */
export async function convertGuestToUser(
  guestEmail: string, 
  userId: string
): Promise<{ success: boolean; convertedBookings?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('convert_guest_to_user', {
      p_guest_email: guestEmail,
      p_user_id: userId
    })

    if (error) {
      console.error('Error converting guest to user:', error)
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return { 
      success: true, 
      convertedBookings: data.converted_bookings 
    }
  } catch (error) {
    console.error('Exception converting guest to user:', error)
    return { success: false, error: 'Failed to convert guest bookings' }
  }
}

/**
 * Get all guest bookings for a provider
 */
export async function getProviderGuestBookings(providerId: string): Promise<{
  data: GuestBookingDetails[]
  error: string | null
}> {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        guest_customer:guest_users!guest_customer_id(*),
        listing:listings(id, title, category),
        provider:users!provider_id(id, name, email, avatar_url)
      `)
      .eq('provider_id', providerId)
      .eq('guest_booking', true)
      .order('start_time', { ascending: false })

    if (error) {
      console.error('Error getting provider guest bookings:', error)
      return { data: [], error: error.message }
    }

    const formattedBookings = (bookings || []).map((booking: any) => ({
      booking: {
        ...booking,
        guest_customer_id: booking.guest_customer_id,
        guest_booking: true,
      },
      guest_customer: booking.guest_customer,
      provider: booking.provider,
      listing: booking.listing,
    }))

    return { data: formattedBookings, error: null }
  } catch (error) {
    console.error('Exception getting provider guest bookings:', error)
    return { data: [], error: 'Failed to get guest bookings' }
  }
}

/**
 * Update guest booking status
 */
export async function updateGuestBookingStatus(
  bookingId: string,
  status: GuestBooking['status'],
  providerNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: any = { 
      status,
      updated_at: new Date().toISOString()
    }
    
    if (providerNotes) {
      updates.provider_notes = providerNotes
    }

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
    } else if (status === 'cancelled') {
      updates.cancelled_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .eq('guest_booking', true)

    if (error) {
      console.error('Error updating guest booking status:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Exception updating guest booking status:', error)
    return { success: false, error: 'Failed to update booking status' }
  }
}

/**
 * Send guest booking confirmation email
 */
export async function sendGuestBookingConfirmation(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: bookingDetails, error: detailsError } = await getGuestBookingDetails(bookingId)
    
    if (detailsError || !bookingDetails) {
      return { success: false, error: detailsError || 'Booking not found' }
    }

    // Send confirmation notifications
    await sendBookingConfirmation(
      bookingDetails.booking as any,
      bookingDetails.guest_customer as any,
      bookingDetails.provider,
      bookingDetails.listing as any
    )

    return { success: true }
  } catch (error) {
    console.error('Exception sending guest booking confirmation:', error)
    return { success: false, error: 'Failed to send confirmation' }
  }
}

/**
 * Check if email exists as guest user
 */
export async function checkGuestUserExists(email: string): Promise<{
  exists: boolean
  guestUser?: GuestUser
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from('guest_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking guest user:', error)
      return { exists: false, error: error.message }
    }

    return { 
      exists: !!data, 
      guestUser: data as GuestUser | undefined 
    }
  } catch (error) {
    console.error('Exception checking guest user:', error)
    return { exists: false, error: 'Failed to check guest user' }
  }
}

/**
 * Get guest booking analytics
 */
export async function getGuestBookingAnalytics(
  startDate?: string,
  endDate?: string
): Promise<{
  data: any[]
  error: string | null
}> {
  try {
    let query = supabase
      .from('guest_booking_analytics')
      .select('*')
      .order('booking_date', { ascending: false })

    if (startDate) {
      query = query.gte('booking_date', startDate)
    }
    if (endDate) {
      query = query.lte('booking_date', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting guest booking analytics:', error)
      return { data: [], error: error.message }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('Exception getting guest booking analytics:', error)
    return { data: [], error: 'Failed to get analytics' }
  }
}

/**
 * Clean up old guest users (older than 30 days with no bookings)
 */
export async function cleanupOldGuestUsers(): Promise<{
  success: boolean
  deletedCount?: number
  error?: string
}> {
  try {
    // Delete guest users older than 30 days with no bookings
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('guest_users')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .not('id', 'in', 
        supabase
          .from('bookings')
          .select('guest_customer_id')
          .eq('guest_booking', true)
          .not('guest_customer_id', 'is', null)
      )

    if (error) {
      console.error('Error cleaning up guest users:', error)
      return { success: false, error: error.message }
    }

    return { 
      success: true, 
      deletedCount: Array.isArray(data) ? data.length : 0 
    }
  } catch (error) {
    console.error('Exception cleaning up guest users:', error)
    return { success: false, error: 'Failed to cleanup guest users' }
  }
}
