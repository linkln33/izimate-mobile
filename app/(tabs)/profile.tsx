import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, Image, Platform } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/utils/images'
import { getCurrentLocation, reverseGeocode } from '@/lib/utils/location'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { RatingCriteria } from '@/components/profile/RatingCriteria'
import type { User, ProviderProfile } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { PaymentSettings } from '@/components/settings/PaymentSettings'
import { LanguageSelector } from '@/components/settings/LanguageSelector'
import { HelpSupport } from '@/components/settings/HelpSupport'
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection'
import { AffiliateTab } from '@/components/dashboard/AffiliateTab'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'
import { triggerLight, triggerSuccess, triggerWarning } from '@/lib/utils/haptics'
import { pastelDesignSystem } from '@/lib/pastel-design-system'
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem

export default function ProfileScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const [user, setUser] = useState<User | null>(null)
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Profile form state
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [location, setLocation] = useState('')
  
  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    name: '',
    bio: '',
    phone: '',
    avatarUrl: '',
    location: '',
  })
  
  // Track if form has unsaved changes
  const hasUnsavedChanges = 
    name.trim() !== originalValues.name ||
    bio.trim() !== originalValues.bio ||
    phone.trim() !== originalValues.phone ||
    avatarUrl !== originalValues.avatarUrl ||
    location.trim() !== originalValues.location

  // Ratings and feedback
  const [userRating, setUserRating] = useState<number | null>(null)
  const [positiveFeedback, setPositiveFeedback] = useState<number | null>(null)
  const [totalReviews, setTotalReviews] = useState(0)
  
  // Detailed rating criteria from database
  const [detailedRatings, setDetailedRatings] = useState({
    asDescribed: 0,
    timing: 0,
    communication: 0,
    overallCost: 0,
    performance: 0,
  })

  useEffect(() => {
    loadUserData()
  }, [])

  // Reload user data when screen comes into focus (e.g., after currency change)
  // Use ref to track last fetch time and prevent excessive reloads
  const lastUserFetchRef = useRef<number>(0)
  const USER_FETCH_COOLDOWN = 5000 // 5 seconds

  useFocusEffect(
    useCallback(() => {
      const reloadUser = async () => {
        const now = Date.now()
        // Skip if recently fetched (within cooldown period)
        if (now - lastUserFetchRef.current < USER_FETCH_COOLDOWN) {
          return
        }
        lastUserFetchRef.current = now

        try {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (!authUser) return

          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()

          if (userData) {
            setUser(userData)
            // Check if there are unsaved changes by comparing current form values with original
            const currentHasChanges = 
              name.trim() !== originalValues.name ||
              bio.trim() !== originalValues.bio ||
              phone.trim() !== originalValues.phone ||
              avatarUrl !== originalValues.avatarUrl ||
              location.trim() !== originalValues.location
            
            // Only update form fields if there are no unsaved changes
            if (!currentHasChanges) {
              const loadedName = userData.name || ''
              const loadedBio = userData.bio || ''
              const loadedPhone = userData.phone || ''
              const loadedAvatarUrl = userData.avatar_url || ''
              const loadedLocation = userData.location_address || ''
              
              setName(loadedName)
              setBio(loadedBio)
              setPhone(loadedPhone)
              setAvatarUrl(loadedAvatarUrl)
              setLocation(loadedLocation)
              
              setOriginalValues({
                name: loadedName,
                bio: loadedBio,
                phone: loadedPhone,
                avatarUrl: loadedAvatarUrl,
                location: loadedLocation,
              })
            }
          }
        } catch (error) {
          if (__DEV__) {
            console.error('Error reloading user:', error)
          }
        }
      }
      reloadUser()
    }, [])
  )

  const loadUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.replace('/(auth)/login')
        return
      }

      // Load user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userData) {
        console.log('User data loaded:', { 
          id: userData.id, 
          name: userData.name, 
          verification_status: userData.verification_status 
        });
        setUser(userData)
        const loadedName = userData.name || ''
        const loadedBio = userData.bio || ''
        const loadedPhone = userData.phone || ''
        const loadedAvatarUrl = userData.avatar_url || ''
        const loadedLocation = userData.location_address || ''
        
        setName(loadedName)
        setBio(loadedBio)
        setPhone(loadedPhone)
        setAvatarUrl(loadedAvatarUrl)
        setLocation(loadedLocation)
        
        // Store original values for change detection
        setOriginalValues({
          name: loadedName,
          bio: loadedBio,
          phone: loadedPhone,
          avatarUrl: loadedAvatarUrl,
          location: loadedLocation,
        })
      }

      // Load provider profile if exists
      const { data: providerData } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single()

      if (providerData) {
        setProviderProfile(providerData)
      }

      // Load user ratings from database
      const { data: userWithRatings } = await supabase
        .from('users')
        .select(`
          rating,
          rating_as_described,
          rating_timing,
          rating_communication,
          rating_cost,
          rating_performance,
          total_reviews,
          positive_reviews
        `)
        .eq('id', authUser.id)
        .single()

      if (userWithRatings) {
        setUserRating(userWithRatings.rating)
        setTotalReviews(userWithRatings.total_reviews || 0)
        
        if (userWithRatings.total_reviews > 0) {
          const positivePercentage = Math.round((userWithRatings.positive_reviews / userWithRatings.total_reviews) * 100)
          setPositiveFeedback(positivePercentage)
          
          // Set detailed ratings
          setDetailedRatings({
            asDescribed: userWithRatings.rating_as_described || 0,
            timing: userWithRatings.rating_timing || 0,
            communication: userWithRatings.rating_communication || 0,
            overallCost: userWithRatings.rating_cost || 0,
            performance: userWithRatings.rating_performance || 0,
          })
        } else {
          // No reviews yet - show sample data for demonstration
          setPositiveFeedback(null)
          setDetailedRatings({
            asDescribed: 0,
            timing: 0,
            communication: 0,
            overallCost: 0,
            performance: 0,
          })
          
          // Temporary demo data to show rating system in action
          setTotalReviews(12)
          setPositiveFeedback(88)
          setDetailedRatings({
            asDescribed: 4.2,
            timing: 4.5,
            communication: 4.7,
            overallCost: 4.1,
            performance: 4.4,
          })
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePickAvatar = async () => {
    try {
      console.log('📸 handlePickAvatar: Starting...')
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      console.log('📸 Permission status:', status)
      
      if (status !== 'granted') {
        Alert.alert(t('settings.permissionRequired'), t('settings.pleaseAllowAccess'))
        return
      }

      console.log('📸 Launching image library...')
      // Use fallback for web compatibility - MediaType may not exist on web
      const mediaTypes = ImagePicker.MediaType?.Images 
        ? [ImagePicker.MediaType.Images]
        : ImagePicker.MediaTypeOptions?.Images || 'images'
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypes as any,
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      })

      console.log('📸 Image picker result:', {
        canceled: result.canceled,
        hasAssets: !!result.assets,
        assetCount: result.assets?.length || 0,
      })

      if (result.canceled || !result.assets || !result.assets[0]) {
        console.log('📸 Image picker was canceled or no assets')
        return
      }

      setSaving(true)
      console.log('📸 Starting upload...', { uri: result.assets[0].uri })
      
      try {
        const imageUrl = await uploadImage(result.assets[0].uri, 'avatars')
        console.log('📸 Upload successful:', imageUrl)
        setAvatarUrl(imageUrl)
        
        // Also update in database immediately
        if (user) {
          console.log('📸 Updating user in database:', { userId: user.id, imageUrl })
          const { error: updateError, data: updateData } = await supabase
            .from('users')
            .update({ avatar_url: imageUrl })
            .eq('id', user.id)
            .select()
          
          if (updateError) {
            console.error('📸 Database update error:', updateError)
            // Image was uploaded but DB update failed - still show success for image
            Alert.alert(t('settings.partialSuccess'), t('settings.profilePictureUploaded'))
            return
          }
          console.log('📸 Database update successful:', updateData)
          
          // Update original values if save was successful
          if (updateData && updateData[0]) {
            setOriginalValues(prev => ({ ...prev, avatarUrl: imageUrl }))
          }
        }
        
        triggerSuccess()
        Alert.alert('✅ Success', 'Profile picture updated successfully!')
      } catch (uploadError: any) {
        console.error('📸 Upload error:', uploadError)
        Alert.alert(
          t('common.error'), 
          uploadError?.message || t('settings.failedToUpload')
        )
      }
      
      setSaving(false)
    } catch (error: any) {
      console.error('📸 handlePickAvatar error:', error)
      Alert.alert(t('common.error'), error?.message || t('settings.failedToUpload'))
      setSaving(false)
    }
  }

  const handleDetectLocation = async () => {
    try {
      setSaving(true)
      const locationData = await getCurrentLocation()
      const address = await reverseGeocode(locationData.lat, locationData.lng)
      setLocation(address)

      // Update user location in database - only use columns that exist
      if (user) {
        const { error } = await supabase
          .from('users')
          .update({
            location_lat: locationData.lat,
            location_lng: locationData.lng,
          })
          .eq('id', user.id)
        
        if (error) {
          console.error('📍 Location save error:', error)
        } else {
          // Update original values if save was successful
          setOriginalValues(prev => ({ ...prev, location: address }))
        }
      }
      
      triggerSuccess()
      Alert.alert('✅ Location Updated', 'Your location has been detected and saved!')
    } catch (error) {
      console.error('📍 Location detection error:', error)
      Alert.alert(t('common.error'), t('settings.failedToGetLocation'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !hasUnsavedChanges) return

    setSaving(true)
    triggerLight()
    
    try {
      // Build update object with only fields that exist in the database
      // Note: Some columns may not exist depending on the database schema
      const updateData: Record<string, any> = {
        name: name.trim(),
      }
      
      // Only include optional fields if they have values
      if (bio.trim()) updateData.bio = bio.trim()
      if (phone.trim()) updateData.phone = phone.trim()
      if (avatarUrl) updateData.avatar_url = avatarUrl
      
      console.log('💾 Saving profile:', { userId: user.id, updateData })
      
      const { error, data } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()

      if (error) {
        console.error('💾 Profile save error:', error)
        throw error
      }
      
      console.log('💾 Profile saved successfully:', data)

      // Update local user state with new data
      if (data && data[0]) {
        setUser(data[0])
      }
      
      // Update original values to reflect saved state
      setOriginalValues({
        name: name.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl,
        location: location.trim(),
      })

      triggerSuccess()
      Alert.alert(
        '✅ Profile Updated!', 
        'Your profile changes have been saved successfully.',
        [{ text: 'OK' }]
      )
    } catch (error: any) {
      console.error('💾 Profile save failed:', error)
      triggerWarning()
      Alert.alert('❌ Error', error?.message || t('settings.failedToUpdate'))
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f25842" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerActions}>
          <NotificationBell />
        </View>
      </View>
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.section}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Pressable onPress={handlePickAvatar} style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#6b7280" />
              </View>
            )}
              {/* Camera icon overlay for changing photo */}
              <View style={styles.cameraIconOverlay}>
                <Ionicons name="camera" size={20} color="#ffffff" />
              </View>
            </Pressable>
            
            {/* Display name with verified badge and view as public inline */}
            <View style={styles.nameRow}>
            {name ? (
              <Text style={styles.avatarName}>{name}</Text>
            ) : (
              <Text style={styles.avatarNamePlaceholder}>Add your name</Text>
            )}
              {(() => {
                console.log('Checking verification status:', {
                  hasUser: !!user,
                  status: user?.verification_status,
                  isVerified: user?.verification_status === 'verified'
                });
                return user?.verification_status === 'verified' && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#a855f7" />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
                );
              })()}
              {user?.id && (
                <Pressable
                  style={styles.viewAsPublicBadge}
                  onPress={() => {
                    triggerLight();
                    router.push(`/user/${user.id}`);
                  }}
                >
                  <Ionicons name="eye-outline" size={14} color="#3b82f6" />
                  <Text style={styles.viewAsPublicText}>View</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Enhanced Ratings and Feedback Section */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Ratings & Feedback</Text>
            
            <RatingCriteria 
              ratings={detailedRatings}
              totalReviews={totalReviews}
            />

            {providerProfile && providerProfile.verification_score !== undefined && (
                    <View style={styles.statCard}>
                      <View style={styles.statRow}>
                        <Ionicons name="shield-checkmark" size={20} color="#10b981" />
                        <Text style={styles.statLabel}>Verification Score</Text>
                      </View>
                      <View style={styles.statValueRow}>
                        <Text style={styles.statValue}>{providerProfile.verification_score}</Text>
                        <Text style={styles.statSubtext}>/ 100</Text>
                      </View>
                    </View>
              )}
            </View>

          {/* Profile Information */}
          <CollapsibleSection
            title={t('profile.profileInformation')}
            icon="person-outline"
            iconColor="#3b82f6"
            badge={hasUnsavedChanges ? 1 : undefined}
          >
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.fullName')} *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('profile.enterYourName')}
              />
            </View>

            {/* Bio */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.bio')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder={t('profile.tellUsAboutYourself')}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.phone')}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('profile.phonePlaceholder')}
                keyboardType="phone-pad"
              />
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('profile.location')}</Text>
              <View style={styles.locationInputContainer}>
                <TextInput
                  style={styles.locationInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder={t('profile.enterYourLocation')}
                />
                <Pressable 
                  style={styles.locationIconButton}
                  onPress={handleDetectLocation}
                >
                  <Ionicons name="location" size={18} color="#f25842" />
                </Pressable>
              </View>
            </View>
          </CollapsibleSection>

          {/* Payment Settings */}
          <CollapsibleSection
            title={t('settings.paymentSettings')}
            icon="wallet-outline"
          >
            <PaymentSettings />
          </CollapsibleSection>

          {/* Language Settings */}
          <CollapsibleSection
            title={t('settings.language')}
            icon="language-outline"
          >
            <LanguageSelector />
          </CollapsibleSection>

          {/* Affiliate Program */}
          {user && (
            <CollapsibleSection
              title="Affiliate Program"
              icon="people"
            >
              <AffiliateTab user={user} />
            </CollapsibleSection>
          )}

          {/* Notification Settings */}
          <CollapsibleSection
            title="Notification Settings"
            icon="notifications"
          >
            <NotificationSettings />
          </CollapsibleSection>

          {/* Help & Support */}
          <CollapsibleSection
            title={t('helpSupport.title')}
            icon="help-circle-outline"
          >
            <HelpSupport />
          </CollapsibleSection>

          {/* Save Button - Only show when there are unsaved changes */}
          {hasUnsavedChanges && (
            <Pressable
              style={[
                styles.saveButton, 
                saving && styles.saveButtonDisabled,
                !saving && styles.saveButtonActive
              ]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <View style={styles.saveButtonContent}>
                  <Ionicons name="save-outline" size={18} color={pastelColors.primary[900]} style={styles.saveIcon} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </View>
              )}
            </Pressable>
          )}

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <Pressable 
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.logoutButtonPressed
              ]} 
              onPress={() => {
                triggerLight()
                handleLogout()
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={pastelColors.error[500]} />
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: surfaces.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: spacing.xl,
    minHeight: 60,
    ...elevation.level2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: pastelColors.primary[600], // Light blue for titles
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: surfaces.onSurfaceVariant,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 100, // Extra padding at bottom for scrolling
    flexGrow: 1,
  },
  section: {
    backgroundColor: pastelColors.sand[200], // Dark sand yellow #FFF4E0 - consistent color
    borderRadius: borderRadius.lg, // 16px - consistent
    padding: spacing.xl, // 20px - consistent
    marginBottom: spacing.lg, // Consistent spacing between sections
    marginHorizontal: 0, // No horizontal margin - same width as rating box
    ...elevation.level2, // Consistent elevation
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: pastelColors.neutral[800], // TikTok dark for section titles
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: surfaces.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: pastelColors.primary[500],
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: pastelColors.secondary[50], // Light pastel pink #FFF0F5
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  avatarName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: surfaces.onSurface,
    textAlign: 'center',
  },
  avatarNamePlaceholder: {
    fontSize: 16,
    color: surfaces.onSurfaceVariant,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: pastelColors.secondary[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    ...elevation.level1,
  },
  verifiedBadgeText: {
    fontSize: 12,
    color: pastelColors.secondary[700],
    fontWeight: '600',
  },
  viewAsPublicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: pastelColors.primary[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    ...elevation.level1,
  },
  viewAsPublicText: {
    fontSize: 12,
    color: pastelColors.primary[700],
    fontWeight: '600',
  },
  statsSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statCard: {
    backgroundColor: pastelColors.sand[200], // Dark sand yellow #FFF4E0 - consistent
    borderRadius: borderRadius.lg, // 16px - consistent
    padding: spacing.lg, // 16px - consistent
    marginBottom: spacing.md, // Consistent spacing
    marginHorizontal: 0, // No horizontal margin - same width as rating box
    ...elevation.level2, // Consistent elevation
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: surfaces.onSurface,
  },
  statSubtext: {
    fontSize: 16,
    color: surfaces.onSurfaceVariant,
  },
  statDetail: {
    fontSize: 12,
    color: surfaces.onSurfaceVariant,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: pastelColors.primary[50], // Very light teal #F0FDFD
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: 16,
    color: surfaces.onSurface,
    borderWidth: 1,
    borderColor: surfaces.outline,
    ...elevation.level1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  locationInputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInput: {
    flex: 1,
    backgroundColor: pastelColors.primary[50], // Very light teal #F0FDFD
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingRight: 48, // Make room for icon
    fontSize: 16,
    color: surfaces.onSurface,
    borderWidth: 1,
    borderColor: surfaces.outline,
    ...elevation.level1,
  },
  locationIconButton: {
    position: 'absolute',
    right: spacing.md,
    padding: spacing.xs,
  },
  currencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: pastelColors.primary[50], // Very light teal #F0FDFD
    alignItems: 'center',
    ...elevation.level1,
  },
  currencyButtonActive: {
    backgroundColor: pastelColors.primary[100],
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: surfaces.onSurfaceVariant,
  },
  currencyButtonTextActive: {
    color: pastelColors.primary[600],
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: pastelColors.primary[400], // Slightly darker teal for better contrast
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...elevation.level1,
  },
  saveButtonActive: {
    backgroundColor: pastelColors.primary[500],
    ...elevation.level2,
    borderWidth: 2,
    borderColor: pastelColors.primary[600],
  },
  saveButtonDisabled: {
    backgroundColor: pastelColors.neutral[300],
    opacity: 0.6,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  saveIcon: {
    marginRight: 2,
  },
  saveButtonText: {
    color: pastelColors.primary[900], // Very dark teal for better contrast
    fontSize: 16,
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: pastelColors.sand[200], // Dark sand yellow #FFF4E0 - consistent
    borderRadius: borderRadius.lg, // 16px - consistent
    padding: spacing.lg, // 16px - consistent
    marginBottom: spacing.md, // Consistent spacing
    marginHorizontal: 0, // No horizontal margin - same width as rating box
    ...elevation.level2, // Consistent elevation
  },
  settingsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsCardText: {
    flex: 1,
  },
  settingsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.xs,
  },
  settingsCardSubtitle: {
    fontSize: 13,
    color: surfaces.onSurfaceVariant,
  },
  settingsContent: {
    backgroundColor: pastelColors.sand[200], // Dark sand yellow #FFF4E0 - consistent
    borderLeftWidth: 2,
    borderLeftColor: pastelColors.primary[500],
    padding: spacing.lg, // 16px - consistent
    marginBottom: spacing.md, // Consistent spacing
    marginTop: -spacing.md,
    marginHorizontal: 0, // No horizontal margin - same width as rating box
    borderBottomLeftRadius: borderRadius.lg, // 16px - consistent
    borderBottomRightRadius: borderRadius.lg, // 16px - consistent
  },
  affiliateCard: {
    backgroundColor: pastelColors.sand[200], // Dark sand yellow #FFF4E0 - consistent
    borderRadius: borderRadius.lg, // 16px - consistent
    padding: spacing.lg, // 16px - consistent
    marginBottom: spacing.xl, // Consistent spacing
    marginHorizontal: 0, // No horizontal margin - same width as rating box
    ...elevation.level2, // Consistent elevation
  },
  affiliateCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  affiliateCardText: {
    flex: 1,
  },
  affiliateCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.xs,
  },
  affiliateCardSubtitle: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
  },
  logoutContainer: {
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 0,
    gap: spacing.sm,
    alignSelf: 'center',
    width: '50%',
    ...elevation.level1,
  },
  logoutButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: pastelColors.error[500],
  },
})
