/**
 * Calendar Integration Component
 * Handles multiple calendar provider connections (Google, Apple, Samsung, etc.)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthRequest, AuthRequestConfig, AuthSessionResult, makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { GoogleCalendarService, CalendarConnection } from '@/lib/utils/google-calendar';
import { supabase } from '@/lib/supabase';
import { CalendarView } from './CalendarView';

// Conditionally import native calendar service
let NativeCalendarService: any = null;
try {
  const nativeCalendarModule = require('@/lib/utils/native-calendar');
  NativeCalendarService = nativeCalendarModule.NativeCalendarService;
} catch (error) {
  console.warn('Native calendar service not available:', error);
}

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession();

interface CalendarIntegrationProps {
  userId: string;
  listingId?: string;
  onConnectionChange?: (connected: boolean) => void;
  onBookDate?: (date: Date) => void;
}

interface CalendarProvider {
  id: 'izimate' | 'google' | 'outlook' | 'icloud' | 'apple' | 'samsung' | 'android';
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  available: boolean;
  description: string;
}

export const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({
  userId,
  listingId,
  onConnectionChange,
  onBookDate,
}) => {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [authRequest, setAuthRequest] = useState<AuthRequest | null>(null);
  const [availableCalendars, setAvailableCalendars] = useState<any[]>([]);

  const googleService = GoogleCalendarService.getInstance();
  const nativeService = NativeCalendarService ? NativeCalendarService.getInstance() : null;

  const providers: CalendarProvider[] = [
    {
      id: 'google',
      name: 'Google Calendar',
      icon: 'logo-google',
      color: '#4285F4',
      available: true,
      description: 'Sync with your Google Calendar'
    },
    {
      id: 'outlook',
      name: 'Outlook Calendar',
      icon: 'mail',
      color: '#0078D4',
      available: true,
      description: 'Sync with your Outlook/Microsoft Calendar'
    },
    {
      id: 'icloud',
      name: 'iCloud Calendar',
      icon: 'cloud',
      color: '#007AFF',
      available: Platform.OS === 'ios', // Only available on iOS
      description: 'Sync with your iCloud Calendar'
    },
  ].filter(provider => provider.available); // Only show available providers

  useEffect(() => {
    initializeAuth();
    loadConnections();
  }, []);

  const initializeAuth = async () => {
    try {
      const config: AuthRequestConfig = {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        scopes: [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/userinfo.email'
        ],
        additionalParameters: {
          access_type: 'offline',
          prompt: 'consent',
        },
        redirectUri: makeRedirectUri({
          scheme: 'izimate',
          path: '/auth/callback'
        }),
      };

      const request = new AuthRequest(config);
      setAuthRequest(request);
    } catch (error) {
      console.error('Auth initialization failed:', error);
    }
  };

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      
      // Load Google Calendar connections
      const googleConnections = await googleService.getCalendarConnections(userId);
      
      // Load native calendar connections
      const nativeConnections = nativeService ? await nativeService.getCalendarConnections(userId) : [];
      
      // Combine all connections
      const allConnections = [...googleConnections, ...nativeConnections];
      setConnections(allConnections);
      onConnectionChange?.(allConnections.length > 0);
    } catch (error) {
      console.error('Failed to load calendar connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!authRequest) {
      Alert.alert('Error', 'Authentication not initialized. Please try again.');
      return;
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      Alert.alert(
        'Configuration Error', 
        'Google OAuth credentials not configured. Please contact support.'
      );
      return;
    }

    setIsConnecting('google');

    try {
      const result: AuthSessionResult = await authRequest.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });

      if (result.type === 'success') {
        const { code } = result.params;
        
        if (code) {
          const tokens = await googleService.exchangeCodeForTokens(code, userId);
          const calendars = await googleService.getCalendarList(tokens.access_token);
          
          if (calendars.length === 0) {
            throw new Error('No calendars found in your Google account');
          }

          const primaryCalendar = calendars.find(cal => cal.primary) || calendars[0];
          
          await googleService.saveCalendarConnection(userId, {
            calendar_id: primaryCalendar.id,
            calendar_name: primaryCalendar.summary,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in,
            is_primary: primaryCalendar.primary || false,
          });

          Alert.alert(
            'Calendar Connected!', 
            `Successfully connected to: ${primaryCalendar.summary}\n\nYour availability will now sync automatically.`
          );
          
          await loadConnections();
        }
      } else if (result.type === 'error') {
        throw new Error(result.error?.description || 'OAuth authorization failed');
      }
    } catch (error) {
      console.error('Calendar connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect calendar';
      Alert.alert('Connection Failed', errorMessage);
    } finally {
      setIsConnecting(null);
    }
  };

  const handleConnectNative = async () => {
    if (!nativeService) {
      Alert.alert(
        'Not Available',
        'Native calendar integration requires the expo-calendar package. Please install it and rebuild the app.'
      );
      return;
    }

    setIsConnecting(Platform.OS === 'ios' ? 'apple' : Platform.OS === 'android' ? 'android' : 'samsung');

    try {
      // Request permissions
      const hasPermission = await nativeService.hasPermissions();
      if (!hasPermission) {
        const granted = await nativeService.requestPermissions();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Calendar access is required to sync your availability. Please enable it in Settings.'
          );
          setIsConnecting(null);
          return;
        }
      }

      // Get available calendars
      const calendars = await nativeService.getCalendars();
      
      if (calendars.length === 0) {
        Alert.alert('No Calendars', 'No calendars found on your device.');
        setIsConnecting(null);
        return;
      }

      setAvailableCalendars(calendars);
      
      // Show calendar selection
      const calendarOptions = calendars.map(cal => cal.title);
      calendarOptions.push('Cancel');

      Alert.alert(
        'Select Calendar',
        'Choose which calendar to sync:',
        [
          ...calendars.map((cal, index) => ({
            text: cal.title,
            onPress: async () => {
              try {
                const provider = Platform.OS === 'ios' ? 'apple' : Platform.OS === 'android' ? 'android' : 'samsung';
                await nativeService.saveCalendarConnection(userId, cal, provider);
                
                // Mark this connection as primary for bookings if it's the first native calendar
                const { data: existingConnections } = await supabase
                  .from('calendar_connections')
                  .select('id')
                  .eq('user_id', userId)
                  .in('provider', ['apple', 'android', 'samsung']);
                
                if (!existingConnections || existingConnections.length === 0) {
                  // First native calendar connection - mark as primary
                  await supabase
                    .from('calendar_connections')
                    .update({ is_primary: true, sync_enabled: true })
                    .eq('user_id', userId)
                    .eq('provider', provider)
                    .eq('calendar_id', cal.id);
                }
                
                Alert.alert(
                  'Calendar Connected! 📅',
                  `Successfully connected to: ${cal.title}\n\nYour availability will now sync automatically and all bookings will be added to this calendar.`
                );
                
                await loadConnections();
              } catch (error) {
                console.error('Failed to save calendar connection:', error);
                Alert.alert('Error', 'Failed to connect calendar. Please try again.');
              } finally {
                setIsConnecting(null);
                setAvailableCalendars([]);
              }
            }
          })),
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setIsConnecting(null);
              setAvailableCalendars([]);
            }
          }
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Native calendar connection failed:', error);
      Alert.alert('Connection Failed', 'Failed to connect to device calendar. Please try again.');
      setIsConnecting(null);
    }
  };

  const handleConnectCalendar = (providerId: string) => {
    if (providerId === 'google') {
      handleConnectGoogle();
    } else if (providerId === 'outlook') {
      // TODO: Implement Outlook calendar integration
      Alert.alert(
        'Coming Soon',
        'Outlook Calendar integration is coming soon. For now, you can use Google Calendar or your device calendar.',
        [{ text: 'OK' }]
      );
    } else if (providerId === 'icloud') {
      // iCloud uses the same native calendar service on iOS
      if (Platform.OS === 'ios') {
        handleConnectNative();
      } else {
        Alert.alert(
          'Not Available',
          'iCloud Calendar is only available on iOS devices.',
          [{ text: 'OK' }]
        );
      }
    } else if (providerId === 'apple' || providerId === 'samsung' || providerId === 'android') {
      handleConnectNative();
    }
  };


  const handleDisconnectCalendar = async (connectionId: string, calendarName: string, provider: string) => {
    Alert.alert(
      'Disconnect Calendar',
      `Are you sure you want to disconnect "${calendarName}"?\n\nThis will stop syncing your availability.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              if (provider === 'google') {
                await googleService.disconnectCalendar(userId, connectionId);
              } else if (nativeService) {
                await nativeService.disconnectCalendar(userId, connectionId);
              }
              Alert.alert('Disconnected', 'Calendar has been disconnected successfully.');
              await loadConnections();
            } catch (error) {
              console.error('Disconnect failed:', error);
              Alert.alert('Error', 'Failed to disconnect calendar. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getProviderIcon = (provider: string): keyof typeof Ionicons.glyphMap => {
    switch (provider) {
      case 'izimate':
        return 'calendar';
      case 'google':
        return 'logo-google';
      case 'outlook':
        return 'mail';
      case 'icloud':
        return 'cloud';
      case 'apple':
        return 'logo-apple';
      case 'samsung':
      case 'android':
        return 'phone-portrait';
      default:
        return 'calendar';
    }
  };

  const getProviderColor = (provider: string): string => {
    switch (provider) {
      case 'izimate':
        return '#f25842';
      case 'google':
        return '#4285F4';
      case 'outlook':
        return '#0078D4';
      case 'icloud':
        return '#007AFF';
      case 'apple':
        return '#000000';
      case 'samsung':
        return '#1428A0';
      case 'android':
        return '#3DDC84';
      default:
        return '#007AFF';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading calendar connections...</Text>
      </View>
    );
  }

  const hasConnections = connections.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="calendar" size={24} color="#007AFF" />
        <Text style={styles.title}>Calendar</Text>
      </View>

      {/* Calendar View */}
      <CalendarView 
        userId={userId}
        listingId={listingId}
        onDateSelect={(date) => {
          console.log('Date selected:', date);
        }}
        onEventPress={(event) => {
          console.log('Event pressed:', event);
        }}
        onBookDate={onBookDate}
      />

      {/* External Calendar Integrations */}
      <View style={styles.integrationsSection}>
        <Text style={styles.integrationsTitle}>External Calendar Integrations</Text>
        <Text style={styles.integrationsDescription}>
          Connect your external calendars to sync availability and prevent double bookings.
        </Text>

      {hasConnections ? (
        <View style={styles.connectionsContainer}>
          <Text style={styles.connectionsTitle}>Connected Calendars:</Text>
          {connections.map((connection) => (
            <View key={connection.id} style={styles.connectionItem}>
              <View style={styles.connectionInfo}>
                <Ionicons 
                  name={getProviderIcon(connection.provider)} 
                  size={20} 
                  color={getProviderColor(connection.provider)} 
                />
                <View style={styles.connectionDetails}>
                  <Text style={styles.connectionName}>{connection.calendar_name}</Text>
                  <Text style={styles.connectionStatus}>
                    {connection.provider.charAt(0).toUpperCase() + connection.provider.slice(1)} • 
                    {connection.is_primary ? ' Primary' : ' Secondary'} • 
                    {connection.sync_enabled ? ' Syncing' : ' Sync Disabled'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={() => handleDisconnectCalendar(connection.id, connection.calendar_name, connection.provider)}
              >
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.noConnectionsContainer}>
          <Ionicons name="calendar-outline" size={48} color="#8E8E93" />
          <Text style={styles.noConnectionsText}>No calendars connected</Text>
          <Text style={styles.noConnectionsSubtext}>
            Connect a calendar to enable automatic availability sync
          </Text>
        </View>
      )}

      </View>

      <Text style={styles.providersTitle}>Connect External Calendars:</Text>
      <View style={styles.providersContainer}>
        {providers.map((provider) => {
          const isConnectingThis = isConnecting === provider.id;
          const isConnected = connections.some(c => c.provider === provider.id);
          
          return (
            <TouchableOpacity
              key={provider.id}
              style={[
                styles.providerCard,
                isConnected && styles.providerCardConnected,
                isConnectingThis && styles.providerCardDisabled
              ]}
              onPress={() => handleConnectCalendar(provider.id)}
              disabled={isConnectingThis || isConnected}
            >
              {isConnectingThis ? (
                <ActivityIndicator size="small" color={provider.color} />
              ) : (
                <Ionicons name={provider.icon} size={20} color={provider.color} />
              )}
              <Text style={[
                styles.providerName, 
                isConnected && styles.providerNameConnected
              ]} numberOfLines={1}>
                {provider.name.replace(' Calendar', '')}
              </Text>
              {isConnected && (
                <View style={styles.connectedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.connectedText}>Connected</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {hasConnections && (
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>✅ Benefits of Calendar Sync:</Text>
          <Text style={styles.benefitItem}>• Automatic availability updates</Text>
          <Text style={styles.benefitItem}>• Prevents double bookings</Text>
          <Text style={styles.benefitItem}>• Creates booking events automatically</Text>
          <Text style={styles.benefitItem}>• Keeps all calendars in sync</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: '#8E8E93',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 16,
  },
  connectionsContainer: {
    marginBottom: 16,
  },
  connectionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 8,
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  connectionDetails: {
    marginLeft: 8,
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  connectionStatus: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  disconnectButton: {
    padding: 4,
  },
  noConnectionsContainer: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  noConnectionsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 12,
  },
  noConnectionsSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  providersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  providersContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  providerCard: {
    width: 85,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    marginRight: 6,
    minHeight: 75,
  },
  providerCardPrimary: {
    backgroundColor: '#FEF2F2',
    borderColor: '#f25842',
    borderWidth: 2,
  },
  providerCardConnected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#34C759',
  },
  providerCardDisabled: {
    opacity: 0.6,
  },
  providerName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 14,
  },
  providerNamePrimary: {
    color: '#f25842',
    fontWeight: '700',
  },
  providerNameConnected: {
    color: '#16A34A',
  },
  providerDescription: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
  },
  connectedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16A34A',
    marginLeft: 4,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f25842',
    marginLeft: 4,
  },
  benefitsContainer: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 8,
  },
  benefitItem: {
    fontSize: 13,
    color: '#0C4A6E',
    marginBottom: 4,
  },
  integrationsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  integrationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  integrationsDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
});
