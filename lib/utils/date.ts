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
