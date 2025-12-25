import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { PaperProvider } from 'react-native-paper'
import { useNotificationManager } from '@/lib/utils/notification-manager'
import { loadLanguage } from '@/lib/i18n/config'
import { paperTheme } from '@/lib/paper-theme'

export default function RootLayout() {
  const [languageLoaded, setLanguageLoaded] = useState(false)
  
  // Initialize notification management
  useNotificationManager()

  // Load language preference on app start
  useEffect(() => {
    const initLanguage = async () => {
      await loadLanguage()
      setLanguageLoaded(true)
    }
    initLanguage()
  }, [])

  // Don't render app until language is loaded
  if (!languageLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#f25842" />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#ffffff' },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="listings/create" options={{ headerShown: false }} />
          <Stack.Screen name="swipe-view" options={{ headerShown: false }} />
          <Stack.Screen name="booking/[listingId]" options={{ headerShown: false }} />
          <Stack.Screen name="bookings/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="settings/notifications" options={{ headerShown: false }} />
          {/* Offer screen is accessed through (tabs)/offer to show tab bar */}
        </Stack>
        <StatusBar style="dark" />
      </PaperProvider>
    </GestureHandlerRootView>
  )
}
