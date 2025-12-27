import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, Image, Switch } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/utils/images'
import { getCurrentLocation, reverseGeocode } from '@/lib/utils/location'
import type { User } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { PaymentSettings } from '@/components/settings/PaymentSettings'
import { LanguageSelector } from '@/components/settings/LanguageSelector'

interface Props {
  user: User | null
  onUserUpdate: (user: User) => void
  initialSection?: 'profile' | 'payment' | 'language'
  onSectionChange?: (section: 'profile' | 'payment' | 'language') => void
}

export function SettingsTab({ user, onUserUpdate, initialSection = 'profile', onSectionChange }: Props) {
  const router = useRouter()
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'profile' | 'preferences' | 'notifications' | 'payment' | 'language'>(initialSection)

  // Update active section when initialSection changes
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection)
    }
  }, [initialSection])

  const handleSectionChange = (section: 'profile' | 'preferences' | 'notifications' | 'payment' | 'language') => {
    setActiveSection(section)
    if (onSectionChange && (section === 'payment' || section === 'language')) {
      onSectionChange(section)
    }
  }

  // Profile form state
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [location, setLocation] = useState('')

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setBio(user.bio || '')
      setPhone(user.phone || '')
      setAvatarUrl(user.avatar_url || '')
      setLocation(user.location_address || '')
    }
  }, [user])

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
      const locationData = await getCurrentLocation()
      const address = await reverseGeocode(locationData.lat, locationData.lng)
      setLocation(address)

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
      const updateData: Record<string, any> = {
        name: name.trim(),
      }
      
      // Only include optional fields if they have values
      if (bio.trim()) updateData.bio = bio.trim()
      if (phone.trim()) updateData.phone = phone.trim()
      if (avatarUrl) updateData.avatar_url = avatarUrl
      
      const { error, data } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      if (data) {
        onUserUpdate(data as User)
        Alert.alert('Success', 'Profile updated successfully')
      }
    } catch (error: any) {
      console.error('💾 Profile save error:', error)
      Alert.alert('Error', error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Section Tabs */}
      <View style={styles.sectionTabs}>
        <Pressable
          style={[styles.sectionTab, activeSection === 'profile' && styles.sectionTabActive]}
          onPress={() => handleSectionChange('profile')}
        >
          <Text style={[styles.sectionTabText, activeSection === 'profile' && styles.sectionTabTextActive]}>
            Profile
          </Text>
        </Pressable>
        <Pressable
          style={[styles.sectionTab, activeSection === 'payment' && styles.sectionTabActive]}
          onPress={() => handleSectionChange('payment')}
        >
          <Text style={[styles.sectionTabText, activeSection === 'payment' && styles.sectionTabTextActive]}>
            {t('settings.paymentSettings')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.sectionTab, activeSection === 'language' && styles.sectionTabActive]}
          onPress={() => handleSectionChange('language')}
        >
          <Text style={[styles.sectionTabText, activeSection === 'language' && styles.sectionTabTextActive]}>
            {t('settings.language')}
          </Text>
        </Pressable>
      </View>

      {activeSection === 'profile' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.profileInformation')}</Text>

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
              <Text style={styles.changeAvatarText}>{t('profile.changePhoto')}</Text>
            </Pressable>
          </View>

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

      {activeSection === 'payment' && (
        <View style={styles.section}>
          <PaymentSettings />
        </View>
      )}

      {activeSection === 'language' && (
        <View style={styles.section}>
          <LanguageSelector />
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 20,
  },
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  sectionTabActive: {
    backgroundColor: '#fee2e2',
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  sectionTabTextActive: {
    color: '#f25842',
    fontWeight: '600',
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
})
