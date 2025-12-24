import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from '../supabase'

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export interface BookingNotificationData {
  bookingId: string
  type: 'booking_confirmed' | 'booking_reminder' | 'booking_cancelled' | 'booking_completed' | 'booking_request'
  title: string
  body: string
  data?: Record<string, any>
}

/**
 * Register for push notifications and get the token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  let token: string | null = null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('booking', {
      name: 'Booking Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f25842',
      sound: 'default',
    })

    await Notifications.setNotificationChannelAsync('reminder', {
      name: 'Booking Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f59e0b',
      sound: 'default',
    })
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!')
      return null
    }
    
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
      if (!projectId) {
        throw new Error('Project ID not found')
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data
      
      console.log('Push token:', token)
    } catch (e) {
      console.error('Error getting push token:', e)
      return null
    }
  } else {
    console.log('Must use physical device for Push Notifications')
  }

  return token
}

/**
 * Save push token to user profile
 */
export async function savePushToken(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('users')
      .update({ push_token: token })
      .eq('id', user.id)

    if (error) {
      console.error('Error saving push token:', error)
    }
  } catch (error) {
    console.error('Exception saving push token:', error)
  }
}

/**
 * Schedule a local notification for booking reminder
 */
export async function scheduleBookingReminder(
  bookingId: string,
  title: string,
  body: string,
  triggerDate: Date
): Promise<string | null> {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          bookingId,
          type: 'booking_reminder',
        },
        categoryIdentifier: 'booking',
        sound: 'default',
      },
      trigger: {
        date: triggerDate,
      },
    })

    return identifier
  } catch (error) {
    console.error('Error scheduling reminder:', error)
    return null
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier)
  } catch (error) {
    console.error('Error cancelling notification:', error)
  }
}

/**
 * Send immediate local notification for booking updates
 */
export async function showBookingNotification(data: BookingNotificationData): Promise<void> {
  try {
    await Notifications.presentNotificationAsync({
      title: data.title,
      body: data.body,
      data: {
        bookingId: data.bookingId,
        type: data.type,
        ...data.data,
      },
      categoryIdentifier: data.type.includes('reminder') ? 'reminder' : 'booking',
      sound: 'default',
    })
  } catch (error) {
    console.error('Error showing notification:', error)
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync()
  } catch (error) {
    console.error('Error getting scheduled notifications:', error)
    return []
  }
}

/**
 * Clear all notifications from notification center
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync()
  } catch (error) {
    console.error('Error clearing notifications:', error)
  }
}

/**
 * Set up notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  // Listener for notifications received while app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification)
    onNotificationReceived?.(notification)
  })

  // Listener for when user taps on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response)
    onNotificationResponse?.(response)
  })

  return () => {
    notificationListener.remove()
    responseListener.remove()
  }
}
