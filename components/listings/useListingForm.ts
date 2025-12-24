import { useState, useCallback } from 'react'
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
  
  // Step 2: Budget & Urgency
  budgetType: BudgetType
  budgetMin: string
  budgetMax: string
  urgency: Urgency | null
  preferredDate: string
  price_list?: any[] // Array of {serviceName, price} objects
  currency?: string // Currency code (e.g., 'GBP', 'USD', 'EUR')
  
  // Step 3: Location
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
  
  // Step 4: Booking Settings (Simplified)
  booking_enabled?: boolean
  service_name?: string
  time_slots?: any[] // Array of TimeSlot objects
  
  // Step 5: Settings (Cancellation & Review Incentives)
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
  
  // Step 2
  setBudgetType: (value: BudgetType) => void
  setBudgetMin: (value: string) => void
  setBudgetMax: (value: string) => void
  setUrgency: (value: Urgency | null) => void
  setPreferredDate: (value: string) => void
  setPriceList?: (value: any[]) => void
  setCurrency?: (value: string) => void
  
  // Step 3
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
  
  // Step 4: Booking Settings (Simplified)
  setBookingEnabled?: (value: boolean) => void
  setServiceName?: (value: string) => void
  setTimeSlots?: (value: any[]) => void
  
  // Step 5: Settings
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
  
  // Step 2: Budget & Urgency
  const [budgetType, setBudgetType] = useState<BudgetType>(() => 'range')
  const [budgetMin, setBudgetMin] = useState(() => '')
  const [budgetMax, setBudgetMax] = useState(() => '')
  const [urgency, setUrgency] = useState<Urgency | null>(() => null)
  const [preferredDate, setPreferredDate] = useState(() => '')
  const [priceList, setPriceList] = useState<any[]>(() => [])
  const [currency, setCurrency] = useState(() => 'GBP') // Default to GBP
  
  // Step 3: Location
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
  
  // Step 4: Booking Settings (Simplified)
  const [bookingEnabled, setBookingEnabled] = useState(() => false)
  const [serviceName, setServiceName] = useState(() => '')
  const [timeSlots, setTimeSlots] = useState<any[]>(() => [])
  
  // Step 5: Settings
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
    
    // Step 2
    setBudgetType('range')
    setBudgetMin('')
    setBudgetMax('')
    setUrgency(null)
    setPreferredDate('')
    setPriceList([])
    setCurrency('GBP')
    
    // Step 3
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
    
    // Step 4
    setBookingEnabled(false)
    setServiceName('')
    setTimeSlots([])
    
    // Step 5: Settings
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
    
    // Step 3
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
    
    // Step 4: Booking Settings (Simplified)
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
    
    // Step 5: Settings - Load from service_settings and review_incentive_settings
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
    budgetType,
    budgetMin,
    budgetMax,
    urgency,
    preferredDate,
    price_list: priceList,
    currency,
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
    setBudgetType,
    setBudgetMin,
    setBudgetMax,
    setUrgency,
    setPreferredDate,
    setPriceList,
    setCurrency,
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
