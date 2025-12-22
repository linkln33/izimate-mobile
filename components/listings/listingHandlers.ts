import { Alert, Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { uploadMultipleImages } from '@/lib/utils/images'
import { getCurrentLocation, reverseGeocode } from '@/lib/utils/location'
import type { ListingFormState, ListingFormActions, Step } from './useListingForm'

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
        
        // Check if it's a CORS error and provide helpful message
        const isCorsError = uploadError.message.includes('CORS')
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown'
        const errorMessage = isCorsError
          ? `CORS Error: The web app's API is blocking requests.\n\n` +
            `Your origin: ${currentOrigin}\n` +
            `API: https://www.izimate.com/api/upload-image\n\n` +
            `Fix: Configure CORS on your Next.js API route to allow this origin.\n\n` +
            `Or set EXPO_PUBLIC_API_URL=http://localhost:3000 if running Next.js locally.`
          : `Upload failed: ${uploadError.message}\n\n` +
            `${imageUris.length} photo(s) added for preview only (won't persist on submit).`
        
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
    if (currentStep === 1) {
      if (!formState.title.trim() || !formState.description.trim() || !formState.category) {
        Alert.alert('Required Fields', 'Please fill in title, description, and category')
        return null
      }
      return 2
    } else if (currentStep === 2) {
      if (formState.budgetType !== 'hourly' && !formState.budgetMin) {
        Alert.alert('Required Fields', 'Please enter a minimum budget')
        return null
      }
      if (formState.budgetType === 'range' && !formState.budgetMax) {
        Alert.alert('Required Fields', 'Please enter a maximum budget')
        return null
      }
      return 3
    } else if (currentStep === 3) {
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
      return 4
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
        urgency: formState.urgency,
        preferred_date: formState.preferredDate || null,
        location_address: formState.locationAddress.trim(),
        location_lat: formState.locationLat,
        location_lng: formState.locationLng,
        show_exact_address: formState.showExactAddress,
        // Temporarily commented out until PostgREST schema cache refreshes
        // These columns exist in the database but PostgREST hasn't refreshed its cache yet
        // Uncomment these lines in a few minutes once the cache refreshes:
        // street_address: formState.showExactAddress ? formState.streetAddress.trim() : null,
        // city: formState.showExactAddress ? formState.city.trim() : null,
        // state: formState.showExactAddress ? formState.state.trim() : null,
        // postal_code: formState.showExactAddress ? formState.postalCode.trim() : null,
        // country: formState.showExactAddress ? formState.country.trim() : null,
        // location_notes: formState.locationNotes.trim() || null,
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
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
