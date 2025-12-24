import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useNotificationManager } from '@/lib/utils/notification-manager'

export default function RootLayout() {
  // Initialize notification management
  useNotificationManager()

  return (
    <>
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
    </>
  )
}
