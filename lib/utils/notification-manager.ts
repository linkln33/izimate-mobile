import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useRouter } from 'expo-router'
import Constants from 'expo-constants'
import { 
  registerForPushNotifications, 
  savePushToken, 
  setupNotificationListeners,
  clearAllNotifications 
} from './push-notifications'
import { supabase } from '../supabase'

// Check if running in Expo Go (where push notifications are not available in SDK 53+)
const isExpoGo = Constants.executionEnvironment === 'storeClient'

// Lazy load notifications module only when needed (not in Expo Go)
let NotificationsModule: typeof import('expo-notifications') | null = null

async function getNotificationsModule(): Promise<typeof import('expo-notifications') | null> {
  if (isExpoGo) return null
  
  if (!NotificationsModule) {
    try {
      NotificationsModule = await import('expo-notifications')
    } catch (error) {
      if (__DEV__) {
        console.warn('⚠️ Could not load expo-notifications:', error)
      }
      return null
    }
  }
  
  return NotificationsModule
}

/**
 * Hook to manage push notifications throughout the app lifecycle
 */
export function useNotificationManager() {
  const router = useRouter()
  const appState = useRef(AppState.currentState)
  const notificationListener = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Initialize push notifications
    initializePushNotifications()

    // Set up notification listeners (async)
    setupNotificationListeners(
      handleNotificationReceived,
      handleNotificationResponse
    ).then(cleanup => {
      notificationListener.current = cleanup
    })

    // Handle app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      subscription?.remove()
      notificationListener.current?.()
    }
  }, [])

  const initializePushNotifications = async () => {
    try {
      const token = await registerForPushNotifications()
      if (token) {
        await savePushToken(token)
        console.log('Push notifications initialized successfully')
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
    }
  }

  const handleNotificationReceived = (notification: any) => {
    if (__DEV__) {
      console.log('📱 Notification received while app is open:', notification)
    }
    
    // You can customize behavior when notification is received while app is open
    // For example, show an in-app banner or update a badge count
  }

  const handleNotificationResponse = (response: any) => {
    if (__DEV__) {
      console.log('👆 User tapped notification:', response)
    }
    
    const { notification } = response
    const data = notification.request.content.data

    // Handle different notification types
    if (data?.type?.startsWith('booking_')) {
      handleBookingNotificationTap(data)
    } else if (data?.type === 'message') {
      handleMessageNotificationTap(data)
    } else if (data?.type === 'match') {
      handleMatchNotificationTap(data)
    }
  }

  const handleBookingNotificationTap = (data: any) => {
    const { bookingId, type, listingId } = data

    switch (type) {
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'booking_status_update':
        router.push(`/bookings/${bookingId}`)
        break
      case 'booking_request':
        router.push(`/dashboard?tab=bookings&filter=requests`)
        break
      case 'booking_completed':
        if (data.showRating) {
          router.push(`/bookings/${bookingId}/rate`)
        } else {
          router.push(`/bookings/${bookingId}`)
        }
        break
      case 'booking_reminder':
        router.push(`/bookings/${bookingId}`)
        break
      default:
        router.push('/dashboard?tab=bookings')
    }
  }

  const handleMessageNotificationTap = (data: any) => {
    const { matchId, chatId } = data
    if (chatId) {
      router.push(`/chat/${chatId}`)
    } else if (matchId) {
      router.push(`/chat/${matchId}`)
    } else {
      router.push('/messages')
    }
  }

  const handleMatchNotificationTap = (data: any) => {
    const { matchId, listingId } = data
    if (matchId) {
      router.push(`/matches/${matchId}`)
    } else if (listingId) {
      router.push(`/listings/${listingId}`)
    } else {
      router.push('/dashboard?tab=matches')
    }
  }

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      if (__DEV__) {
        console.log('App has come to the foreground!')
      }
      // Clear notification badge when app becomes active (if notifications available)
      getNotificationsModule().then(Notifications => {
        if (Notifications) {
          Notifications.setBadgeCountAsync(0).catch(() => {
            // Silently fail if notifications not available
          })
        }
      })
    }

    appState.current = nextAppState
  }

  return {
    clearAllNotifications,
    initializePushNotifications,
  }
}

/**
 * Hook to manage notification preferences
 */
export function useNotificationPreferences() {
  const updateNotificationPreferences = async (preferences: {
    pushEnabled?: boolean
    bookingReminders?: boolean
    messageNotifications?: boolean
    matchNotifications?: boolean
    bookingConfirmations?: boolean
    bookingRequests?: boolean
    marketingEmails?: boolean
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get current preferences and merge with new ones
      const { data: currentUser } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', user.id)
        .single()

      const currentPrefs = currentUser?.notification_preferences || {}
      const mergedPrefs = { ...currentPrefs, ...preferences }

      const { error } = await supabase
        .from('users')
        .update({
          notification_preferences: mergedPrefs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating notification preferences:', error)
        throw error
      }
    } catch (error) {
      console.error('Exception updating notification preferences:', error)
      throw error
    }
  }

  const getNotificationPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error getting notification preferences:', error)
        return null
      }

      // Return merged preferences with defaults
      const savedPrefs = data?.notification_preferences || {}
      return {
        pushEnabled: savedPrefs.pushEnabled ?? true,
        bookingReminders: savedPrefs.bookingReminders ?? true,
        messageNotifications: savedPrefs.messageNotifications ?? true,
        matchNotifications: savedPrefs.matchNotifications ?? true,
        bookingConfirmations: savedPrefs.bookingConfirmations ?? true,
        bookingRequests: savedPrefs.bookingRequests ?? true,
        marketingEmails: savedPrefs.marketingEmails ?? false,
      }
    } catch (error) {
      console.error('Exception getting notification preferences:', error)
      return null
    }
  }

  return {
    updateNotificationPreferences,
    getNotificationPreferences,
  }
}

/**
 * Hook to manage notification badge count
 */
export function useNotificationBadge() {
  const updateBadgeCount = async () => {
    const Notifications = await getNotificationsModule()
    if (!Notifications) return // Not available in Expo Go
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get unread notification count from database
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) {
        if (__DEV__) {
          console.error('Error getting unread count:', error)
        }
        return
      }

      const unreadCount = data?.length || 0
      await Notifications.setBadgeCountAsync(unreadCount)
    } catch (error) {
      if (__DEV__) {
        console.error('Error updating badge count:', error)
      }
    }
  }

  const clearBadge = async () => {
    const Notifications = await getNotificationsModule()
    if (!Notifications) return // Not available in Expo Go
    
    try {
      await Notifications.setBadgeCountAsync(0)
    } catch (error) {
      if (__DEV__) {
        console.error('Error clearing badge:', error)
      }
    }
  }

  return {
    updateBadgeCount,
    clearBadge,
  }
}
