import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
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
      
      // Configure notification behavior
      NotificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      })
    } catch (error) {
      if (__DEV__) {
        console.warn('⚠️ Could not load expo-notifications:', error)
      }
      return null
    }
  }
  
  return NotificationsModule
}

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
  // Push notifications are not available in Expo Go (SDK 53+)
  if (isExpoGo) {
    if (__DEV__) {
      console.log('ℹ️ Push notifications are not available in Expo Go. Use a development build for full functionality.')
    }
    return null
  }

  const Notifications = await getNotificationsModule()
  if (!Notifications) return null

  let token: string | null = null

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('booking', {
        name: 'Booking Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f25842',
        sound: 'booking.wav', // Custom sound for booking notifications
      })

      await Notifications.setNotificationChannelAsync('reminder', {
        name: 'Booking Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f59e0b',
        sound: 'reminder.wav', // Custom sound for reminders
      })

      await Notifications.setNotificationChannelAsync('message', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
        sound: 'message.wav', // Custom sound for messages
      })

      await Notifications.setNotificationChannelAsync('alarm', {
        name: 'Alarms',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 500, 500],
        lightColor: '#ef4444',
        sound: 'alarm.wav', // Custom sound for alarms
      })
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('⚠️ Could not set up notification channels:', error)
    }
  }

  if (!Device.isDevice) {
    // Running on simulator/emulator - push notifications not available
    if (__DEV__) {
      console.log('ℹ️ Push notifications require a physical device (not available on simulator/emulator)')
    }
    return null
  }

  // Check and request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  
  if (finalStatus !== 'granted') {
    if (__DEV__) {
      console.log('⚠️ Push notification permissions not granted. User needs to enable notifications in device settings.')
    }
    return null
  }
  
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
    if (!projectId) {
      if (__DEV__) {
        console.warn('⚠️ Expo project ID not found. Push notifications may not work. Check app.json/eas.json configuration.')
      }
      return null
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId,
    })).data
    
    if (__DEV__) {
      console.log('✅ Push token obtained successfully:', token?.substring(0, 20) + '...')
    }
  } catch (e) {
    if (__DEV__) {
      console.error('❌ Error getting push token:', e)
      console.warn('This is normal if running on web or simulator. Push notifications require a physical device with proper Expo/EAS configuration.')
    }
    return null
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
  if (isExpoGo) return null // Not available in Expo Go
  
  const Notifications = await getNotificationsModule()
  if (!Notifications) return null
  
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          bookingId,
          type: 'booking_reminder',
        },
        categoryIdentifier: 'reminder',
        sound: 'reminder.wav', // Use custom reminder sound
        // Android-specific: specify channel ID
        ...(Platform.OS === 'android' && {
          channelId: 'reminder',
        }),
      },
      trigger: {
        date: triggerDate,
      },
    })

    return identifier
  } catch (error) {
    if (__DEV__) {
      console.error('Error scheduling reminder:', error)
    }
    return null
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(identifier: string): Promise<void> {
  if (isExpoGo) return // Not available in Expo Go
  
  const Notifications = await getNotificationsModule()
  if (!Notifications) return
  
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier)
  } catch (error) {
    if (__DEV__) {
      console.error('Error cancelling notification:', error)
    }
  }
}

/**
 * Send immediate local notification for booking updates
 */
export async function showBookingNotification(data: BookingNotificationData): Promise<void> {
  if (isExpoGo) return // Not available in Expo Go
  
  const Notifications = await getNotificationsModule()
  if (!Notifications) return
  
  // Determine sound and channel based on notification type
  let soundFile = 'notification.wav'
  let channelId = 'booking'
  
  if (data.type.includes('reminder') || data.type.includes('alarm')) {
    soundFile = data.type.includes('alarm') ? 'alarm.wav' : 'reminder.wav'
    channelId = data.type.includes('alarm') ? 'alarm' : 'reminder'
  } else if (data.type.includes('message') || data.type.includes('chat')) {
    soundFile = 'message.wav'
    channelId = 'message'
  } else if (data.type.includes('urgent')) {
    soundFile = 'alarm.wav'
    channelId = 'alarm'
  } else {
    soundFile = 'booking.wav'
    channelId = 'booking'
  }

  try {
    await Notifications.presentNotificationAsync({
      title: data.title,
      body: data.body,
      data: {
        bookingId: data.bookingId,
        type: data.type,
        ...data.data,
      },
      categoryIdentifier: channelId,
      sound: soundFile, // Use custom sound
      // Android-specific: specify channel ID
      ...(Platform.OS === 'android' && {
        channelId: channelId,
      }),
    })
  } catch (error) {
    if (__DEV__) {
      console.error('Error showing notification:', error)
    }
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<any[]> {
  if (isExpoGo) return [] // Not available in Expo Go
  
  const Notifications = await getNotificationsModule()
  if (!Notifications) return []
  
  try {
    return await Notifications.getAllScheduledNotificationsAsync()
  } catch (error) {
    if (__DEV__) {
      console.error('Error getting scheduled notifications:', error)
    }
    return []
  }
}

/**
 * Clear all notifications from notification center
 */
export async function clearAllNotifications(): Promise<void> {
  if (isExpoGo) return // Not available in Expo Go
  
  const Notifications = await getNotificationsModule()
  if (!Notifications) return
  
  try {
    await Notifications.dismissAllNotificationsAsync()
  } catch (error) {
    if (__DEV__) {
      console.error('Error clearing notifications:', error)
    }
  }
}

/**
 * Set up notification listeners
 */
export async function setupNotificationListeners(
  onNotificationReceived?: (notification: any) => void,
  onNotificationResponse?: (response: any) => void
): Promise<() => void> {
  // Notifications not available in Expo Go
  if (isExpoGo) {
    if (__DEV__) {
      console.log('ℹ️ Notification listeners not available in Expo Go')
    }
    return () => {} // Return no-op cleanup function
  }

  const Notifications = await getNotificationsModule()
  if (!Notifications) {
    return () => {} // Return no-op cleanup function
  }

  try {
    // Listener for notifications received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      if (__DEV__) {
        console.log('Notification received:', notification)
      }
      onNotificationReceived?.(notification)
    })

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      if (__DEV__) {
        console.log('Notification response:', response)
      }
      onNotificationResponse?.(response)
    })

    return () => {
      notificationListener.remove()
      responseListener.remove()
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('⚠️ Could not set up notification listeners:', error)
    }
    return () => {} // Return no-op cleanup function
  }
}
