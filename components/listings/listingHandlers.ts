import { Alert, Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { uploadMultipleImages } from '@/lib/utils/images'
import { getCurrentLocation, reverseGeocode } from '@/lib/utils/location'
import type { ListingFormState, ListingFormActions, Step } from './useListingForm'

/**
 * Save or update review incentive settings for a listing
 */
async function saveReviewIncentiveSettings(
  listingId: string,
  providerId: string,
  formState: ListingFormState
) {
  try {
    // Only save if review incentives are enabled
    if (!formState.review_incentive_enabled) {
      // Delete existing settings if disabled
      await supabase
        .from('review_incentive_settings')
        .delete()
        .eq('listing_id', listingId)
        .eq('provider_id', providerId)
      return
    }

    const settingsData = {
      provider_id: providerId,
      listing_id: listingId,
      enabled: formState.review_incentive_enabled,
      incentive_type: formState.review_incentive_type || 'discount',
      discount_percentage: formState.review_discount_percentage || null,
      discount_amount: formState.review_discount_amount || null,
      min_rating: formState.review_min_rating || 4.0,
      require_text_review: formState.review_require_text || false,
      max_uses_per_customer: formState.review_max_uses_per_customer || 1,
      auto_generate_coupon: formState.review_auto_generate_coupon ?? true,
      coupon_code_prefix: formState.review_coupon_code_prefix || 'REVIEW',
      coupon_valid_days: formState.review_coupon_valid_days || 30,
      incentive_message: formState.review_incentive_message || 'Thank you for your review! Here\'s a discount for your next booking.',
      review_platforms: formState.review_platforms || ['in_app'],
      facebook_page_id: formState.facebook_page_id || null,
      facebook_page_url: formState.facebook_page_url || null,
      google_place_id: formState.google_place_id || null,
      google_business_url: formState.google_business_url || null,
    }

    // Check if settings already exist
    const { data: existing } = await supabase
      .from('review_incentive_settings')
      .select('id')
      .eq('listing_id', listingId)
      .eq('provider_id', providerId)
      .single()

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('review_incentive_settings')
        .update(settingsData)
        .eq('listing_id', listingId)
        .eq('provider_id', providerId)

      if (error) {
        console.error('❌ Error updating review incentive settings:', error)
        throw error
      }
      console.log('✅ Review incentive settings updated')
    } else {
      // Create new
      const { error } = await supabase
        .from('review_incentive_settings')
        .insert(settingsData)

      if (error) {
        console.error('❌ Error creating review incentive settings:', error)
        throw error
      }
      console.log('✅ Review incentive settings created')
    }
  } catch (error) {
    console.error('❌ Failed to save review incentive settings:', error)
    // Don't throw - listing is already saved, this is supplementary
  }
}

/**
 * Save or update service_settings for a listing with simplified booking configuration
 */
async function saveServiceSettings(listingId: string, formState: ListingFormState) {
  try {
    console.log('💾 Saving simplified service_settings for listing:', listingId);
    
    // Convert time_slots to service_settings format
    const workingHours: any = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
      workingHours[day] = { enabled: false, start: '09:00', end: '17:00' };
    });
    
    // Enable days that have time slots
    if (formState.time_slots && formState.time_slots.length > 0) {
      formState.time_slots.forEach((slot: any) => {
        if (workingHours[slot.day]) {
          workingHours[slot.day].enabled = true;
          // Set the earliest start and latest end for each day
          const currentStart = workingHours[slot.day].start;
          const currentEnd = workingHours[slot.day].end;
          workingHours[slot.day].start = slot.startTime < currentStart ? slot.startTime : currentStart;
          workingHours[slot.day].end = slot.endTime > currentEnd ? slot.endTime : currentEnd;
        }
      });
    }
    
    const serviceSettingsData = {
      listing_id: listingId,
      booking_enabled: formState.booking_enabled,
      service_type: 'appointment', // Default type
      default_duration_minutes: 60, // Default 1 hour
      buffer_minutes: 15, // Default 15 min buffer
      advance_booking_days: 30, // Default 30 days
      same_day_booking: true,
      auto_confirm: false, // Manual confirmation by default
      cancellation_hours: formState.cancellation_hours || 24,
      cancellation_fee_enabled: formState.cancellation_fee_enabled || false,
      cancellation_fee_percentage: formState.cancellation_fee_percentage || null,
      cancellation_fee_amount: formState.cancellation_fee_amount || null,
      refund_policy: formState.refund_policy || 'full',
      working_hours: workingHours,
      break_times: [],
      service_options: formState.budget_type === 'price_list' && formState.price_list && formState.price_list.length > 0
        ? formState.price_list.map(item => ({
            name: item.serviceName,
            duration: 60, // Default duration, can be customized later
            price: parseFloat(item.price),
            currency: formState.currency || 'GBP'
          }))
        : formState.service_name ? [{
            name: formState.service_name,
            duration: 60,
            price: parseFloat(formState.budgetMin || '50'),
            currency: formState.currency || 'GBP'
          }] : [],
      calendar_connected: false,
    };

    // Check if service_settings already exists
    const { data: existing } = await supabase
      .from('service_settings')
      .select('id')
      .eq('listing_id', listingId)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('service_settings')
        .update(serviceSettingsData)
        .eq('listing_id', listingId);

      if (error) {
        console.error('❌ Error updating service_settings:', error);
        throw error;
      }
      console.log('✅ Service settings updated');
    } else {
      // Create new
      const { error } = await supabase
        .from('service_settings')
        .insert(serviceSettingsData);

      if (error) {
        console.error('❌ Error creating service_settings:', error);
        throw error;
      }
      console.log('✅ Service settings created');
    }
  } catch (error) {
    console.error('❌ Failed to save service settings:', error);
    // Don't throw - listing is already saved, this is supplementary
    Alert.alert(
      'Warning',
      'Listing saved but booking settings may not be complete. Please edit the listing to update booking settings.'
    );
  }
}

export interface ListingHandlers {
  handlePickPhotos: () => Promise<void>
  handleDetectLocation: () => Promise<void>
  handleNext: (currentStep: Step, formState: ListingFormState) => Step | null
  handleSubmit: (
    formState: ListingFormState,
    isEditMode: boolean,
    listingId: string | undefined,
    onSuccess: () => void
  ) => Promise<void>
}

export function createListingHandlers(
  formActions: ListingFormActions,
  setLoading: (loading: boolean) => void,
  setStep: (step: Step) => void,
  setPhotos: (photos: string[]) => void,
  photos: string[]
): ListingHandlers {
  // Use formActions.setPhotos as the primary way to update photos
  const updatePhotos = (newPhotos: string[]) => {
    formActions.setPhotos(newPhotos)
    setPhotos(newPhotos)
  }
  const handlePickPhotos = async () => {
    try {
      console.log('📸 Photo picker button pressed')
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      console.log('📸 Permission status:', status)
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to photos')
        return
      }

      console.log('📸 Launching image library...')
      // Use the new MediaType enum instead of deprecated MediaTypeOptions
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      })

      console.log('📸 Image picker result:', { 
        canceled: result.canceled, 
        assetsCount: result.assets?.length || 0 
      })

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('📸 Image picker was canceled or no assets')
        return
      }

      setLoading(true)
      const imageUris = result.assets.map(asset => asset.uri)
      console.log('📸 Selected images:', imageUris.length)
      
      try {
        // Try to upload images
        const uploadedUrls = await uploadMultipleImages(imageUris, 'listings')
        console.log('📸 Uploaded URLs:', uploadedUrls)
        
        // Validate URLs before adding
        const validUrls = uploadedUrls.filter(url => {
          const isValid = url && typeof url === 'string' && url.trim().length > 0 && 
                         (url.startsWith('http://') || url.startsWith('https://'))
          if (!isValid) {
            console.warn('⚠️ Invalid URL returned from upload:', url)
          }
          return isValid
        })
        
        if (validUrls.length !== uploadedUrls.length) {
          console.warn(`⚠️ ${uploadedUrls.length - validUrls.length} invalid URL(s) filtered out`)
        }
        
        if (validUrls.length === 0) {
          throw new Error('No valid URLs returned from upload service')
        }
        
        // Log the exact URLs being added for debugging
        console.log('📸 URLs to add to photos:', {
          validUrls,
          urlsCount: validUrls.length,
          urlDetails: validUrls.map((url, idx) => ({
            index: idx,
            url,
            startsWithHttps: url.startsWith('https://'),
            isR2Url: url.includes('r2.dev'),
            urlLength: url.length,
          })),
        })
        
        // Update photos using the helper function
        const currentPhotos = photos || []
        const newPhotos = [...currentPhotos, ...validUrls]
        updatePhotos(newPhotos)
        
        console.log('✅ Photos updated in form state:', {
          previousCount: currentPhotos.length,
          newCount: newPhotos.length,
          addedUrls: validUrls,
          allPhotos: newPhotos,
        })
        
        // Verify URLs are accessible before showing success
        const urlChecks = await Promise.allSettled(
          validUrls.map(async (url) => {
            try {
              const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
              return { url, accessible: response.ok, status: response.status }
            } catch (error) {
              return { url, accessible: false, error: error instanceof Error ? error.message : String(error) }
            }
          })
        )
        
        const accessibleCount = urlChecks.filter(
          result => result.status === 'fulfilled' && result.value.accessible
        ).length
        
        console.log('🔍 URL accessibility check:', {
          total: validUrls.length,
          accessible: accessibleCount,
          results: urlChecks.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason }),
        })
        
        if (accessibleCount < validUrls.length) {
          console.warn('⚠️ Some uploaded images may not be immediately accessible')
        }
        
        Alert.alert('Success', `${validUrls.length} photo(s) uploaded successfully`)
      } catch (uploadError: any) {
        console.error('📸 Upload error:', uploadError)
        
        // Fallback: Use local URIs for preview (they won't persist on submit)
        // Only add blob URLs if they're actually blob URLs (for web) or file:// URIs (for native)
        console.log('⚠️ Using local URIs as fallback for preview')
        const currentPhotos = photos || []
        // Filter out any invalid URLs and only keep blob: or file: URIs for preview
        const previewUris = imageUris.filter(uri => 
          uri.startsWith('blob:') || uri.startsWith('file:') || uri.startsWith('content://')
        )
        const newPhotos = [...currentPhotos, ...previewUris]
        updatePhotos(newPhotos)
        
        console.log('📸 Added preview URIs (will not persist on submit):', {
          count: previewUris.length,
          uris: previewUris,
        })
        
        // Provide helpful error message
        const errorMessage = `Upload failed: ${uploadError.message}\n\n` +
          `${imageUris.length} photo(s) added for preview only (won't persist on submit).\n\n` +
          `Please check:\n` +
          `- Your internet connection\n` +
          `- R2 credentials in .env file\n` +
          `- R2 bucket permissions`
        
        Alert.alert('Upload Failed', errorMessage)
      } finally {
        setLoading(false)
      }
    } catch (error: any) {
      console.error('📸 Photo picker error:', error)
      Alert.alert(
        'Error', 
        error.message || 'Failed to pick images. Please try again.'
      )
      setLoading(false)
    }
  }

  const handleDetectLocation = async () => {
    try {
      setLoading(true)
      const location = await getCurrentLocation()
      const address = await reverseGeocode(location.lat, location.lng)
      formActions.setLocationAddress(address)
      formActions.setLocationLat(location.lat)
      formActions.setLocationLng(location.lng)
    } catch (error) {
      Alert.alert('Error', 'Failed to get location')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = (currentStep: Step, formState: ListingFormState): Step | null => {
    // Step 1: Basic Info
    if (currentStep === 1) {
      if (!formState.title.trim() || !formState.description.trim() || !formState.category) {
        Alert.alert('Required Fields', 'Please fill in title, description, and category')
        return null
      }
      return 2
    } 
    // Step 2: Services & Pricing
    else if (currentStep === 2) {
      console.log('🔍 Step 2 Validation:', {
        budgetType: formState.budgetType,
        budgetMin: formState.budgetMin,
        budgetMax: formState.budgetMax,
        price_list: formState.price_list,
      });

      if (formState.budgetType === 'fixed') {
        if (!formState.budgetMin || formState.budgetMin.trim() === '') {
          Alert.alert('Required Fields', 'Please enter a fixed price')
          return null
        }
      }
      else if (formState.budgetType === 'range') {
        if (!formState.budgetMin || formState.budgetMin.trim() === '' || 
            !formState.budgetMax || formState.budgetMax.trim() === '') {
          Alert.alert('Required Fields', 'Please enter minimum and maximum prices')
          return null
        }
        // Validate min < max
        const min = parseFloat(formState.budgetMin);
        const max = parseFloat(formState.budgetMax);
        if (min >= max) {
          Alert.alert('Invalid Range', 'Minimum price must be less than maximum price')
        return null
      }
      }
      else if (formState.budgetType === 'price_list') {
        if (!formState.price_list || formState.price_list.length === 0) {
          Alert.alert('Required Fields', 'Please add at least one service to your price list')
          return null
        }
        // Validate each price list item
        const invalidItems = formState.price_list.filter(
          item => !item.serviceName || !item.serviceName.trim() || 
                  !item.price || !item.price.trim()
        )
        if (invalidItems.length > 0) {
          Alert.alert('Invalid Price List', 'Please fill in all service names and prices')
        return null
        }
      }
      
      console.log('✅ Step 2 validation passed, moving to step 3');
      return 3
    }
    // Step 3: Booking Slots (optional)
    else if (currentStep === 3) {
      // Booking is optional, no validation needed
      return 4
    }
    // Step 4: Location
    else if (currentStep === 4) {
      if (!formState.locationAddress.trim()) {
        Alert.alert('Required Fields', 'Please enter or detect a location')
        return null
      }
      if (formState.showExactAddress) {
        if (!formState.streetAddress.trim() || !formState.city.trim() || 
            !formState.postalCode.trim() || !formState.country.trim()) {
          Alert.alert('Required Fields', 'Please fill in all required address fields')
          return null
        }
      }
      return 5
    }
    // Step 5: Settings (optional, no validation needed)
    else if (currentStep === 5) {
      return 6
    }
    return null
  }

  const handleSubmit = async (
    formState: ListingFormState,
    isEditMode: boolean,
    listingId: string | undefined,
    onSuccess: () => void
  ) => {
    try {
      setLoading(true)
      console.log('🚀 Starting submission process...')
      console.log('📝 Form validation check:', {
        title: formState.title.trim(),
        description: formState.description.trim(),
        category: formState.category,
        locationAddress: formState.locationAddress.trim(),
        budgetMin: formState.budgetMin,
        budgetMax: formState.budgetMax,
      })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create listings.')
        setLoading(false)
        return
      }

      // Validate required fields before building data
      if (!formState.title.trim()) {
        Alert.alert('Validation Error', 'Title is required')
        setLoading(false)
        return
      }
      if (!formState.description.trim()) {
        Alert.alert('Validation Error', 'Description is required')
        setLoading(false)
        return
      }
      if (!formState.category) {
        Alert.alert('Validation Error', 'Category is required')
        setLoading(false)
        return
      }
      if (!formState.locationAddress.trim()) {
        Alert.alert('Validation Error', 'Location address is required')
        setLoading(false)
        return
      }

      // Build listing data
      const listingData: any = {
        title: formState.title.trim(),
        description: formState.description.trim(),
        category: formState.category,
        tags: formState.tags.length > 0 ? formState.tags : null,
        // Always save photos as array (even if empty) to ensure proper type in database
        photos: formState.photos && formState.photos.length > 0 ? formState.photos : [],
        budget_type: formState.budgetType,
        budget_min: formState.budgetMin ? parseFloat(formState.budgetMin) : null,
        budget_max: formState.budgetMax ? parseFloat(formState.budgetMax) : null,
        price_list: formState.price_list && formState.price_list.length > 0 ? formState.price_list : [],
        currency: formState.currency || 'GBP',
        urgency: formState.urgency || null,
        preferred_date: (() => {
          // Validate and format preferred_date
          if (!formState.preferredDate || formState.preferredDate.trim() === '') {
            return null
          }
          
          const dateStr = formState.preferredDate.trim()
          
          // Validate date format (YYYY-MM-DD)
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/
          if (!dateRegex.test(dateStr)) {
            console.warn('Invalid date format:', dateStr)
            return null
          }
          
          // Validate date is actually valid
          const date = new Date(dateStr)
          if (isNaN(date.getTime())) {
            console.warn('Invalid date value:', dateStr)
            return null
          }
          
          // Check if date components match (catches cases like "2025-12-225")
          const [year, month, day] = dateStr.split('-').map(Number)
          const expectedDate = new Date(year, month - 1, day)
          if (
            expectedDate.getFullYear() !== year ||
            expectedDate.getMonth() !== month - 1 ||
            expectedDate.getDate() !== day
          ) {
            console.warn('Invalid date components:', dateStr)
            return null
          }
          
          return dateStr
        })(),
        location_address: formState.locationAddress.trim(),
        location_lat: formState.locationLat,
        location_lng: formState.locationLng,
        show_exact_address: formState.showExactAddress,
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        // Booking settings (Only include columns that exist in listings table)
        booking_enabled: formState.booking_enabled || false,
        service_name: formState.service_name || null,
        time_slots: formState.time_slots && formState.time_slots.length > 0 ? formState.time_slots : [],
      }

      // Log the data being saved for debugging
      console.log('💾 Saving listing data:', {
        hasPhotos: formState.photos.length > 0,
        photosCount: formState.photos.length,
        photos: formState.photos,
        listingDataPhotos: listingData.photos,
      })

      if (isEditMode && listingId) {
        // Update existing listing
        const { error, data } = await supabase
          .from('listings')
          .update(listingData)
          .eq('id', listingId)
          .eq('user_id', user.id)
          .select()

        if (error) {
          console.error('❌ Update error:', error)
          // Log detailed error information
          console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          })
          // Provide more helpful error message
          const errorMessage = error.details 
            ? `${error.message}: ${error.details}`
            : error.message || 'Failed to update listing. Please check all required fields.'
          throw new Error(errorMessage)
        }

        console.log('✅ Listing updated:', data)
        
        // Update or create service_settings if booking is enabled
        if (formState.booking_enabled && data && data[0]) {
          await saveServiceSettings(data[0].id, formState);
        }
        
        // Save review incentive settings
        if (data && data[0]) {
          await saveReviewIncentiveSettings(data[0].id, user.id, formState);
        }
        
        Alert.alert('Success', 'Listing updated successfully!')
      } else {
        // Create new listing
        listingData.user_id = user.id

        const { error, data } = await supabase
          .from('listings')
          .insert(listingData)
          .select()

        if (error) {
          console.error('❌ Insert error:', error)
          // Log detailed error information
          console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          })
          // Provide more helpful error message
          const errorMessage = error.details 
            ? `${error.message}: ${error.details}`
            : error.message || 'Failed to create listing. Please check all required fields.'
          throw new Error(errorMessage)
        }

        console.log('✅ Listing created:', data)
        
        // Create service_settings if booking is enabled
        if (formState.booking_enabled && data && data[0]) {
          await saveServiceSettings(data[0].id, formState);
        }
        
        // Save review incentive settings
        if (data && data[0]) {
          await saveReviewIncentiveSettings(data[0].id, user.id, formState);
        }
        
        Alert.alert('Success', 'Listing created successfully!')
      }

      onSuccess()
    } catch (error: any) {
      console.error('❌ Submission error:', error)
      const errorMessage = error?.message || 'Failed to save listing. Please try again.'
      Alert.alert('Error', errorMessage)
    } finally {
      console.log('🏁 Submission process finished')
      setLoading(false)
    }
  }

  return {
    handlePickPhotos,
    handleDetectLocation,
    handleNext,
    handleSubmit,
  }
}
