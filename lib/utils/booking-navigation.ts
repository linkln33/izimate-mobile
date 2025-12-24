/**
 * Centralized booking navigation helpers
 * Provides consistent navigation to booking-related screens
 */

import { Router } from 'expo-router'

/**
 * Navigate to booking details screen
 */
export function navigateToBookingDetails(bookingId: string, router: Router) {
  router.push(`/bookings/${bookingId}`)
}

/**
 * Navigate to booking creation screen
 */
export function navigateToBookingCreation(listingId: string, router: Router) {
  router.push(`/booking/${listingId}`)
}

/**
 * Navigate to booking calendar
 */
export function navigateToBookingCalendar(listingId: string, router: Router) {
  router.push(`/booking/${listingId}`)
}

/**
 * Navigate to chat with provider/customer
 */
export function navigateToBookingChat(userId: string, router: Router) {
  router.push(`/chat/${userId}`)
}

/**
 * Navigate to review screen
 */
export function navigateToReview(bookingId: string, providerId: string, router: Router) {
  // This route may need to be created
  router.push(`/review?bookingId=${bookingId}&providerId=${providerId}`)
}

/**
 * Get booking details URL (for notifications/deep links)
 */
export function getBookingDetailsUrl(bookingId: string): string {
  return `/bookings/${bookingId}`
}

