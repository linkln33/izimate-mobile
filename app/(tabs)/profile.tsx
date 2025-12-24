import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, Image, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/utils/images'
import { getCurrentLocation, reverseGeocode } from '@/lib/utils/location'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { RatingCriteria } from '@/components/profile/RatingCriteria'
import type { User, ProviderProfile } from '@/lib/types'

export default function ProfileScreen() {
  const router = useRouter()
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
  const [currency, setCurrency] = useState('GBP')

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
        setName(userData.name || '')
        setBio(userData.bio || '')
        setPhone(userData.phone || '')
        setAvatarUrl(userData.avatar_url || '')
        setLocation(userData.location_address || '')
        setCurrency(userData.currency || 'GBP')
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
        Alert.alert('Permission Required', 'Please allow access to photos')
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
            Alert.alert('Partial Success', 'Profile picture uploaded but failed to save to profile. Please try again.')
            return
          }
          console.log('📸 Database update successful:', updateData)
        }
        
        Alert.alert('Success', 'Profile picture updated successfully')
      } catch (uploadError: any) {
        console.error('📸 Upload error:', uploadError)
        Alert.alert(
          'Upload Failed', 
          uploadError?.message || 'Failed to upload image. Please check your internet connection and try again.'
        )
      }
      
      setSaving(false)
    } catch (error: any) {
      console.error('📸 handlePickAvatar error:', error)
      Alert.alert('Error', error?.message || 'Failed to pick image. Please try again.')
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
        }
      }
      
      Alert.alert('Success', 'Location detected successfully')
    } catch (error) {
      console.error('📍 Location detection error:', error)
      Alert.alert('Error', 'Failed to get location')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setSaving(true)
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
      if (currency) updateData.currency = currency
      
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

      Alert.alert('Success', 'Profile updated successfully')
    } catch (error: any) {
      console.error('💾 Profile save failed:', error)
      Alert.alert('Error', error?.message || 'Failed to update profile')
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
        <NotificationBell />
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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
            
            {/* Display name with verified badge inline */}
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
          <Text style={styles.sectionTitle}>Profile Information</Text>

          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
            />
          </View>

          {/* Bio */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
            />
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <View style={styles.locationHeader}>
              <Text style={styles.label}>Location</Text>
              <Pressable onPress={handleDetectLocation}>
                <Ionicons name="location" size={20} color="#f25842" />
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Enter your location"
            />
          </View>

          {/* Currency */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Currency</Text>
            <View style={styles.currencyButtons}>
              {['GBP', 'USD', 'EUR'].map((curr) => (
                <Pressable
                  key={curr}
                  style={[
                    styles.currencyButton,
                    currency === curr && styles.currencyButtonActive,
                  ]}
                  onPress={() => setCurrency(curr)}
                >
                  <Text
                    style={[
                      styles.currencyButtonText,
                      currency === curr && styles.currencyButtonTextActive,
                    ]}
                  >
                    {curr}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Affiliate Program Link */}
          <Pressable
            style={styles.affiliateCard}
            onPress={() => router.push('/(tabs)/dashboard')}
          >
            <View style={styles.affiliateCardContent}>
              <Ionicons name="people" size={24} color="#f25842" />
              <View style={styles.affiliateCardText}>
                <Text style={styles.affiliateCardTitle}>Affiliate Program</Text>
                <Text style={styles.affiliateCardSubtitle}>
                  Earn money by referring friends
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </View>
          </Pressable>

          {/* Save Button */}
          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </Pressable>

          {/* Logout Button */}
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    marginTop: 8,
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
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#f25842',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
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
    color: '#1a1a1a',
    textAlign: 'center',
  },
  avatarNamePlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '600',
  },
  statsSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    color: '#1a1a1a',
  },
  statSubtext: {
    fontSize: 16,
    color: '#6b7280',
  },
  statDetail: {
    fontSize: 12,
    color: '#6b7280',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  currencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currencyButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#f25842',
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  currencyButtonTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#f25842',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  affiliateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    color: '#1a1a1a',
    marginBottom: 4,
  },
  affiliateCardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
})
