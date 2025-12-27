import { useState, useCallback, useMemo } from 'react'
import type { Listing } from '@/lib/types'
import { normalizePhotoUrls } from '@/lib/utils/images'

export type Step = 1 | 2 | 3 | 4 | 5 | 6
export type BudgetType = 'fixed' | 'range' | 'price_list'
export type Urgency = 'asap' | 'this_week' | 'flexible' | null

export interface ListingFormState {
  // Step 1: Basic Information
  title: string
  description: string
  category: string
  tags: string[]
  photos: string[]
  categoryDropdownOpen: boolean
  tagInput: string
  listing_type?: 'service' | 'goods' | 'rental' | 'book' | 'pdf' | 'gated_content' | 'experience' | 'digital_services' | 'fundraising' | 'transportation'
  
  // Step 2: Budget & Urgency
  budgetType: BudgetType
  budgetMin: string
  budgetMax: string
  urgency: Urgency | null
  preferredDate: string
  price_list?: any[] // Array of {serviceName, price} objects
  currency?: string // Currency code (e.g., 'GBP', 'USD', 'EUR')
  
  // Rental-specific fields
  rental_duration_type?: 'hourly' | 'daily' | 'weekly' | 'monthly'
  rental_min_duration?: number
  rental_max_duration?: number
  rental_rate_hourly?: string
  rental_rate_daily?: string
  rental_rate_weekly?: string
  rental_rate_monthly?: string
  security_deposit?: string
  cleaning_fee?: string
  insurance_required?: boolean
  pickup_available?: boolean
  delivery_available?: boolean
  delivery_cost?: string
  condition_notes?: string
  rental_availability_periods?: Array<{
    id: string
    start_date: string
    end_date: string
    is_available: boolean
    notes?: string
  }>
  
  // Experience-specific fields
  experience_duration_hours?: number
  experience_max_participants?: number
  experience_min_age?: number
  experience_includes?: string[]
  experience_meeting_point?: string
  experience_cancellation_policy?: string
  
  // Subscription-specific fields
  subscription_billing_cycle?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  subscription_trial_days?: number
  subscription_auto_renew?: boolean
  subscription_features?: string[]
  
  // Freelance-specific fields
  freelance_category?: 'ugc' | 'design' | 'writing' | 'video' | 'photography' | 'social_media' | 'consulting' | 'other'
  freelance_portfolio_url?: string
  freelance_delivery_days?: number
  freelance_revisions_included?: number
  freelance_skills?: string[]
  
  // Auction-specific fields
  auction_start_price?: string
  auction_reserve_price?: string
  auction_end_time?: string
  auction_bid_increment?: string
  auction_buy_now_price?: string
  
  // Space Sharing-specific fields
  space_type?: 'parking' | 'storage' | 'workspace' | 'event_venue' | 'studio' | 'kitchen' | 'couchsurfing' | 'other'
  space_capacity?: number
  space_amenities?: string[]
  space_hourly_rate?: string
  space_daily_rate?: string
  
  // Fundraising-specific fields
  fundraising_goal?: string
  fundraising_end_date?: string
  fundraising_category?: 'charity' | 'personal' | 'business' | 'event' | 'medical' | 'education' | 'other'
  fundraising_beneficiary?: string
  
  // Delivery-specific fields
  delivery_type?: 'food' | 'grocery' | 'package' | 'medicine' | 'other'
  delivery_radius_km?: number
  delivery_fee_structure?: 'fixed' | 'distance_based' | 'weight_based'
  delivery_estimated_time?: number
  
  // Taxi-specific fields
  taxi_vehicle_type?: 'standard' | 'luxury' | 'van' | 'motorcycle' | 'bike'
  taxi_max_passengers?: number
  taxi_license_number?: string
  
  // Link-specific fields
  link_url?: string
  link_type?: 'affiliate' | 'redirect' | 'short_link'
  
  // Step 3: Booking & Schedule
  booking_enabled?: boolean
  service_name?: string
  time_slots?: any[] // Array of TimeSlot objects
  
  // Step 4: Settings (Cancellation & Review Incentives)
  cancellation_hours?: number // Hours before booking that cancellation is allowed
  cancellation_fee_enabled?: boolean
  cancellation_fee_percentage?: number // Percentage of booking price
  cancellation_fee_amount?: number // Fixed fee amount
  refund_policy?: string // 'full', 'partial', 'none'
  
  // Review Incentive Settings
  review_incentive_enabled?: boolean
  review_incentive_type?: 'discount' | 'credit' | 'points'
  review_discount_percentage?: number
  review_discount_amount?: number
  review_min_rating?: number // Minimum rating to get incentive
  review_require_text?: boolean
  review_max_uses_per_customer?: number
  review_auto_generate_coupon?: boolean
  review_coupon_code_prefix?: string
  review_coupon_valid_days?: number
  review_incentive_message?: string
  review_platforms?: string[] // ['in_app', 'facebook', 'google']
  facebook_page_id?: string
  facebook_page_url?: string
  google_place_id?: string
  google_business_url?: string
  
  // Step 5: Location
  locationAddress: string
  locationLat: number | null
  locationLng: number | null
  showExactAddress: boolean
  streetAddress: string
  city: string
  state: string
  postalCode: string
  country: string
  locationNotes: string
}

export interface ListingFormActions {
  // Step 1
  setTitle: (value: string) => void
  setDescription: (value: string) => void
  setCategory: (value: string) => void
  setTags: (value: string[]) => void
  setPhotos: (value: string[]) => void
  setCategoryDropdownOpen: (value: boolean) => void
  setTagInput: (value: string) => void
  setListingType?: (value: 'service' | 'goods' | 'rental' | 'book' | 'pdf' | 'gated_content' | 'experience' | 'digital_services' | 'fundraising' | 'transportation') => void
  
  // Step 2
  setBudgetType: (value: BudgetType) => void
  setBudgetMin: (value: string) => void
  setBudgetMax: (value: string) => void
  setUrgency: (value: Urgency | null) => void
  setPreferredDate: (value: string) => void
  setPriceList?: (value: any[]) => void
  setCurrency?: (value: string) => void
  
  // Rental-specific setters
  setRentalDurationType?: (value: 'hourly' | 'daily' | 'weekly' | 'monthly') => void
  setRentalMinDuration?: (value: number) => void
  setRentalMaxDuration?: (value: number) => void
  setRentalRateHourly?: (value: string) => void
  setRentalRateDaily?: (value: string) => void
  setRentalRateWeekly?: (value: string) => void
  setRentalRateMonthly?: (value: string) => void
  setSecurityDeposit?: (value: string) => void
  setCleaningFee?: (value: string) => void
  setInsuranceRequired?: (value: boolean) => void
  setPickupAvailable?: (value: boolean) => void
  setDeliveryAvailable?: (value: boolean) => void
  setDeliveryCost?: (value: string) => void
  setConditionNotes?: (value: string) => void
  setRentalAvailabilityPeriods?: (value: Array<{
    id: string
    start_date: string
    end_date: string
    is_available: boolean
    notes?: string
  }>) => void
  
  // Experience-specific setters
  setExperienceDurationHours?: (value: number) => void
  setExperienceMaxParticipants?: (value: number) => void
  setExperienceMinAge?: (value: number) => void
  setExperienceIncludes?: (value: string[]) => void
  setExperienceMeetingPoint?: (value: string) => void
  setExperienceCancellationPolicy?: (value: string) => void
  
  // Subscription-specific setters
  setSubscriptionBillingCycle?: (value: 'weekly' | 'monthly' | 'quarterly' | 'yearly') => void
  setSubscriptionTrialDays?: (value: number) => void
  setSubscriptionAutoRenew?: (value: boolean) => void
  setSubscriptionFeatures?: (value: string[]) => void
  
  // Freelance-specific setters
  setFreelanceCategory?: (value: 'ugc' | 'design' | 'writing' | 'video' | 'photography' | 'social_media' | 'consulting' | 'other') => void
  setFreelancePortfolioUrl?: (value: string) => void
  setFreelanceDeliveryDays?: (value: number) => void
  setFreelanceRevisionsIncluded?: (value: number) => void
  setFreelanceSkills?: (value: string[]) => void
  
  // Auction-specific setters
  setAuctionStartPrice?: (value: string) => void
  setAuctionReservePrice?: (value: string) => void
  setAuctionEndTime?: (value: string) => void
  setAuctionBidIncrement?: (value: string) => void
  setAuctionBuyNowPrice?: (value: string) => void
  
  // Space Sharing-specific setters
  setSpaceType?: (value: 'parking' | 'storage' | 'workspace' | 'event_venue' | 'studio' | 'kitchen' | 'couchsurfing' | 'other') => void
  setSpaceCapacity?: (value: number) => void
  setSpaceAmenities?: (value: string[]) => void
  setSpaceHourlyRate?: (value: string) => void
  setSpaceDailyRate?: (value: string) => void
  
  // Fundraising-specific setters
  setFundraisingGoal?: (value: string) => void
  setFundraisingEndDate?: (value: string) => void
  setFundraisingCategory?: (value: 'charity' | 'personal' | 'business' | 'event' | 'medical' | 'education' | 'other') => void
  setFundraisingBeneficiary?: (value: string) => void
  
  // Delivery-specific setters
  setDeliveryType?: (value: 'food' | 'grocery' | 'package' | 'medicine' | 'other') => void
  setDeliveryRadiusKm?: (value: number) => void
  setDeliveryFeeStructure?: (value: 'fixed' | 'distance_based' | 'weight_based') => void
  setDeliveryEstimatedTime?: (value: number) => void
  
  // Taxi-specific setters
  setTaxiVehicleType?: (value: 'standard' | 'luxury' | 'van' | 'motorcycle' | 'bike') => void
  setTaxiMaxPassengers?: (value: number) => void
  setTaxiLicenseNumber?: (value: string) => void
  
  // Link-specific setters
  setLinkUrl?: (value: string) => void
  setLinkType?: (value: 'affiliate' | 'redirect' | 'short_link') => void
  
  // Step 3: Booking & Schedule
  setBookingEnabled?: (value: boolean) => void
  setServiceName?: (value: string) => void
  setTimeSlots?: (value: any[]) => void
  
  // Step 4: Settings
  setCancellationHours?: (value: number) => void
  setCancellationFeeEnabled?: (value: boolean) => void
  setCancellationFeePercentage?: (value: number) => void
  setCancellationFeeAmount?: (value: number) => void
  setRefundPolicy?: (value: string) => void
  
  setReviewIncentiveEnabled?: (value: boolean) => void
  setReviewIncentiveType?: (value: 'discount' | 'credit' | 'points') => void
  setReviewDiscountPercentage?: (value: number) => void
  setReviewDiscountAmount?: (value: number) => void
  setReviewMinRating?: (value: number) => void
  setReviewRequireText?: (value: boolean) => void
  setReviewMaxUsesPerCustomer?: (value: number) => void
  setReviewAutoGenerateCoupon?: (value: boolean) => void
  setReviewCouponCodePrefix?: (value: string) => void
  setReviewCouponValidDays?: (value: number) => void
  setReviewIncentiveMessage?: (value: string) => void
  setReviewPlatforms?: (value: string[]) => void
  setFacebookPageId?: (value: string) => void
  setFacebookPageUrl?: (value: string) => void
  setGooglePlaceId?: (value: string) => void
  setGoogleBusinessUrl?: (value: string) => void
  
  // Step 5: Location
  setLocationAddress: (value: string) => void
  setLocationLat: (value: number | null) => void
  setLocationLng: (value: number | null) => void
  setShowExactAddress: (value: boolean) => void
  setStreetAddress: (value: string) => void
  setCity: (value: string) => void
  setState: (value: string) => void
  setPostalCode: (value: string) => void
  setCountry: (value: string) => void
  setLocationNotes: (value: string) => void
  
  // Reset
  resetForm: () => void
  loadFromListing: (listing: Listing) => void
}

export function useListingForm(isEditMode: boolean) {
  // Step 1: Basic Information
  const [title, setTitle] = useState(() => '')
  const [description, setDescription] = useState(() => '')
  const [category, setCategory] = useState(() => '')
  const [tags, setTags] = useState<string[]>(() => [])
  const [photos, setPhotos] = useState<string[]>(() => [])
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(() => false)
  const [tagInput, setTagInput] = useState(() => '')
  const [listingType, setListingType] = useState<'service' | 'goods' | 'rental' | 'book' | 'pdf' | 'gated_content' | 'experience' | 'subscription' | 'freelance' | 'auction' | 'space_sharing' | 'fundraising' | 'delivery' | 'taxi' | 'link'>(() => 'service')
  
  // Step 2: Budget & Urgency
  const [budgetType, setBudgetType] = useState<BudgetType>(() => 'range')
  const [budgetMin, setBudgetMin] = useState(() => '')
  const [budgetMax, setBudgetMax] = useState(() => '')
  const [urgency, setUrgency] = useState<Urgency | null>(() => null)
  const [preferredDate, setPreferredDate] = useState(() => '')
  const [priceList, setPriceList] = useState<any[]>(() => [])
  const [currency, setCurrency] = useState(() => 'GBP') // Default to GBP
  
  // Rental-specific fields
  const [rentalDurationType, setRentalDurationType] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>(() => 'daily')
  const [rentalMinDuration, setRentalMinDuration] = useState(() => 1)
  const [rentalMaxDuration, setRentalMaxDuration] = useState(() => 30)
  const [rentalRateHourly, setRentalRateHourly] = useState(() => '')
  const [rentalRateDaily, setRentalRateDaily] = useState(() => '')
  const [rentalRateWeekly, setRentalRateWeekly] = useState(() => '')
  const [rentalRateMonthly, setRentalRateMonthly] = useState(() => '')
  const [securityDeposit, setSecurityDeposit] = useState(() => '')
  const [cleaningFee, setCleaningFee] = useState(() => '')
  const [rentalAvailabilityPeriods, setRentalAvailabilityPeriods] = useState<Array<{
    id: string
    start_date: string
    end_date: string
    is_available: boolean
    notes?: string
  }>>(() => [])
  const [insuranceRequired, setInsuranceRequired] = useState(() => false)
  const [pickupAvailable, setPickupAvailable] = useState(() => false)
  const [deliveryAvailable, setDeliveryAvailable] = useState(() => false)
  const [deliveryCost, setDeliveryCost] = useState(() => '')
  const [conditionNotes, setConditionNotes] = useState(() => '')
  
  // Experience-specific fields
  const [experienceDurationHours, setExperienceDurationHours] = useState(() => 0)
  const [experienceMaxParticipants, setExperienceMaxParticipants] = useState(() => 0)
  const [experienceMinAge, setExperienceMinAge] = useState(() => 0)
  const [experienceIncludes, setExperienceIncludes] = useState<string[]>(() => [])
  const [experienceMeetingPoint, setExperienceMeetingPoint] = useState(() => '')
  const [experienceCancellationPolicy, setExperienceCancellationPolicy] = useState(() => '')
  
  // Subscription-specific fields
  const [subscriptionBillingCycle, setSubscriptionBillingCycle] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>(() => 'monthly')
  const [subscriptionTrialDays, setSubscriptionTrialDays] = useState(() => 0)
  const [subscriptionAutoRenew, setSubscriptionAutoRenew] = useState(() => true)
  const [subscriptionFeatures, setSubscriptionFeatures] = useState<string[]>(() => [])
  
  // Freelance-specific fields
  const [freelanceCategory, setFreelanceCategory] = useState<'ugc' | 'design' | 'writing' | 'video' | 'photography' | 'social_media' | 'consulting' | 'other'>(() => 'ugc')
  const [freelancePortfolioUrl, setFreelancePortfolioUrl] = useState(() => '')
  const [freelanceDeliveryDays, setFreelanceDeliveryDays] = useState(() => 0)
  const [freelanceRevisionsIncluded, setFreelanceRevisionsIncluded] = useState(() => 0)
  const [freelanceSkills, setFreelanceSkills] = useState<string[]>(() => [])
  
  // Auction-specific fields
  const [auctionStartPrice, setAuctionStartPrice] = useState(() => '')
  const [auctionReservePrice, setAuctionReservePrice] = useState(() => '')
  const [auctionEndTime, setAuctionEndTime] = useState(() => '')
  const [auctionBidIncrement, setAuctionBidIncrement] = useState(() => '')
  const [auctionBuyNowPrice, setAuctionBuyNowPrice] = useState(() => '')
  
  // Space Sharing-specific fields
  const [spaceType, setSpaceType] = useState<'parking' | 'storage' | 'workspace' | 'event_venue' | 'studio' | 'kitchen' | 'couchsurfing' | 'other'>(() => 'parking')
  const [spaceCapacity, setSpaceCapacity] = useState(() => 0)
  const [spaceAmenities, setSpaceAmenities] = useState<string[]>(() => [])
  const [spaceHourlyRate, setSpaceHourlyRate] = useState(() => '')
  const [spaceDailyRate, setSpaceDailyRate] = useState(() => '')
  
  // Fundraising-specific fields
  const [fundraisingGoal, setFundraisingGoal] = useState(() => '')
  const [fundraisingEndDate, setFundraisingEndDate] = useState(() => '')
  const [fundraisingCategory, setFundraisingCategory] = useState<'charity' | 'personal' | 'business' | 'event' | 'medical' | 'education' | 'other'>(() => 'charity')
  const [fundraisingBeneficiary, setFundraisingBeneficiary] = useState(() => '')
  
  // Delivery-specific fields
  const [deliveryType, setDeliveryType] = useState<'food' | 'grocery' | 'package' | 'medicine' | 'other'>(() => 'food')
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(() => 0)
  const [deliveryFeeStructure, setDeliveryFeeStructure] = useState<'fixed' | 'distance_based' | 'weight_based'>(() => 'fixed')
  const [deliveryEstimatedTime, setDeliveryEstimatedTime] = useState(() => 0)
  
  // Taxi-specific fields
  const [taxiVehicleType, setTaxiVehicleType] = useState<'standard' | 'luxury' | 'van' | 'motorcycle' | 'bike'>(() => 'standard')
  const [taxiMaxPassengers, setTaxiMaxPassengers] = useState(() => 4)
  const [taxiLicenseNumber, setTaxiLicenseNumber] = useState(() => '')
  
  // Link-specific fields
  const [linkUrl, setLinkUrl] = useState(() => '')
  const [linkType, setLinkType] = useState<'affiliate' | 'redirect' | 'short_link'>(() => 'redirect')
  
  // Step 3: Booking & Schedule
  const [bookingEnabled, setBookingEnabled] = useState(() => false)
  const [serviceName, setServiceName] = useState(() => '')
  const [timeSlots, setTimeSlots] = useState<any[]>(() => [])
  
  // Step 4: Settings
  const [cancellationHours, setCancellationHours] = useState(() => 24)
  const [cancellationFeeEnabled, setCancellationFeeEnabled] = useState(() => false)
  const [cancellationFeePercentage, setCancellationFeePercentage] = useState(() => 0)
  const [cancellationFeeAmount, setCancellationFeeAmount] = useState(() => 0)
  const [refundPolicy, setRefundPolicy] = useState(() => 'full')
  
  const [reviewIncentiveEnabled, setReviewIncentiveEnabled] = useState(() => false)
  const [reviewIncentiveType, setReviewIncentiveType] = useState<'discount' | 'credit' | 'points'>(() => 'discount')
  const [reviewDiscountPercentage, setReviewDiscountPercentage] = useState(() => 0)
  const [reviewDiscountAmount, setReviewDiscountAmount] = useState(() => 0)
  const [reviewMinRating, setReviewMinRating] = useState(() => 4.0)
  const [reviewRequireText, setReviewRequireText] = useState(() => false)
  const [reviewMaxUsesPerCustomer, setReviewMaxUsesPerCustomer] = useState(() => 1)
  const [reviewAutoGenerateCoupon, setReviewAutoGenerateCoupon] = useState(() => true)
  const [reviewCouponCodePrefix, setReviewCouponCodePrefix] = useState(() => 'REVIEW')
  const [reviewCouponValidDays, setReviewCouponValidDays] = useState(() => 30)
  const [reviewIncentiveMessage, setReviewIncentiveMessage] = useState(() => 'Thank you for your review! Here\'s a discount for your next booking.')
  const [reviewPlatforms, setReviewPlatforms] = useState<string[]>(() => ['in_app'])
  const [facebookPageId, setFacebookPageId] = useState(() => '')
  const [facebookPageUrl, setFacebookPageUrl] = useState(() => '')
  const [googlePlaceId, setGooglePlaceId] = useState(() => '')
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState(() => '')
  
  // Step 5: Location
  const [locationAddress, setLocationAddress] = useState(() => '')
  const [locationLat, setLocationLat] = useState<number | null>(() => null)
  const [locationLng, setLocationLng] = useState<number | null>(() => null)
  const [showExactAddress, setShowExactAddress] = useState(() => false)
  const [streetAddress, setStreetAddress] = useState(() => '')
  const [city, setCity] = useState(() => '')
  const [state, setState] = useState(() => '')
  const [postalCode, setPostalCode] = useState(() => '')
  const [country, setCountry] = useState(() => '')
  const [locationNotes, setLocationNotes] = useState(() => '')

  const resetForm = useCallback(() => {
    if (isEditMode) return // Don't reset if editing
    
    // Step 1
    setTitle('')
    setDescription('')
    setCategory('')
    setTags([])
    setPhotos([])
    setCategoryDropdownOpen(false)
    setTagInput('')
    setListingType('service')
    
    // Step 2
    setBudgetType('range')
    setBudgetMin('')
    setBudgetMax('')
    setUrgency(null)
    setPreferredDate('')
    setPriceList([])
    setCurrency('GBP')
    
    // Rental fields
    setRentalDurationType('daily')
    setRentalMinDuration(1)
    setRentalMaxDuration(30)
    setRentalRateHourly('')
    setRentalRateDaily('')
    setRentalRateWeekly('')
    setRentalRateMonthly('')
    setSecurityDeposit('')
    setCleaningFee('')
    setRentalAvailabilityPeriods([])
    setInsuranceRequired(false)
    setPickupAvailable(false)
    setDeliveryAvailable(false)
    setDeliveryCost('')
    setConditionNotes('')
    
    // Step 3: Booking & Schedule
    setBookingEnabled(false)
    setServiceName('')
    setTimeSlots([])
    
    // Step 4: Settings
    setCancellationHours(24)
    setCancellationFeeEnabled(false)
    setCancellationFeePercentage(0)
    setCancellationFeeAmount(0)
    setRefundPolicy('full')
    
    setReviewIncentiveEnabled(false)
    setReviewIncentiveType('discount')
    setReviewDiscountPercentage(0)
    setReviewDiscountAmount(0)
    setReviewMinRating(4.0)
    setReviewRequireText(false)
    setReviewMaxUsesPerCustomer(1)
    setReviewAutoGenerateCoupon(true)
    setReviewCouponCodePrefix('REVIEW')
    setReviewCouponValidDays(30)
    setReviewIncentiveMessage('Thank you for your review! Here\'s a discount for your next booking.')
    setReviewPlatforms(['in_app'])
    setFacebookPageId('')
    setFacebookPageUrl('')
    setGooglePlaceId('')
    setGoogleBusinessUrl('')
    
    // Step 5: Location
    setLocationAddress('')
    setLocationLat(null)
    setLocationLng(null)
    setShowExactAddress(false)
    setStreetAddress('')
    setCity('')
    setState('')
    setPostalCode('')
    setCountry('')
    setLocationNotes('')
  }, [isEditMode])

  const loadFromListing = useCallback((listing: Listing) => {
    console.log('📥 loadFromListing called with:', {
      id: listing.id,
      title: listing.title,
      category: listing.category,
      photos: listing.photos,
    })
    
    // Cast to any once at the top to access additional fields
    const listingAny = listing as any
    
    // Step 1
    setTitle(listing.title || '')
    setDescription(listing.description || '')
    setCategory(listing.category || '')
    setListingType(listing.listing_type || 'service')
    
    // Handle tags
    if (listing.tags) {
      if (Array.isArray(listing.tags)) {
        setTags(listing.tags)
      } else if (typeof listing.tags === 'string') {
        try {
          const parsed = JSON.parse(listing.tags)
          setTags(Array.isArray(parsed) ? parsed : [])
        } catch {
          setTags(listing.tags ? [listing.tags] : [])
        }
      }
    } else {
      setTags([])
    }
    
    // Handle photos - normalize URLs to ensure R2 URLs work correctly
    if (listing.photos) {
      let photosArray: string[] = []
      
      if (Array.isArray(listing.photos)) {
        photosArray = listing.photos.filter((p: any) => p && typeof p === 'string')
      } else if (typeof listing.photos === 'string') {
        try {
          const parsed = JSON.parse(listing.photos)
          if (Array.isArray(parsed)) {
            photosArray = parsed.filter((p: any) => p && typeof p === 'string')
          } else {
            photosArray = listing.photos ? [listing.photos] : []
          }
        } catch {
          photosArray = listing.photos ? [listing.photos] : []
        }
      }
      
      // Normalize photo URLs to ensure R2 URLs and other formats work correctly
      const normalizedPhotos = normalizePhotoUrls(photosArray)
      console.log('📸 Normalized photos for edit:', {
        original: photosArray,
        normalized: normalizedPhotos,
      })
      setPhotos(normalizedPhotos)
    } else {
      setPhotos([])
    }
    
    // Step 2
    setBudgetType((listing.budget_type as any) || 'range')
    setBudgetMin(listing.budget_min ? String(listing.budget_min) : '')
    setBudgetMax(listing.budget_max ? String(listing.budget_max) : '')
    setUrgency((listing.urgency as any) || null)
    setPreferredDate(listing.preferred_date ? new Date(listing.preferred_date).toISOString().split('T')[0] : '')
    setCurrency(listingAny.currency || 'GBP')
    
    // Load price_list
    if (listingAny.price_list) {
      if (Array.isArray(listingAny.price_list)) {
        setPriceList(listingAny.price_list)
      } else if (typeof listingAny.price_list === 'string') {
        try {
          const parsed = JSON.parse(listingAny.price_list)
          setPriceList(Array.isArray(parsed) ? parsed : [])
        } catch {
          setPriceList([])
        }
      }
    } else {
      setPriceList([])
    }
    
    console.log('💰 Loaded price_list:', listingAny.price_list)
    
    // Step 3: Booking & Schedule
    setBookingEnabled(listingAny.booking_enabled || false)
    setServiceName(listingAny.service_name || '')
    
    // Load time_slots
    if (listingAny.time_slots) {
      if (Array.isArray(listingAny.time_slots)) {
        setTimeSlots(listingAny.time_slots)
      } else if (typeof listingAny.time_slots === 'string') {
        try {
          const parsed = JSON.parse(listingAny.time_slots)
          setTimeSlots(Array.isArray(parsed) ? parsed : [])
        } catch {
          setTimeSlots([])
        }
      }
    } else {
      setTimeSlots([])
    }
    
    console.log('📅 Loaded time_slots:', listingAny.time_slots)
    
    // Load rental availability periods
    if (listingAny.rental_availability_periods) {
      if (Array.isArray(listingAny.rental_availability_periods)) {
        setRentalAvailabilityPeriods(listingAny.rental_availability_periods)
      } else if (typeof listingAny.rental_availability_periods === 'string') {
        try {
          const parsed = JSON.parse(listingAny.rental_availability_periods)
          setRentalAvailabilityPeriods(Array.isArray(parsed) ? parsed : [])
        } catch {
          setRentalAvailabilityPeriods([])
        }
      }
    } else {
      setRentalAvailabilityPeriods([])
    }
    
    // Load Rental fields
    if (listingAny.rental_duration_type) setRentalDurationType(listingAny.rental_duration_type)
    if (listingAny.rental_min_duration) setRentalMinDuration(listingAny.rental_min_duration)
    if (listingAny.rental_max_duration) setRentalMaxDuration(listingAny.rental_max_duration)
    if (listingAny.rental_rate_hourly) setRentalRateHourly(String(listingAny.rental_rate_hourly))
    if (listingAny.rental_rate_daily) setRentalRateDaily(String(listingAny.rental_rate_daily))
    if (listingAny.rental_rate_weekly) setRentalRateWeekly(String(listingAny.rental_rate_weekly))
    if (listingAny.rental_rate_monthly) setRentalRateMonthly(String(listingAny.rental_rate_monthly))
    if (listingAny.security_deposit) setSecurityDeposit(String(listingAny.security_deposit))
    if (listingAny.cleaning_fee) setCleaningFee(String(listingAny.cleaning_fee))
    if (listingAny.insurance_required !== undefined) setInsuranceRequired(listingAny.insurance_required)
    if (listingAny.pickup_available !== undefined) setPickupAvailable(listingAny.pickup_available)
    if (listingAny.delivery_available !== undefined) setDeliveryAvailable(listingAny.delivery_available)
    if (listingAny.delivery_cost) setDeliveryCost(String(listingAny.delivery_cost))
    if (listingAny.condition_notes) setConditionNotes(listingAny.condition_notes)
    
    // Load Experience fields
    if (listingAny.experience_duration_hours) setExperienceDurationHours(listingAny.experience_duration_hours)
    if (listingAny.experience_max_participants) setExperienceMaxParticipants(listingAny.experience_max_participants)
    if (listingAny.experience_min_age) setExperienceMinAge(listingAny.experience_min_age)
    if (listingAny.experience_includes) setExperienceIncludes(Array.isArray(listingAny.experience_includes) ? listingAny.experience_includes : [])
    if (listingAny.experience_meeting_point) setExperienceMeetingPoint(listingAny.experience_meeting_point)
    if (listingAny.experience_cancellation_policy) setExperienceCancellationPolicy(listingAny.experience_cancellation_policy)
    
    // Load Subscription fields
    if (listingAny.subscription_billing_cycle) setSubscriptionBillingCycle(listingAny.subscription_billing_cycle)
    if (listingAny.subscription_trial_days) setSubscriptionTrialDays(listingAny.subscription_trial_days)
    if (listingAny.subscription_auto_renew !== undefined) setSubscriptionAutoRenew(listingAny.subscription_auto_renew)
    if (listingAny.subscription_features) setSubscriptionFeatures(Array.isArray(listingAny.subscription_features) ? listingAny.subscription_features : [])
    
    // Load Freelance fields
    if (listingAny.freelance_category) setFreelanceCategory(listingAny.freelance_category)
    if (listingAny.freelance_portfolio_url) setFreelancePortfolioUrl(listingAny.freelance_portfolio_url)
    if (listingAny.freelance_delivery_days) setFreelanceDeliveryDays(listingAny.freelance_delivery_days)
    if (listingAny.freelance_revisions_included) setFreelanceRevisionsIncluded(listingAny.freelance_revisions_included)
    if (listingAny.freelance_skills) setFreelanceSkills(Array.isArray(listingAny.freelance_skills) ? listingAny.freelance_skills : [])
    
    // Load Auction fields
    if (listingAny.auction_start_price) setAuctionStartPrice(String(listingAny.auction_start_price))
    if (listingAny.auction_reserve_price) setAuctionReservePrice(String(listingAny.auction_reserve_price))
    if (listingAny.auction_end_time) setAuctionEndTime(listingAny.auction_end_time)
    if (listingAny.auction_bid_increment) setAuctionBidIncrement(String(listingAny.auction_bid_increment))
    if (listingAny.auction_buy_now_price) setAuctionBuyNowPrice(String(listingAny.auction_buy_now_price))
    
    // Load Space Sharing fields
    if (listingAny.space_type) setSpaceType(listingAny.space_type)
    if (listingAny.space_capacity) setSpaceCapacity(listingAny.space_capacity)
    if (listingAny.space_amenities) setSpaceAmenities(Array.isArray(listingAny.space_amenities) ? listingAny.space_amenities : [])
    if (listingAny.space_hourly_rate) setSpaceHourlyRate(String(listingAny.space_hourly_rate))
    if (listingAny.space_daily_rate) setSpaceDailyRate(String(listingAny.space_daily_rate))
    
    // Load Fundraising fields
    if (listingAny.fundraising_goal) setFundraisingGoal(String(listingAny.fundraising_goal))
    if (listingAny.fundraising_end_date) setFundraisingEndDate(listingAny.fundraising_end_date)
    if (listingAny.fundraising_category) setFundraisingCategory(listingAny.fundraising_category)
    if (listingAny.fundraising_beneficiary) setFundraisingBeneficiary(listingAny.fundraising_beneficiary)
    
    // Load Delivery fields
    if (listingAny.delivery_type) setDeliveryType(listingAny.delivery_type)
    if (listingAny.delivery_radius_km) setDeliveryRadiusKm(listingAny.delivery_radius_km)
    if (listingAny.delivery_fee_structure) setDeliveryFeeStructure(listingAny.delivery_fee_structure)
    if (listingAny.delivery_estimated_time) setDeliveryEstimatedTime(listingAny.delivery_estimated_time)
    
    // Load Taxi fields
    if (listingAny.taxi_vehicle_type) setTaxiVehicleType(listingAny.taxi_vehicle_type)
    if (listingAny.taxi_max_passengers) setTaxiMaxPassengers(listingAny.taxi_max_passengers)
    if (listingAny.taxi_license_number) setTaxiLicenseNumber(listingAny.taxi_license_number)
    
    // Load Link fields
    if (listingAny.link_url) setLinkUrl(listingAny.link_url)
    if (listingAny.link_type) setLinkType(listingAny.link_type)
    
    // Step 4: Settings - Load from service_settings and review_incentive_settings
    // Cancellation settings from service_settings
    if (listingAny.service_settings?.cancellation_hours) {
      setCancellationHours(listingAny.service_settings.cancellation_hours)
    } else {
      // Default to 24 hours if not set
      setCancellationHours(24)
    }
    // Load cancellation fee settings
    if (listingAny.service_settings) {
      setCancellationFeeEnabled(listingAny.service_settings.cancellation_fee_enabled || false)
      setCancellationFeePercentage(listingAny.service_settings.cancellation_fee_percentage || 0)
      setCancellationFeeAmount(listingAny.service_settings.cancellation_fee_amount || 0)
      setRefundPolicy(listingAny.service_settings.refund_policy || 'full')
    }
    
    // Review incentive settings - loaded separately in Step6Settings component
    // But we can also load platform settings if they exist
    if (listingAny.review_incentive_settings) {
      if (listingAny.review_incentive_settings.review_platforms) {
        const platforms = Array.isArray(listingAny.review_incentive_settings.review_platforms)
          ? listingAny.review_incentive_settings.review_platforms
          : ['in_app']
        setReviewPlatforms(platforms)
      }
      if (listingAny.review_incentive_settings.facebook_page_id) {
        setFacebookPageId(listingAny.review_incentive_settings.facebook_page_id)
      }
      if (listingAny.review_incentive_settings.facebook_page_url) {
        setFacebookPageUrl(listingAny.review_incentive_settings.facebook_page_url)
      }
      if (listingAny.review_incentive_settings.google_place_id) {
        setGooglePlaceId(listingAny.review_incentive_settings.google_place_id)
      }
      if (listingAny.review_incentive_settings.google_business_url) {
        setGoogleBusinessUrl(listingAny.review_incentive_settings.google_business_url)
      }
    }
    
    // Step 5: Location
    setLocationAddress(listing.location_address || '')
    setLocationLat(listing.location_lat || null)
    setLocationLng(listing.location_lng || null)
    
    // Manual address fields (if stored in DB - these might be in the listing object)
    const hasStreetAddress = !!(listingAny.street_address || listingAny.city || listingAny.postal_code)
    setShowExactAddress(!!listingAny.show_exact_address || hasStreetAddress)
    
    if (listingAny.street_address) setStreetAddress(listingAny.street_address)
    if (listingAny.city) setCity(listingAny.city)
    if (listingAny.state) setState(listingAny.state)
    if (listingAny.postal_code) setPostalCode(listingAny.postal_code)
    if (listingAny.country) setCountry(listingAny.country)
    if (listingAny.location_notes) setLocationNotes(listingAny.location_notes)
    
    console.log('✅ loadFromListing completed, form state updated')
  }, [
    setTitle,
    setDescription,
    setCategory,
    setTags,
    setPhotos,
    setBudgetType,
    setBudgetMin,
    setBudgetMax,
    setUrgency,
    setPreferredDate,
    setLocationAddress,
    setLocationLat,
    setLocationLng,
    setShowExactAddress,
    setStreetAddress,
    setCity,
    setState,
    setPostalCode,
    setCountry,
    setLocationNotes,
  ])

  const formState: ListingFormState = {
    title,
    description,
    category,
    tags,
    photos,
    categoryDropdownOpen,
    tagInput,
    listing_type: listingType,
    budgetType,
    budgetMin,
    budgetMax,
    urgency,
    preferredDate,
    price_list: priceList,
    currency,
    rental_duration_type: rentalDurationType,
    rental_min_duration: rentalMinDuration,
    rental_max_duration: rentalMaxDuration,
    rental_rate_hourly: rentalRateHourly,
    rental_rate_daily: rentalRateDaily,
    rental_rate_weekly: rentalRateWeekly,
    rental_rate_monthly: rentalRateMonthly,
    security_deposit: securityDeposit,
    cleaning_fee: cleaningFee,
    rental_availability_periods: rentalAvailabilityPeriods,
    insurance_required: insuranceRequired,
    pickup_available: pickupAvailable,
    delivery_available: deliveryAvailable,
    delivery_cost: deliveryCost,
    condition_notes: conditionNotes,
    // Experience-specific fields
    experience_duration_hours: experienceDurationHours,
    experience_max_participants: experienceMaxParticipants,
    experience_min_age: experienceMinAge,
    experience_includes: experienceIncludes,
    experience_meeting_point: experienceMeetingPoint,
    experience_cancellation_policy: experienceCancellationPolicy,
    // Subscription-specific fields
    subscription_billing_cycle: subscriptionBillingCycle,
    subscription_trial_days: subscriptionTrialDays,
    subscription_auto_renew: subscriptionAutoRenew,
    subscription_features: subscriptionFeatures,
    // Freelance-specific fields
    freelance_category: freelanceCategory,
    freelance_portfolio_url: freelancePortfolioUrl,
    freelance_delivery_days: freelanceDeliveryDays,
    freelance_revisions_included: freelanceRevisionsIncluded,
    freelance_skills: freelanceSkills,
    // Auction-specific fields
    auction_start_price: auctionStartPrice,
    auction_reserve_price: auctionReservePrice,
    auction_end_time: auctionEndTime,
    auction_bid_increment: auctionBidIncrement,
    auction_buy_now_price: auctionBuyNowPrice,
    // Space Sharing-specific fields
    space_type: spaceType,
    space_capacity: spaceCapacity,
    space_amenities: spaceAmenities,
    space_hourly_rate: spaceHourlyRate,
    space_daily_rate: spaceDailyRate,
    // Fundraising-specific fields
    fundraising_goal: fundraisingGoal,
    fundraising_end_date: fundraisingEndDate,
    fundraising_category: fundraisingCategory,
    fundraising_beneficiary: fundraisingBeneficiary,
    // Delivery-specific fields
    delivery_type: deliveryType,
    delivery_radius_km: deliveryRadiusKm,
    delivery_fee_structure: deliveryFeeStructure,
    delivery_estimated_time: deliveryEstimatedTime,
    // Taxi-specific fields
    taxi_vehicle_type: taxiVehicleType,
    taxi_max_passengers: taxiMaxPassengers,
    taxi_license_number: taxiLicenseNumber,
    // Link-specific fields
    link_url: linkUrl,
    link_type: linkType,
    locationAddress,
    locationLat,
    locationLng,
    showExactAddress,
    streetAddress,
    city,
    state,
    postalCode,
    country,
    locationNotes,
    booking_enabled: bookingEnabled,
    service_name: serviceName,
    time_slots: timeSlots,
    cancellation_hours: cancellationHours,
    cancellation_fee_enabled: cancellationFeeEnabled,
    cancellation_fee_percentage: cancellationFeePercentage,
    cancellation_fee_amount: cancellationFeeAmount,
    refund_policy: refundPolicy,
    review_incentive_enabled: reviewIncentiveEnabled,
    review_incentive_type: reviewIncentiveType,
    review_discount_percentage: reviewDiscountPercentage,
    review_discount_amount: reviewDiscountAmount,
    review_min_rating: reviewMinRating,
    review_require_text: reviewRequireText,
    review_max_uses_per_customer: reviewMaxUsesPerCustomer,
    review_auto_generate_coupon: reviewAutoGenerateCoupon,
    review_coupon_code_prefix: reviewCouponCodePrefix,
    review_coupon_valid_days: reviewCouponValidDays,
    review_incentive_message: reviewIncentiveMessage,
    review_platforms: reviewPlatforms,
    facebook_page_id: facebookPageId,
    facebook_page_url: facebookPageUrl,
    google_place_id: googlePlaceId,
    google_business_url: googleBusinessUrl,
  }

  const actions: ListingFormActions = {
    setTitle,
    setDescription,
    setCategory,
    setTags,
    setPhotos,
    setCategoryDropdownOpen,
    setTagInput,
    setListingType,
    setBudgetType,
    setBudgetMin,
    setBudgetMax,
    setUrgency,
    setPreferredDate,
    setPriceList,
    setCurrency,
    setRentalDurationType,
    setRentalMinDuration,
    setRentalMaxDuration,
    setRentalRateHourly,
    setRentalRateDaily,
    setRentalRateWeekly,
    setRentalRateMonthly,
    setSecurityDeposit,
    setCleaningFee,
    setRentalAvailabilityPeriods,
    setInsuranceRequired,
    setPickupAvailable,
    setDeliveryAvailable,
    setDeliveryCost,
    setConditionNotes,
    // Experience setters
    setExperienceDurationHours,
    setExperienceMaxParticipants,
    setExperienceMinAge,
    setExperienceIncludes,
    setExperienceMeetingPoint,
    setExperienceCancellationPolicy,
    // Subscription setters
    setSubscriptionBillingCycle,
    setSubscriptionTrialDays,
    setSubscriptionAutoRenew,
    setSubscriptionFeatures,
    // Freelance setters
    setFreelanceCategory,
    setFreelancePortfolioUrl,
    setFreelanceDeliveryDays,
    setFreelanceRevisionsIncluded,
    setFreelanceSkills,
    // Auction setters
    setAuctionStartPrice,
    setAuctionReservePrice,
    setAuctionEndTime,
    setAuctionBidIncrement,
    setAuctionBuyNowPrice,
    // Space Sharing setters
    setSpaceType,
    setSpaceCapacity,
    setSpaceAmenities,
    setSpaceHourlyRate,
    setSpaceDailyRate,
    // Fundraising setters
    setFundraisingGoal,
    setFundraisingEndDate,
    setFundraisingCategory,
    setFundraisingBeneficiary,
    // Delivery setters
    setDeliveryType,
    setDeliveryRadiusKm,
    setDeliveryFeeStructure,
    setDeliveryEstimatedTime,
    // Taxi setters
    setTaxiVehicleType,
    setTaxiMaxPassengers,
    setTaxiLicenseNumber,
    // Link setters
    setLinkUrl,
    setLinkType,
    setLocationAddress,
    setLocationLat,
    setLocationLng,
    setShowExactAddress,
    setStreetAddress,
    setCity,
    setState,
    setPostalCode,
    setCountry,
    setLocationNotes,
    setBookingEnabled,
    setServiceName,
    setTimeSlots,
    setCancellationHours,
    setCancellationFeeEnabled,
    setCancellationFeePercentage,
    setCancellationFeeAmount,
    setRefundPolicy,
    setReviewIncentiveEnabled,
    setReviewIncentiveType,
    setReviewDiscountPercentage,
    setReviewDiscountAmount,
    setReviewMinRating,
    setReviewRequireText,
    setReviewMaxUsesPerCustomer,
    setReviewAutoGenerateCoupon,
    setReviewCouponCodePrefix,
    setReviewCouponValidDays,
    setReviewIncentiveMessage,
    setReviewPlatforms,
    setFacebookPageId,
    setFacebookPageUrl,
    setGooglePlaceId,
    setGoogleBusinessUrl,
    resetForm,
    loadFromListing,
  }

  return { state: formState, actions }
}
