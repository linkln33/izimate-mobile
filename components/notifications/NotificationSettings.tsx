import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Switch, Alert, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNotificationPreferences } from '@/lib/utils/notification-manager'

interface NotificationPreferences {
  pushEnabled: boolean
  bookingReminders: boolean
  messageNotifications: boolean
  matchNotifications: boolean
  bookingConfirmations: boolean
  bookingRequests: boolean
  marketingEmails: boolean
}

export function NotificationSettings() {
  const { updateNotificationPreferences, getNotificationPreferences } = useNotificationPreferences()
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushEnabled: true,
    bookingReminders: true,
    messageNotifications: true,
    matchNotifications: true,
    bookingConfirmations: true,
    bookingRequests: true,
    marketingEmails: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const savedPreferences = await getNotificationPreferences()
      if (savedPreferences) {
        setPreferences(prev => ({ ...prev, ...savedPreferences }))
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value }
    
    // If disabling push notifications, show confirmation
    if (key === 'pushEnabled' && !value) {
      Alert.alert(
        'Disable Push Notifications?',
        'You will no longer receive important booking updates and reminders on your device.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Disable', 
            style: 'destructive',
            onPress: () => updatePreference(key, value, newPreferences)
          }
        ]
      )
      return
    }

    updatePreference(key, value, newPreferences)
  }

  const updatePreference = async (
    key: keyof NotificationPreferences, 
    value: boolean, 
    newPreferences: NotificationPreferences
  ) => {
    setPreferences(newPreferences)
    
    try {
      await updateNotificationPreferences(newPreferences)
    } catch (error) {
      console.error('Error updating preferences:', error)
      // Revert on error
      setPreferences(preferences)
      Alert.alert('Error', 'Failed to update notification preferences. Please try again.')
    }
  }

  const SettingItem = ({ 
    title, 
    description, 
    icon, 
    value, 
    onToggle, 
    disabled = false 
  }: {
    title: string
    description: string
    icon: string
    value: boolean
    onToggle: (value: boolean) => void
    disabled?: boolean
  }) => (
    <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
      <View style={styles.settingIcon}>
        <Ionicons 
          name={icon as any} 
          size={24} 
          color={disabled ? '#9ca3af' : '#f25842'} 
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>
          {title}
        </Text>
        <Text style={[styles.settingDescription, disabled && styles.settingDescriptionDisabled]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#e5e7eb', true: '#fecaca' }}
        thumbColor={value ? '#f25842' : '#9ca3af'}
        ios_backgroundColor="#e5e7eb"
      />
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <Text style={styles.headerSubtitle}>
          Manage how you receive notifications from iZimate Job
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>
        <SettingItem
          title="Enable Push Notifications"
          description="Receive notifications on your device"
          icon="notifications"
          value={preferences.pushEnabled}
          onToggle={(value) => handleToggle('pushEnabled', value)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Notifications</Text>
        <SettingItem
          title="Booking Confirmations"
          description="Get notified when bookings are confirmed or cancelled"
          icon="checkmark-circle"
          value={preferences.bookingConfirmations}
          onToggle={(value) => handleToggle('bookingConfirmations', value)}
          disabled={!preferences.pushEnabled}
        />
        <SettingItem
          title="Booking Requests"
          description="Get notified about new booking requests"
          icon="calendar"
          value={preferences.bookingRequests}
          onToggle={(value) => handleToggle('bookingRequests', value)}
          disabled={!preferences.pushEnabled}
        />
        <SettingItem
          title="Booking Reminders"
          description="Receive reminders before your appointments"
          icon="alarm"
          value={preferences.bookingReminders}
          onToggle={(value) => handleToggle('bookingReminders', value)}
          disabled={!preferences.pushEnabled}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Communication</Text>
        <SettingItem
          title="Messages"
          description="Get notified about new messages"
          icon="chatbubble"
          value={preferences.messageNotifications}
          onToggle={(value) => handleToggle('messageNotifications', value)}
          disabled={!preferences.pushEnabled}
        />
        <SettingItem
          title="Matches"
          description="Get notified about new matches and interests"
          icon="heart"
          value={preferences.matchNotifications}
          onToggle={(value) => handleToggle('matchNotifications', value)}
          disabled={!preferences.pushEnabled}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Marketing</Text>
        <SettingItem
          title="Marketing Emails"
          description="Receive promotional emails and updates"
          icon="mail"
          value={preferences.marketingEmails}
          onToggle={(value) => handleToggle('marketingEmails', value)}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          You can always change these settings later. Some notifications may still be sent for important account and security updates.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
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
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingIcon: {
    marginRight: 16,
    width: 32,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  settingTitleDisabled: {
    color: '#9ca3af',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  settingDescriptionDisabled: {
    color: '#9ca3af',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    textAlign: 'center',
  },
})
