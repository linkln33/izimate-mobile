import { useState, useCallback } from 'react'
import type { Listing } from '@/lib/types'
import { normalizePhotoUrls } from '@/lib/utils/images'

export type Step = 1 | 2 | 3 | 4
export type BudgetType = 'fixed' | 'range' | 'price_list'
export type Urgency = 'asap' | 'this_week' | 'flexible'

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
  urgency: Urgency
  preferredDate: string
  price_list?: any[] // Array of {serviceName, price} objects
  
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
  setUrgency: (value: Urgency) => void
  setPreferredDate: (value: string) => void
  setPriceList?: (value: any[]) => void
  
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
  const [urgency, setUrgency] = useState<Urgency>(() => 'flexible')
  const [preferredDate, setPreferredDate] = useState(() => '')
  const [priceList, setPriceList] = useState<any[]>(() => [])
  
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
    setUrgency('flexible')
    setPreferredDate('')
    
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
    setUrgency((listing.urgency as any) || 'flexible')
    setPreferredDate(listing.preferred_date ? new Date(listing.preferred_date).toISOString().split('T')[0] : '')
    
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
    resetForm,
    loadFromListing,
  }

  return { state: formState, actions }
}
