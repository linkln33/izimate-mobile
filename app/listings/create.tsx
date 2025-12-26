import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, Platform } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { checkListingQuota } from '@/lib/utils/listings'
import { useListingForm, type Step } from '@/components/listings/useListingForm'
import { createListingHandlers } from '@/components/listings/listingHandlers'
import { Step1BasicInfo } from '@/components/listings/steps/Step1BasicInfo'
import { Step2Budget } from '@/components/listings/steps/Step2Budget'
import { Step3Booking } from '@/components/listings/steps/Step3Booking'
import { Step4Settings } from '@/components/listings/steps/Step4Settings'
import { Step5Location } from '@/components/listings/steps/Step5Location'
import { Step6Review } from '@/components/listings/steps/Step6Review'
import { createListingStyles } from '@/components/listings/createListingStyles'
import type { Listing } from '@/lib/types'

// Internal component that gets remounted when key changes
function CreateListingScreenContent() {
  console.log('🎬 CreateListingScreenContent: Component mounted/render')
  
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string }>()
  const id = params.id
  const isEditMode = !!id
  const titleInputRef = useRef<TextInput>(null)
  
  // Get user ID immediately to create unique key
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Initialize user ID on mount
  useEffect(() => {
    console.log('👤 CreateListingScreenContent: Initializing user...')
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || null
      console.log('👤 CreateListingScreenContent: User initialized:', userId)
      setCurrentUserId(userId)
    }
    initUser()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id || null
      console.log('🔔 CreateListingScreenContent: Auth event:', event, 'User:', userId)
      setCurrentUserId(userId)
    })
    
    return () => {
      console.log('🧹 CreateListingScreenContent: Cleaning up auth listener')
      subscription.unsubscribe()
    }
  }, [])
  
  // Form state management
  const [step, setStep] = useState<Step>(() => 1)
  const [loading, setLoading] = useState(() => false)
  const [loadingListing, setLoadingListing] = useState(() => false)
  const [quota, setQuota] = useState<any>(() => null)

  // Use custom hook for form state
  const { state: formState, actions: formActions } = useListingForm(isEditMode)
  
  // Handle Ctrl+A / Cmd+A for title input on web
  useEffect(() => {
    if (Platform.OS === 'web' && titleInputRef.current) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.key === 'a' || event.key === 'A') && 
            (event.ctrlKey || event.metaKey)) {
          const inputElement = (titleInputRef.current as any)?._nativeNode || 
                             (titleInputRef.current as any)?._internalFiberInstanceHandleDEV?.stateNode
          if (inputElement === document.activeElement && formState.title.length > 0) {
            event.preventDefault()
            inputElement.setSelectionRange(0, formState.title.length)
          }
        }
      }
      
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [formState.title])

  // Track current user and create a key for forcing remount
  const [userKey, setUserKey] = useState<string>(() => {
    return `init-${Date.now()}`
  })
  const currentUserRef = useRef<string | null>(null)
  const hasResetRef = useRef(false)
  const hasLoadedListingRef = useRef(false)
  const loadingListingIdRef = useRef<string | null>(null)

  // Define functions before useEffect that uses them
  const checkQuota = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const quotaData = await checkListingQuota(user.id)
      setQuota(quotaData)
    }
  }, [])

  const loadExistingListing = useCallback(async (listingId: string) => {
    // Prevent loading the same listing multiple times
    if (hasLoadedListingRef.current && loadingListingIdRef.current === listingId) {
      console.log('⏭️ Skipping duplicate listing load:', listingId)
      return
    }

    try {
      setLoadingListing(true)
      loadingListingIdRef.current = listingId
      console.log('📥 Loading listing for edit:', listingId)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Error', 'Please log in to edit listings.')
        router.replace('/(auth)/login')
        return
      }

      // Fetch the listing with all fields
      const { data: listing, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .eq('user_id', user.id)
        .single()

      if (error || !listing) {
        if (__DEV__) {
          console.error('❌ Error loading listing:', error)
        }
        Alert.alert('Error', 'Listing not found or you do not have permission to edit it.')
        router.replace('/(tabs)/offer')
        return
      }

      // Fetch service_settings for cancellation settings
      const { data: serviceSettings } = await supabase
        .from('service_settings')
        .select('cancellation_hours, cancellation_fee_enabled, cancellation_fee_percentage, cancellation_fee_amount, refund_policy')
        .eq('listing_id', listingId)
        .single()

      // Attach service_settings to listing for loadFromListing
      const listingWithSettings = {
        ...listing,
        service_settings: serviceSettings || null,
      }

      if (__DEV__) {
        console.log('✅ Listing loaded:', listing.id, 'Title:', listing.title)
        console.log('📋 Listing data:', {
          title: listing.title,
          category: listing.category,
          photos: listing.photos,
          budget_type: listing.budget_type,
          location_address: listing.location_address,
          service_settings: serviceSettings,
        })
      }

      // Load data into form
      formActions.loadFromListing(listingWithSettings as any)
      if (__DEV__) {
        console.log('✅ Form data loaded from listing')
      }
      
      // Mark as loaded to prevent re-loading
      hasLoadedListingRef.current = true
      setLoadingListing(false)
    } catch (error: any) {
      console.error('❌ Error loading listing:', error)
      Alert.alert('Error', 'Failed to load listing data.')
      setLoadingListing(false)
      router.replace('/(tabs)/offer')
    }
  }, [router, formActions])

  // Get current user and set key for component remounting
  useEffect(() => {
    const initialKey = `init-${Date.now()}`
    setUserKey(initialKey)
    
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'no-user'
      
      const newKey = `${userId}-${Date.now()}`
      setUserKey(newKey)
      
      if (currentUserRef.current !== null && currentUserRef.current !== userId) {
        console.log('🔄 User changed detected, forcing reset')
        hasResetRef.current = false
      }
      
      currentUserRef.current = userId
    }
    
    getCurrentUser()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id || 'no-user'
      
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        console.log('🔄 Auth state changed:', event, 'User:', userId)
        currentUserRef.current = userId
        const newKey = `${userId}-${Date.now()}`
        setUserKey(newKey)
        hasResetRef.current = false
        
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            const keys = Object.keys(window.localStorage)
            keys.forEach(key => {
              if (key.includes('listing') || key.includes('create')) {
                window.localStorage.removeItem(key)
              }
            })
          } catch (e) {
            console.warn('Could not clear localStorage:', e)
          }
        }
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // ALWAYS reset form when creating new listing (not editing) OR when user changes
  useEffect(() => {
    // Only run if we have the necessary data
    if (!currentUserId && !isEditMode) {
      // Wait for user to be loaded
      return
    }

    if (isEditMode && id) {
      // Check if we're loading a different listing
      if (loadingListingIdRef.current !== id) {
        console.log('📝 New listing to edit, resetting refs:', id)
        hasLoadedListingRef.current = false
        loadingListingIdRef.current = null
      }
      
      // Prevent loading the same listing multiple times
      if (hasLoadedListingRef.current && loadingListingIdRef.current === id) {
        console.log('⏭️ Skipping duplicate listing load:', id)
        return
      }
      
      console.log('📝 Edit mode: Loading existing listing:', id)
      // Set the loadingListingIdRef BEFORE calling to prevent duplicate calls
      loadingListingIdRef.current = id
      loadExistingListing(id)
      // hasLoadedListingRef is set to true inside loadExistingListing after success
      hasResetRef.current = true
      return
    }

    // Create mode: ALWAYS reset form immediately
    // Only reset if we haven't already reset for this user
    if (hasResetRef.current && currentUserRef.current === currentUserId) {
      console.log('⏭️ Skipping form reset - already reset for user:', currentUserId)
      return
    }

    console.log('🔄 FORCING form reset - user:', currentUserId, 'previous:', currentUserRef.current)
    
    currentUserRef.current = currentUserId
    hasLoadedListingRef.current = false
    loadingListingIdRef.current = null
    
    // Force synchronous reset
    formActions.resetForm()
    hasResetRef.current = true
    
    // Aggressive reset on web
    if (Platform.OS === 'web') {
      requestAnimationFrame(() => {
        formActions.resetForm()
        
        setTimeout(() => {
          formActions.resetForm()
        }, 100)
      })
    }
    
    // Check quota after reset
    const initializeForm = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await checkQuota()
      }
    }

    initializeForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, id, currentUserId]) // Only depend on stable values to prevent infinite loops

  // Create handlers
  const handlers = createListingHandlers(
    formActions,
    setLoading,
    setStep,
    formActions.setPhotos,
    formState.photos
  )

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step)
    } else {
      router.back()
    }
  }

  const handleClose = () => {
    router.back()
  }

  const handleNext = () => {
    // Step 3: Booking & Schedule (no validation needed, optional)
    if (step === 3) {
      const step5Validation = (window as any).__step5BookingValidation;
      if (step5Validation) {
        step5Validation();
        return;
      }
    }
    
    const nextStep = handlers.handleNext(step, formState)
    if (nextStep) {
      setStep(nextStep)
    }
  }

  const handleSubmit = async () => {
    console.log('🔘 Submit button pressed')
    console.log('📋 Form state:', {
      step,
      hasTitle: !!formState.title,
      hasDescription: !!formState.description,
      hasCategory: !!formState.category,
      hasLocation: !!formState.locationAddress,
      photosCount: formState.photos.length,
      isEditMode,
      listingId: id,
    })
    
    try {
      await handlers.handleSubmit(formState, isEditMode, id, () => {
        console.log('✅ Submit success, navigating to offer tab')
        router.replace('/(tabs)/offer')
      })
    } catch (error: any) {
      console.error('❌ Submit handler error:', error)
      // Error is already handled in handlers.handleSubmit with Alert
    }
  }

  // Debug: Log form state
  useEffect(() => {
    if (!isEditMode && (formState.title || formState.description || formState.category || formState.photos.length > 0)) {
      console.log('🔍 DEBUG: Form has data when it should be empty:', {
        title: formState.title,
        description: formState.description.substring(0, 50),
        category: formState.category,
        photosCount: formState.photos.length,
        currentUserId,
        userKey,
        hasReset: hasResetRef.current,
      })
    }
  }, [formState.title, formState.description, formState.category, formState.photos, isEditMode, currentUserId, userKey])

  // Show loading state while fetching existing listing
  if (loadingListing) {
    return (
      <View style={createListingStyles.container}>
        <View style={createListingStyles.centerContainer}>
          <ActivityIndicator size="large" color="#f25842" />
          <Text style={createListingStyles.loadingText}>Loading listing...</Text>
        </View>
      </View>
    )
  }

  // Get categories based on listing type
  const getCategories = (listingType?: string) => {
    switch (listingType) {
      case 'rental':
        return [
          // Vehicles
          'Car', 'Motorcycle', 'Bike', 'Boat', 'RV', 'Scooter',
          // Accommodation
          'Home', 'Apartment', 'Room', 'Couchsurfing', 'Cabin', 'Villa',
          // Equipment
          'Tools', 'Electronics', 'Camera', 'Sports Equipment', 'Party Supplies', 'Furniture',
          // Spaces
          'Event Space', 'Parking', 'Storage', 'Workspace', 'Studio',
          // Other
          'Other', 'Custom',
        ]
      
      case 'experience':
        return [
          'Tours', 'Workshops', 'Classes', 'Events', 'Concerts', 'Tickets',
          'Adventure', 'Cooking', 'Art', 'Music', 'Sports', 'Wellness',
          'Virtual Experience', 'Group Activity', 'Other', 'Custom',
        ]
      
      case 'subscription':
        return [
          'Monthly Service', 'Membership', 'Subscription Box', 'Software',
          'Content Access', 'Gym', 'Co-working', 'Streaming', 'Other', 'Custom',
        ]
      
      case 'freelance':
        return [
          'UGC Creator', 'Design', 'Writing', 'Video Editing', 'Photography',
          'Social Media', 'Consulting', 'Web Development', 'Marketing',
          'Translation', 'Voice Over', 'Other', 'Custom',
        ]
      
      case 'auction':
        return [
          'Collectibles', 'Electronics', 'Vehicles', 'Art', 'Jewelry',
          'Antiques', 'Real Estate', 'Services', 'Other', 'Custom',
        ]
      
      case 'space_sharing':
        return [
          'Parking', 'Storage', 'Workspace', 'Event Venue', 'Studio',
          'Kitchen', 'Couchsurfing', 'Photo Studio', 'Music Studio',
          'Warehouse', 'Other', 'Custom',
        ]
      
      case 'fundraising':
        return [
          'Charity', 'Personal', 'Business', 'Event', 'Medical',
          'Education', 'Disaster Relief', 'Animal Welfare', 'Other', 'Custom',
        ]
      
      case 'delivery':
        return [
          'Food', 'Grocery', 'Package', 'Medicine', 'Flowers',
          'Documents', 'Other', 'Custom',
        ]
      
      case 'taxi':
        return [
          'Standard', 'Luxury', 'Van', 'Motorcycle', 'Bike',
          'Airport Transfer', 'City Tour', 'Other', 'Custom',
        ]
      
      case 'link':
        return [
          'Affiliate', 'Redirect', 'Short Link', 'Promotion', 'Other', 'Custom',
        ]
      
      case 'goods':
        return [
          'Electronics', 'Clothing', 'Furniture', 'Books', 'Toys',
          'Sports', 'Home & Garden', 'Other', 'Custom',
        ]
      
      default: // service
        return [
          'Plumbing', 'Electrical', 'Handyman', 'Cleaning', 'Carpentry',
          'HVAC', 'Painting', 'Roofing', 'Landscaping', 'Flooring',
          'Tutoring', 'Pet Care', 'Beauty', 'Fitness', 'Other', 'Custom', 'Adult',
        ]
    }
  }

  const categories = getCategories(formState.listing_type)

  return (
    <View key={`create-listing-${userKey || currentUserId || 'default'}`} style={createListingStyles.container}>
      {/* Header */}
      <View style={createListingStyles.header}>
        <Pressable onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={createListingStyles.headerTitle}>{isEditMode ? 'Edit Listing' : 'Create Listing'}</Text>
        <Pressable 
          style={createListingStyles.closeButton} 
          onPress={handleClose}
        >
          <Ionicons name="close" size={24} color="#1a1a1a" />
        </Pressable>
      </View>

      {/* Progress */}
      <View style={createListingStyles.progress}>
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <View
            key={s}
            style={[
              createListingStyles.progressStep,
              s <= step && createListingStyles.progressStepActive,
              s < step && createListingStyles.progressStepCompleted,
            ]}
          />
        ))}
      </View>

      <ScrollView style={createListingStyles.content} contentContainerStyle={createListingStyles.contentContainer}>
        {step === 1 && (
          <Step1BasicInfo
            formState={formState}
            formActions={formActions}
            loading={loading}
            onPickPhotos={handlers.handlePickPhotos}
            titleInputRef={titleInputRef}
            categories={categories}
          />
        )}

        {step === 2 && (
          <Step2Budget
            formState={formState}
            formActions={formActions}
          />
        )}

        {step === 3 && (
          <Step3Booking
            formState={formState}
            formActions={formActions}
            isLoading={loading}
          />
        )}

        {step === 4 && (
          <Step4Settings
            formState={formState}
            formActions={formActions}
            listingId={id}
          />
        )}

        {step === 5 && (
          <Step5Location
            formState={formState}
            formActions={formActions}
            loading={loading}
            onDetectLocation={handlers.handleDetectLocation}
          />
        )}

        {step === 6 && (
          <Step6Review
            formState={formState}
            quota={quota}
          />
        )}
      </ScrollView>

      {/* Footer */}
      <View style={createListingStyles.footer}>
        {step > 1 && (
          <Pressable style={createListingStyles.backButton} onPress={handleBack}>
            <Text style={createListingStyles.backButtonText}>Back</Text>
          </Pressable>
        )}
        {step < 6 ? (
          <Pressable style={createListingStyles.nextButton} onPress={handleNext}>
            <Text style={createListingStyles.nextButtonText}>Continue</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[createListingStyles.submitButton, loading && createListingStyles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={createListingStyles.submitButtonText}>{isEditMode ? 'Update Listing' : 'Create Listing'}</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  )
}

// Wrapper component to handle user changes and force remount
export default function CreateListingScreen() {
  const [userKey, setUserKey] = useState<string>(() => {
    return `init-${Date.now()}`
  })
  const [shouldRender, setShouldRender] = useState(true)

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'no-user'
      const newKey = `${userId}-${Date.now()}`
      console.log('🔑 Wrapper: Setting initial key:', newKey)
      setUserKey(newKey)
    }
    
    getCurrentUser()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id || 'no-user'
      
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        console.log('🔑 Wrapper: Auth state changed:', event, 'User:', userId)
        // Temporarily unmount to force complete reset
        setShouldRender(false)
        
        // Remount with new key
        setTimeout(() => {
          const newKey = `${userId}-${Date.now()}`
          console.log('🔑 Wrapper: Setting new key after auth change:', newKey)
          setUserKey(newKey)
          setShouldRender(true)
        }, 50)
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (!shouldRender) {
    return null
  }

  return <CreateListingScreenContent key={userKey} />
}
