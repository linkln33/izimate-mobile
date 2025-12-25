/**
 * Listing Form Validation Schemas
 */

import { z } from 'zod'

export const listingBasicInfoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be less than 2000 characters'),
  category: z.string().min(1, 'Category is required'),
  urgency: z.enum(['asap', 'this_week', 'flexible']).optional().nullable(),
})

export const listingLocationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().optional(),
  country: z.string().optional(),
})

export const listingBudgetSchema = z.object({
  budgetType: z.enum(['fixed', 'range', 'hourly', 'price_list']),
  fixedPrice: z.number().min(0).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  hourlyRate: z.number().min(0).optional(),
  currency: z.string().default('GBP'),
  priceList: z.array(z.object({
    id: z.string(),
    serviceName: z.string(),
    price: z.string(),
  })).optional(),
}).refine(
  (data) => {
    if (data.budgetType === 'fixed') return data.fixedPrice !== undefined
    if (data.budgetType === 'range') return data.minPrice !== undefined && data.maxPrice !== undefined
    if (data.budgetType === 'hourly') return data.hourlyRate !== undefined
    if (data.budgetType === 'price_list') return data.priceList && data.priceList.length > 0
    return true
  },
  {
    message: 'Price information is required for selected budget type',
  }
)

export type ListingBasicInfoInput = z.infer<typeof listingBasicInfoSchema>
export type ListingLocationInput = z.infer<typeof listingLocationSchema>
export type ListingBudgetInput = z.infer<typeof listingBudgetSchema>

