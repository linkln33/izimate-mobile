/**
 * Date formatting utilities for mobile platform (React Native)
 * Provides consistent date/time formatting across the mobile application
 */

/**
 * Format a date string or Date object to a readable date string
 * Example: "Dec 21, 2024"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

/**
 * Format a date string or Date object to a full date string
 * Example: "December 21, 2024"
 */
export function formatDateFull(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

/**
 * Format a time from a date string or Date object
 * Example: "2:30 PM"
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''
    
    return dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

/**
 * Format a date and time together
 * Example: "Dec 21, 2024 2:30 PM"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''
    
    return `${formatDate(dateObj)} ${formatTime(dateObj)}`
  } catch {
    return ''
  }
}

/**
 * Format a date range
 * Example: "Dec 21, 2024 - Dec 25, 2024"
 */
export function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string {
  if (!startDate && !endDate) return ''
  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }
  if (startDate) return formatDate(startDate)
  if (endDate) return formatDate(endDate)
  return ''
}

/**
 * Format a time range
 * Example: "2:30 PM - 4:00 PM"
 */
export function formatTimeRange(
  startTime: string | Date | null | undefined,
  endTime: string | Date | null | undefined
): string {
  if (!startTime && !endTime) return ''
  if (startTime && endTime) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`
  }
  if (startTime) return formatTime(startTime)
  if (endTime) return formatTime(endTime)
  return ''
}

/**
 * Format a date relative to now
 * Example: "2 hours ago", "3 days ago", "just now"
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return 'recently'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return 'recently'
    
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    if (diffSeconds < 60) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
    if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`
  } catch {
    return 'recently'
  }
}
