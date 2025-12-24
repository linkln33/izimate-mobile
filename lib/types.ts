// Complete types for mobile app - matching web app types

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  phone?: string
  location_address?: string
  location_lat?: number
  location_lng?: number
  city?: string
  region?: string
  country?: string
  bio?: string
  verification_status: 'unverified' | 'verified' | 'pro'
  currency?: string
  identity_verified?: boolean
  identity_verification_id?: string
  identity_verified_at?: string
  identity_verification_status?: 'pending' | 'processing' | 'verified' | 'failed' | 'rejected'
  referred_by_code?: string
  referral_code?: string
  push_token?: string
  created_at: string
  last_active: string
}

export interface ProviderProfile {
  id: string
  user_id: string
  services_offered: string[]
  expertise_tags: string[]
  hourly_rate?: number
  price_tier?: '$' | '$$' | '$$$'
  portfolio_photos: string[]
  jobs_completed: number
  rating: number
  response_time_hours: number
  is_available_now: boolean
  background_check_status: 'none' | 'pending' | 'passed' | 'failed'
  insurance_verified: boolean
  cal_username?: string
  cal_event_slug?: string
  cal_api_key?: string
  cal_connected?: boolean
  timezone?: string
  background_check_verified?: boolean
  background_check_document_url?: string
  background_check_verified_at?: string
  license_verified?: boolean
  license_document_url?: string
  license_number?: string
  license_verified_at?: string
  insurance_document_url?: string
  insurance_expires_at?: string
  insurance_verified_at?: string
  business_verified?: boolean
  business_registration_number?: string
  business_verified_at?: string
  verification_score?: number
}

export interface Listing {
  id: string
  user_id: string
  title: string
  description: string
  category: string
  tags: string[]
  listing_type?: 'service' | 'goods' | 'book' | 'pdf' | 'gated_content'
  budget_min?: number
  budget_max?: number
  budget_type: 'fixed' | 'range' | 'hourly' | 'price_list'
  price_list?: Array<{ id: string; serviceName: string; price: string }>
  location_lat: number
  location_lng: number
  location_address?: string
  show_exact_address: boolean
  photos: string[]
  urgency: 'asap' | 'this_week' | 'flexible' | null
  preferred_date?: string
  status: 'active' | 'matched' | 'in_progress' | 'completed' | 'cancelled'
  expires_at: string
  view_count: number
  swipe_count: number
  match_count: number
  stock_quantity?: number
  shipping_available?: boolean
  shipping_cost?: number
  isbn?: string
  author?: string
  book_format?: 'physical' | 'ebook' | 'both'
  file_url?: string
  file_size?: string
  download_limit?: number
  access_level?: 'free' | 'premium' | 'vip'
  content_preview?: string
  enable_affiliate?: boolean
  affiliate_commission?: number
  affiliate_commission_type?: 'percentage' | 'fixed'
  // Booking system fields
  booking_enabled?: boolean
  service_type?: string
  service_name?: string
  time_slots?: Array<{
    id: string
    day: string
    startTime: string
    endTime: string
    service?: string
    notes?: string
  }>
  timezone?: string
  booking_advance_days?: number
  currency?: string
  created_at: string
  updated_at: string
}

export interface Swipe {
  id: string
  swiper_id: string
  listing_id?: string
  provider_id?: string
  swipe_type: 'provider_on_listing' | 'customer_on_provider' | 'customer_on_listing'
  direction: 'right' | 'left' | 'super'
  created_at: string
}

export interface Match {
  id: string
  listing_id: string
  customer_id: string
  provider_id: string
  status: 'pending' | 'negotiating' | 'booked' | 'in_progress' | 'completed' | 'cancelled'
  proposed_price?: number
  final_price?: number
  proposed_date?: string
  final_date?: string
  matched_at: string
  booked_at?: string
  completed_at?: string
  super_liked_by?: string
  booking_id?: string
}

export interface Message {
  id: string
  match_id: string
  sender_id: string
  recipient_id?: string
  content: string
  message_type: 'text' | 'image' | 'price_proposal' | 'date_proposal'
  metadata?: {
    price?: number
    date?: string
    image_url?: string
    [key: string]: any
  }
  read_at?: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'match' | 'interested' | 'message' | 'review' | 'pending_approval' | 'rejection' | 'liked' | 'booking_confirmed' | 'booking_request' | 'booking_cancelled' | 'booking_completed' | 'booking_reminder' | 'booking_status_update'
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface PendingApproval {
  id: string
  listing_id: string
  customer_id: string
  provider_id: string
  requested_time_slot_start?: string
  requested_time_slot_end?: string
  requested_price?: number
  customer_message?: string
  status: 'pending' | 'approved' | 'rejected'
  provider_notes?: string
  provider_response_time?: string
  expires_at: string
  created_at: string
}

export interface Affiliate {
  id: string
  user_id: string
  referral_code: string
  tier: 'standard' | 'premium' | 'elite'
  total_referrals: number
  active_referrals: number
  total_earnings: number
  pending_earnings: number
  paid_earnings: number
  payout_method?: 'bank_transfer' | 'revolut' | 'paypal'
  payout_details?: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Referral {
  id: string
  affiliate_id: string
  referred_user_id: string
  referral_code: string
  plan_type?: 'pro' | 'business'
  status: 'pending' | 'converted' | 'active' | 'cancelled' | 'expired'
  conversion_date?: string
  subscription_id?: string
  subscription_status?: string
  one_time_commission_paid: boolean
  one_time_commission_amount: number
  recurring_commission_months: number
  recurring_commission_total: number
  total_earned: number
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  match_id?: string
  listing_id: string
  provider_id: string
  customer_id: string
  cal_booking_id?: string
  cal_event_type_id?: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  timezone: string
  service_address?: string
  service_address_lat?: number
  service_address_lng?: number
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ListingQuota {
  canCreate: boolean
  current: number
  limit: number
  remaining: number
  requiresVerification?: boolean
  requiresBusinessVerification?: boolean
}

export interface SuperLikeQuota {
  canSuperLike: boolean
  used: number
  limit: number
  remaining: number
}

export interface SwipeResult {
  success: boolean
  match?: Match
  pendingApproval?: {
    id: string
    status: 'pending'
  }
  error?: string
}
