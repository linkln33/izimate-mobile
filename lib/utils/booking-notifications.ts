import { supabase } from '../supabase'
import { createNotification } from './notifications'
import { scheduleBookingReminder, showBookingNotification } from './push-notifications'
import type { Booking, User, Listing } from '../types'

export interface BookingNotificationConfig {
  sendPush: boolean
  sendInApp: boolean
  scheduleReminders: boolean
  reminderTimes: number[] // Hours before booking
}

const DEFAULT_CONFIG: BookingNotificationConfig = {
  sendPush: true,
  sendInApp: true,
  scheduleReminders: true,
  reminderTimes: [24, 2], // 24 hours and 2 hours before
}

/**
 * Send booking confirmation notifications
 */
export async function sendBookingConfirmation(
  booking: Booking,
  customer: User,
  provider: User,
  listing: Listing,
  config: BookingNotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  const bookingDate = new Date(booking.start_time)
  const formattedDate = bookingDate.toLocaleDateString()
  const formattedTime = bookingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Notify customer
  const customerTitle = 'Booking Confirmed! 🎉'
  const customerMessage = `Your booking for "${listing.title}" is confirmed for ${formattedDate} at ${formattedTime}`

  if (config.sendInApp) {
    await createNotification(
      customer.id,
      'booking_confirmed',
      customerTitle,
      customerMessage,
      `/bookings/${booking.id}`
    )
  }

  if (config.sendPush) {
    await showBookingNotification({
      bookingId: booking.id,
      type: 'booking_confirmed',
      title: customerTitle,
      body: customerMessage,
      data: {
        listingId: listing.id,
        providerId: provider.id,
        bookingDate: booking.start_time,
      },
    })
  }

  // Notify provider
  const providerTitle = 'New Booking Received! 💼'
  const providerMessage = `${customer.name} booked "${listing.title}" for ${formattedDate} at ${formattedTime}`

  if (config.sendInApp) {
    await createNotification(
      provider.id,
      'booking_confirmed',
      providerTitle,
      providerMessage,
      `/bookings/${booking.id}`
    )
  }

  if (config.sendPush) {
    await showBookingNotification({
      bookingId: booking.id,
      type: 'booking_confirmed',
      title: providerTitle,
      body: providerMessage,
      data: {
        listingId: listing.id,
        customerId: customer.id,
        bookingDate: booking.start_time,
      },
    })
  }

  // Schedule reminders
  if (config.scheduleReminders) {
    await scheduleBookingReminders(booking, customer, provider, listing, config.reminderTimes)
  }
}

/**
 * Send booking request notifications (for approval-required bookings)
 */
export async function sendBookingRequest(
  booking: Booking,
  customer: User,
  provider: User,
  listing: Listing,
  config: BookingNotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  const bookingDate = new Date(booking.start_time)
  const formattedDate = bookingDate.toLocaleDateString()
  const formattedTime = bookingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Notify provider about new request
  const providerTitle = 'New Booking Request ⏰'
  const providerMessage = `${customer.name} wants to book "${listing.title}" for ${formattedDate} at ${formattedTime}`

  if (config.sendInApp) {
    await createNotification(
      provider.id,
      'booking_request',
      providerTitle,
      providerMessage,
      `/bookings/requests/${booking.id}`
    )
  }

  if (config.sendPush) {
    await showBookingNotification({
      bookingId: booking.id,
      type: 'booking_request',
      title: providerTitle,
      body: providerMessage,
      data: {
        listingId: listing.id,
        customerId: customer.id,
        bookingDate: booking.start_time,
        requiresApproval: true,
      },
    })
  }

  // Notify customer about pending request
  const customerTitle = 'Booking Request Sent 📤'
  const customerMessage = `Your booking request for "${listing.title}" has been sent to ${provider.name}. You'll be notified when they respond.`

  if (config.sendInApp) {
    await createNotification(
      customer.id,
      'booking_request',
      customerTitle,
      customerMessage,
      `/bookings/${booking.id}`
    )
  }
}

/**
 * Send booking cancellation notifications
 */
export async function sendBookingCancellation(
  booking: Booking,
  customer: User,
  provider: User,
  listing: Listing,
  cancelledBy: 'customer' | 'provider',
  reason?: string,
  config: BookingNotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  const bookingDate = new Date(booking.start_time)
  const formattedDate = bookingDate.toLocaleDateString()
  const formattedTime = bookingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const cancellerName = cancelledBy === 'customer' ? customer.name : provider.name
  const recipientId = cancelledBy === 'customer' ? provider.id : customer.id

  const title = 'Booking Cancelled ❌'
  const message = `Your booking for "${listing.title}" on ${formattedDate} at ${formattedTime} has been cancelled by ${cancellerName}${reason ? `. Reason: ${reason}` : ''}`

  if (config.sendInApp) {
    await createNotification(
      recipientId,
      'booking_cancelled',
      title,
      message,
      `/bookings/${booking.id}`
    )
  }

  if (config.sendPush) {
    await showBookingNotification({
      bookingId: booking.id,
      type: 'booking_cancelled',
      title,
      body: message,
      data: {
        listingId: listing.id,
        cancelledBy,
        reason,
      },
    })
  }

  // Cancel any scheduled reminders
  await cancelBookingReminders(booking.id)
}

/**
 * Send booking completion notifications
 */
export async function sendBookingCompletion(
  booking: Booking,
  customer: User,
  provider: User,
  listing: Listing,
  config: BookingNotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  // Notify customer
  const customerTitle = 'Service Completed! ⭐'
  const customerMessage = `Your booking for "${listing.title}" with ${provider.name} is complete. Please rate your experience!`

  if (config.sendInApp) {
    await createNotification(
      customer.id,
      'booking_completed',
      customerTitle,
      customerMessage,
      `/bookings/${booking.id}/rate`
    )
  }

  if (config.sendPush) {
    await showBookingNotification({
      bookingId: booking.id,
      type: 'booking_completed',
      title: customerTitle,
      body: customerMessage,
      data: {
        listingId: listing.id,
        providerId: provider.id,
        showRating: true,
      },
    })
  }

  // Notify provider
  const providerTitle = 'Service Completed! 💼'
  const providerMessage = `Your service "${listing.title}" for ${customer.name} is marked as complete. Great job!`

  if (config.sendInApp) {
    await createNotification(
      provider.id,
      'booking_completed',
      providerTitle,
      providerMessage,
      `/bookings/${booking.id}`
    )
  }
}

/**
 * Schedule booking reminders
 */
async function scheduleBookingReminders(
  booking: Booking,
  customer: User,
  provider: User,
  listing: Listing,
  reminderTimes: number[]
): Promise<void> {
  const bookingDate = new Date(booking.start_time)
  const formattedDate = bookingDate.toLocaleDateString()
  const formattedTime = bookingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  for (const hoursBeforeBooking of reminderTimes) {
    const reminderTime = new Date(bookingDate.getTime() - hoursBeforeBooking * 60 * 60 * 1000)
    
    // Only schedule if reminder time is in the future
    if (reminderTime > new Date()) {
      // Customer reminder
      const customerTitle = `Upcoming Booking Reminder 🔔`
      const customerMessage = `Your booking for "${listing.title}" with ${provider.name} is in ${hoursBeforeBooking} hour${hoursBeforeBooking > 1 ? 's' : ''} (${formattedDate} at ${formattedTime})`
      
      await scheduleBookingReminder(
        `${booking.id}-customer-${hoursBeforeBooking}h`,
        customerTitle,
        customerMessage,
        reminderTime
      )

      // Provider reminder
      const providerTitle = `Upcoming Service Reminder 💼`
      const providerMessage = `You have a booking with ${customer.name} for "${listing.title}" in ${hoursBeforeBooking} hour${hoursBeforeBooking > 1 ? 's' : ''} (${formattedDate} at ${formattedTime})`
      
      await scheduleBookingReminder(
        `${booking.id}-provider-${hoursBeforeBooking}h`,
        providerTitle,
        providerMessage,
        reminderTime
      )
    }
  }
}

/**
 * Cancel all reminders for a booking
 */
async function cancelBookingReminders(bookingId: string): Promise<void> {
  try {
    // Get all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync()
    
    // Find and cancel booking-related notifications
    const bookingNotifications = scheduledNotifications.filter(notification => 
      notification.identifier.startsWith(bookingId)
    )

    for (const notification of bookingNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier)
    }
  } catch (error) {
    console.error('Error cancelling booking reminders:', error)
  }
}

/**
 * Send booking status update notifications
 */
export async function sendBookingStatusUpdate(
  booking: Booking,
  customer: User,
  provider: User,
  listing: Listing,
  newStatus: Booking['status'],
  config: BookingNotificationConfig = DEFAULT_CONFIG
): Promise<void> {
  const statusMessages = {
    pending: 'Your booking is pending approval',
    confirmed: 'Your booking has been confirmed',
    cancelled: 'Your booking has been cancelled',
    completed: 'Your booking has been completed',
  }

  const title = 'Booking Status Update 📋'
  const message = `${listing.title}: ${statusMessages[newStatus]}`

  // Notify customer
  if (config.sendInApp) {
    await createNotification(
      customer.id,
      'booking_status_update',
      title,
      message,
      `/bookings/${booking.id}`
    )
  }

  if (config.sendPush) {
    await showBookingNotification({
      bookingId: booking.id,
      type: 'booking_status_update',
      title,
      body: message,
      data: {
        listingId: listing.id,
        providerId: provider.id,
        newStatus,
      },
    })
}
}