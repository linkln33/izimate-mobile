/**
 * Guest Checkout Validation Schema
 */

import { z } from 'zod'

export const guestCheckoutSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  serviceAddress: z.string().optional(),
  serviceAddressLat: z.number().optional(),
  serviceAddressLng: z.number().optional(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
  emailOptIn: z.boolean().default(false),
})

export type GuestCheckoutInput = z.infer<typeof guestCheckoutSchema>

