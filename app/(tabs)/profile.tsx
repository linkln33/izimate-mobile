import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, Image, Switch } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/utils/images'
import { getCurrentLocation, reverseGeocode } from '@/lib/utils/location'
import type { User, ProviderProfile } from '@/lib/types'

export default function ProfileScreen() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'provider'>('profile')

  // Profile form state
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [location, setLocation] = useState('')
  const [currency, setCurrency] = useState('GBP')

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
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to photos')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      })

      if (result.canceled || !result.assets || !result.assets[0]) return

      setSaving(true)
      const imageUrl = await uploadImage(result.assets[0].uri, 'avatars')
      setAvatarUrl(imageUrl)
      setSaving(false)
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image')
      setSaving(false)
    }
  }

  const handleDetectLocation = async () => {
    try {
      setSaving(true)
      const location = await getCurrentLocation()
      const address = await reverseGeocode(location.lat, location.lng)
      setLocation(address)

      // Update user location in database
      if (user) {
        await supabase
          .from('users')
          .update({
            location_lat: location.lat,
            location_lng: location.lng,
            location_address: address,
          })
          .eq('id', user.id)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get location')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          bio: bio.trim() || null,
          phone: phone.trim() || null,
          avatar_url: avatarUrl || null,
          location_address: location || null,
          currency,
          last_active: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      Alert.alert('Success', 'Profile updated successfully')
      loadUserData()
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile')
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#f25842" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
            Profile
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
            Settings
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'provider' && styles.activeTab]}
          onPress={() => setActiveTab('provider')}
        >
          <Text style={[styles.tabText, activeTab === 'provider' && styles.activeTabText]}>
            Provider
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'profile' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Information</Text>

            {/* Avatar */}
            <View style={styles.avatarSection}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#6b7280" />
                </View>
              )}
              <Pressable style={styles.changeAvatarButton} onPress={handlePickAvatar}>
                <Text style={styles.changeAvatarText}>Change Photo</Text>
              </Pressable>
            </View>

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
          </View>
        )}

        {activeTab === 'settings' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>

            {/* Affiliate Program Quick Link */}
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

            <Pressable
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Settings</Text>
              )}
            </Pressable>
          </View>
        )}

        {activeTab === 'provider' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Provider Profile</Text>
            {providerProfile ? (
              <View>
                <Text style={styles.infoText}>
                  Provider profile is set up. Rating: {providerProfile.rating.toFixed(1)} ⭐
                </Text>
                <Text style={styles.infoText}>
                  Jobs completed: {providerProfile.jobs_completed}
                </Text>
              </View>
            ) : (
              <View>
                <Text style={styles.infoText}>
                  Set up your provider profile to offer services
                </Text>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => router.push('/profile/provider/setup')}
                >
                  <Text style={styles.primaryButtonText}>Set Up Provider Profile</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#f25842',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#f25842',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  changeAvatarButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  changeAvatarText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
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
  primaryButton: {
    backgroundColor: '#f25842',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
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
})
