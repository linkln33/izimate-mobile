import { createClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

// Get Supabase URL and key from environment variables or app.json extra
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl ||
  'https://placeholder.supabase.co'

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  'placeholder-key'

// Debug logging
console.log('Supabase Config:', {
  hasEnvUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
  hasConfigUrl: !!Constants.expoConfig?.extra?.supabaseUrl,
  url: supabaseUrl?.substring(0, 30) + '...',
  hasEnvKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  hasConfigKey: !!Constants.expoConfig?.extra?.supabaseAnonKey,
})

if (
  (!process.env.EXPO_PUBLIC_SUPABASE_URL && !Constants.expoConfig?.extra?.supabaseUrl) ||
  (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && !Constants.expoConfig?.extra?.supabaseAnonKey)
) {
  console.warn('Missing Supabase environment variables - using placeholder values')
}

// Validate URL format
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  console.error('Invalid Supabase URL format:', supabaseUrl)
}

// Storage adapter that works on both native and web
const storageAdapter = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
      } else {
        // Use SecureStore for native platforms
        return await SecureStore.getItemAsync(key)
      }
    } catch (error) {
      console.warn('Storage getItem error:', error)
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value)
        }
      } else {
        // Use SecureStore for native platforms
        await SecureStore.setItemAsync(key, value)
      }
    } catch (error) {
      console.warn('Storage setItem error:', error)
    }
  },
  removeItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key)
        }
      } else {
        // Use SecureStore for native platforms
        await SecureStore.deleteItemAsync(key)
      }
    } catch (error) {
      console.warn('Storage removeItem error:', error)
    }
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
  },
})

export function useSupabase() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { session, loading, supabase }
}
