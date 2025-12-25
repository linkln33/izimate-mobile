/**
 * Booking Form Validation Schemas
 * Using Zod for type-safe validation
 */

import { z } from 'zod'

// Booking date/time validation
export const bookingDateSchema = z.object({
  date: z.date({
    required_error: 'Date is required',
    invalid_type_error: 'Invalid date format',
  }),
  time: z.string().min(1, 'Time is required'),
  serviceName: z.string().min(1, 'Service name is required'),
  servicePrice: z.number().min(0, 'Price must be positive'),
  currency: z.string().optional(),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
  customerNotes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
})

// Recurring pattern validation
export const recurringPatternSchema = z.object({
  recurrencePattern: z.enum(['daily', 'weekly', 'monthly'], {
    required_error: 'Recurrence pattern is required',
  }),
  recurrenceEndDate: z.string().min(1, 'End date is required'),
  numberOfOccurrences: z.number().min(1).max(52).optional(),
})

// Complete booking selection schema
export const bookingSelectionSchema = bookingDateSchema.extend({
  recurringPattern: recurringPatternSchema.optional(),
})

export type BookingDateInput = z.infer<typeof bookingDateSchema>
export type RecurringPatternInput = z.infer<typeof recurringPatternSchema>
export type BookingSelectionInput = z.infer<typeof bookingSelectionSchema>

