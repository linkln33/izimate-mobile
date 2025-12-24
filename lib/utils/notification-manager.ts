import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { 
  registerForPushNotifications, 
  savePushToken, 
  setupNotificationListeners,
  clearAllNotifications 
} from './push-notifications'
import { supabase } from '../supabase'

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

    // Set up notification listeners
    notificationListener.current = setupNotificationListeners(
      handleNotificationReceived,
      handleNotificationResponse
    )

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

  const handleNotificationReceived = (notification: Notifications.Notification) => {
    console.log('📱 Notification received while app is open:', notification)
    
    // You can customize behavior when notification is received while app is open
    // For example, show an in-app banner or update a badge count
  }

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    console.log('👆 User tapped notification:', response)
    
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
      console.log('App has come to the foreground!')
      // Clear notification badge when app becomes active
      Notifications.setBadgeCountAsync(0)
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
    pushEnabled: boolean
    bookingReminders: boolean
    messageNotifications: boolean
    matchNotifications: boolean
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          notification_preferences: preferences,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.error('Error updating notification preferences:', error)
      }
    } catch (error) {
      console.error('Exception updating notification preferences:', error)
    }
  }

  const getNotificationPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('user_preferences')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error getting notification preferences:', error)
        return null
      }

      return data?.notification_preferences || {
        pushEnabled: true,
        bookingReminders: true,
        messageNotifications: true,
        matchNotifications: true,
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
        console.error('Error getting unread count:', error)
        return
      }

      const unreadCount = data?.length || 0
      await Notifications.setBadgeCountAsync(unreadCount)
    } catch (error) {
      console.error('Error updating badge count:', error)
    }
  }

  const clearBadge = async () => {
    try {
      await Notifications.setBadgeCountAsync(0)
    } catch (error) {
      console.error('Error clearing badge:', error)
    }
  }

  return {
    updateBadgeCount,
    clearBadge,
  }
}
