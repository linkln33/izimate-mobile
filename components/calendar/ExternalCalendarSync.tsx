/**
 * ExternalCalendarSync Component
 * Handles Google, Outlook, and iCloud calendar synchronization
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AuthRequest, AuthRequestConfig, AuthSessionResult, makeRedirectUri } from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { GoogleCalendarService } from '@/lib/utils/google-calendar'
import { OutlookCalendarService } from '@/lib/utils/outlook-calendar'
import type { ExternalCalendarSyncProps } from './types'

// Conditionally import native calendar service
let NativeCalendarService: any = null
try {
  const nativeCalendarModule = require('@/lib/utils/native-calendar')
  NativeCalendarService = nativeCalendarModule.NativeCalendarService
} catch (error) {
  console.warn('Native calendar service not available:', error)
}

WebBrowser.maybeCompleteAuthSession()

export const ExternalCalendarSync: React.FC<ExternalCalendarSyncProps> = ({
  userId,
  onSyncComplete,
  showProviders = ['google', 'outlook', 'icloud'],
}) => {
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)
  const [googleAuthRequest, setGoogleAuthRequest] = useState<AuthRequest | null>(null)
  const [outlookAuthRequest, setOutlookAuthRequest] = useState<AuthRequest | null>(null)

  const googleService = GoogleCalendarService.getInstance()
  const outlookService = OutlookCalendarService.getInstance()
  const nativeService = NativeCalendarService ? NativeCalendarService.getInstance() : null

  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development'
      let redirectUri: string

      if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          const port = window.location.port || '8083'
          redirectUri = `http://localhost:${port}/auth/callback`
        } else if (hostname.includes('.com') || hostname.includes('.org') || hostname.includes('.net')) {
          redirectUri = `${window.location.protocol}//${hostname}/auth/callback`
        } else {
          redirectUri = 'https://izimate.com/auth/callback'
        }
      } else if (isDevelopment) {
        redirectUri = 'http://localhost:8083/auth/callback'
      } else {
        redirectUri = 'https://izimate.com/auth/callback'
      }

      // Initialize Google OAuth
      if (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID && showProviders.includes('google')) {
        const googleConfig: AuthRequestConfig = {
          clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
          scopes: [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email',
          ],
          additionalParameters: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectUri: redirectUri,
        }
        const googleRequest = new AuthRequest(googleConfig)
        setGoogleAuthRequest(googleRequest)
      }

      // Initialize Outlook OAuth
      if (process.env.EXPO_PUBLIC_OUTLOOK_CLIENT_ID && showProviders.includes('outlook')) {
        const outlookConfig: AuthRequestConfig = {
          clientId: process.env.EXPO_PUBLIC_OUTLOOK_CLIENT_ID,
          scopes: [
            'https://graph.microsoft.com/Calendars.Read',
            'https://graph.microsoft.com/Calendars.ReadWrite',
            'https://graph.microsoft.com/User.Read',
          ],
          additionalParameters: {
            response_mode: 'query',
          },
          redirectUri: redirectUri,
        }
        const outlookRequest = new AuthRequest(outlookConfig)
        setOutlookAuthRequest(outlookRequest)
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
    }
  }

  const handleSync = async (provider: 'google' | 'outlook' | 'icloud') => {
    if (provider === 'icloud') {
      await handleICloudSync()
    } else if (provider === 'google') {
      await handleGoogleSync()
    } else if (provider === 'outlook') {
      await handleOutlookSync()
    }
  }

  const handleICloudSync = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'iCloud Calendar is only available on iOS devices.')
      return
    }

    if (!nativeService) {
      Alert.alert(
        'Not Available',
        'Native calendar service is not available. Please install expo-calendar and rebuild the app.'
      )
      return
    }

    setConnectingProvider('icloud')
    try {
      const hasPermission = await nativeService.hasPermissions()
      if (!hasPermission) {
        const granted = await nativeService.requestPermissions()
        if (!granted) {
          Alert.alert('Permission Required', 'Calendar access is required. Please enable it in Settings.')
          setConnectingProvider(null)
          return
        }
      }

      const calendars = await nativeService.getCalendars()
      if (calendars.length === 0) {
        Alert.alert('No Calendars', 'No calendars found on your device.')
        setConnectingProvider(null)
        return
      }

      const calendarOptions = calendars.map(cal => cal.title)
      Alert.alert(
        'Select Calendar',
        'Choose which calendar to sync:',
        [
          ...calendars.map(cal => ({
            text: cal.title,
            onPress: async () => {
              try {
                await nativeService.saveCalendarConnection(userId, cal, 'apple')
                Alert.alert('Success', `Connected to ${cal.title}`)
                onSyncComplete?.()
              } catch (error) {
                console.error('Failed to save calendar connection:', error)
                Alert.alert('Error', 'Failed to connect calendar.')
              } finally {
                setConnectingProvider(null)
              }
            },
          })),
          { text: 'Cancel', style: 'cancel', onPress: () => setConnectingProvider(null) },
        ],
        { cancelable: true }
      )
    } catch (error) {
      console.error('iCloud calendar connection failed:', error)
      Alert.alert('Connection Failed', 'Failed to connect to iCloud calendar.')
      setConnectingProvider(null)
    }
  }

  const handleGoogleSync = async () => {
    if (!googleAuthRequest) {
      Alert.alert('Error', 'Google authentication not initialized. Please try again.')
      return
    }

    if (!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID) {
      Alert.alert('Configuration Error', 'Google OAuth credentials not configured.')
      return
    }

    setConnectingProvider('google')
    try {
      const result: AuthSessionResult = await googleAuthRequest.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      })

      if (result.type === 'success') {
        const { code } = result.params
        if (code) {
          const tokens = await googleService.exchangeCodeForTokens(code, userId)
          const calendars = await googleService.getCalendarList(tokens.access_token)

          if (calendars.length === 0) {
            throw new Error('No calendars found in your Google account')
          }

          const primaryCalendar = calendars.find(cal => cal.primary) || calendars[0]
          await googleService.saveCalendarConnection(userId, {
            calendar_id: primaryCalendar.id,
            calendar_name: primaryCalendar.summary,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in,
            is_primary: primaryCalendar.primary || false,
          })

          Alert.alert('Success', `Connected to ${primaryCalendar.summary}`)
          onSyncComplete?.()
        }
      } else if (result.type === 'error') {
        throw new Error(result.error?.description || 'OAuth authorization failed')
      }
    } catch (error) {
      console.error('Google calendar connection failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect calendar'
      Alert.alert('Connection Failed', errorMessage)
    } finally {
      setConnectingProvider(null)
    }
  }

  const handleOutlookSync = async () => {
    if (!outlookAuthRequest) {
      Alert.alert('Error', 'Outlook authentication not initialized. Please try again.')
      return
    }

    if (!process.env.EXPO_PUBLIC_OUTLOOK_CLIENT_ID) {
      Alert.alert('Configuration Error', 'Outlook OAuth credentials not configured.')
      return
    }

    setConnectingProvider('outlook')
    try {
      const result: AuthSessionResult = await outlookAuthRequest.promptAsync({
        authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      })

      if (result.type === 'success') {
        const { code } = result.params
        if (code) {
          const tokens = await outlookService.exchangeCodeForTokens(code, userId)
          const calendars = await outlookService.getCalendarList(tokens.access_token)

          if (calendars.length === 0) {
            throw new Error('No calendars found in your Outlook account')
          }

          const defaultCalendar = calendars.find(cal => cal.isDefaultCalendar) || calendars[0]
          await outlookService.saveCalendarConnection(userId, {
            calendar_id: defaultCalendar.id,
            calendar_name: defaultCalendar.name,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in,
            is_primary: defaultCalendar.isDefaultCalendar || false,
          })

          Alert.alert('Success', `Connected to ${defaultCalendar.name}`)
          onSyncComplete?.()
        }
      } else if (result.type === 'error') {
        throw new Error(result.error?.description || 'OAuth authorization failed')
      }
    } catch (error) {
      console.error('Outlook calendar connection failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect calendar'
      Alert.alert('Connection Failed', errorMessage)
    } finally {
      setConnectingProvider(null)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sync with:</Text>
      <View style={styles.providersRow}>
        {showProviders.includes('google') && (
          <Pressable
            style={[
              styles.providerBox,
              connectingProvider === 'google' && styles.providerBoxDisabled,
            ]}
            onPress={() => handleSync('google')}
            disabled={connectingProvider === 'google'}
          >
            <View style={[styles.providerIcon, { backgroundColor: '#4285F4' }]}>
              {connectingProvider === 'google' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="logo-google" size={20} color="#ffffff" />
              )}
            </View>
            <Text style={styles.providerText}>Google</Text>
          </Pressable>
        )}

        {showProviders.includes('outlook') && (
          <Pressable
            style={[
              styles.providerBox,
              connectingProvider === 'outlook' && styles.providerBoxDisabled,
            ]}
            onPress={() => handleSync('outlook')}
            disabled={connectingProvider === 'outlook'}
          >
            <View style={[styles.providerIcon, { backgroundColor: '#0078D4' }]}>
              {connectingProvider === 'outlook' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="mail" size={20} color="#ffffff" />
              )}
            </View>
            <Text style={styles.providerText}>Outlook</Text>
          </Pressable>
        )}

        {showProviders.includes('icloud') && (
          <Pressable
            style={[
              styles.providerBox,
              connectingProvider === 'icloud' && styles.providerBoxDisabled,
            ]}
            onPress={() => handleSync('icloud')}
            disabled={connectingProvider === 'icloud'}
          >
            <View style={[styles.providerIcon, { backgroundColor: '#007AFF' }]}>
              {connectingProvider === 'icloud' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="logo-apple" size={20} color="#ffffff" />
              )}
            </View>
            <Text style={styles.providerText}>iCloud</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  providersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  providerBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  providerBoxDisabled: {
    opacity: 0.6,
  },
  providerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
})

