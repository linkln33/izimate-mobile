/**
 * Native Calendar Integration for iOS and Android
 * Handles Apple Calendar (iOS) and Samsung/Android Calendar access
 */

import { supabase } from '../supabase';
import { Platform } from 'react-native';

// Conditionally import expo-calendar
let Calendar: any = null;
try {
  Calendar = require('expo-calendar');
} catch (error) {
  console.warn('expo-calendar not available:', error);
}

export interface NativeCalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  location?: string;
  allDay?: boolean;
  availability?: 'busy' | 'free' | 'tentative' | 'unavailable';
}

export interface NativeCalendar {
  id: string;
  title: string;
  source: {
    name: string;
    type: string;
  };
  color: string;
  allowsModifications: boolean;
  type: string;
  isPrimary?: boolean;
}

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: 'google' | 'apple' | 'samsung' | 'android';
  calendar_id: string;
  calendar_name: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  is_primary: boolean;
  sync_enabled: boolean;
  last_sync_at?: string;
  is_active: boolean;
}

export class NativeCalendarService {
  private static instance: NativeCalendarService;

  static getInstance(): NativeCalendarService {
    if (!NativeCalendarService.instance) {
      NativeCalendarService.instance = new NativeCalendarService();
    }
    return NativeCalendarService.instance;
  }

  /**
   * Request calendar permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (!Calendar) {
      throw new Error('expo-calendar package is not installed. Please install it and rebuild the app.');
    }
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request calendar permissions:', error);
      return false;
    }
  }

  /**
   * Check if calendar permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    if (!Calendar) {
      return false;
    }
    try {
      const { status } = await Calendar.getCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to check calendar permissions:', error);
      return false;
    }
  }

  /**
   * Get all available calendars on the device
   */
  async getCalendars(): Promise<NativeCalendar[]> {
    if (!Calendar) {
      throw new Error('expo-calendar package is not installed. Please install it and rebuild the app.');
    }
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Calendar permissions not granted');
        }
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      
      return calendars.map(cal => ({
        id: cal.id,
        title: cal.title,
        source: {
          name: cal.source.name,
          type: cal.source.type,
        },
        color: cal.color,
        allowsModifications: cal.allowsModifications,
        type: cal.type,
        isPrimary: cal.isPrimary,
      }));
    } catch (error) {
      console.error('Failed to get calendars:', error);
      throw error;
    }
  }

  /**
   * Get events from a specific calendar within a date range
   */
  async getEvents(
    calendarId: string,
    startDate: Date,
    endDate: Date
  ): Promise<NativeCalendarEvent[]> {
    if (!Calendar) {
      throw new Error('expo-calendar package is not installed. Please install it and rebuild the app.');
    }
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        throw new Error('Calendar permissions not granted');
      }

      const events = await Calendar.getEventsAsync(
        [calendarId],
        startDate,
        endDate
      );

      return events.map(event => ({
        id: event.id,
        title: event.title || 'Untitled Event',
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        notes: event.notes,
        location: event.location,
        allDay: event.allDay,
        availability: this.mapAvailability(event.availability),
      }));
    } catch (error) {
      console.error('Failed to get events:', error);
      throw error;
    }
  }

  /**
   * Create an event in a calendar
   */
  async createEvent(
    calendarId: string,
    event: {
      title: string;
      startDate: Date;
      endDate: Date;
      notes?: string;
      location?: string;
      allDay?: boolean;
      availability?: 'busy' | 'free' | 'tentative' | 'unavailable';
    }
  ): Promise<string> {
    if (!Calendar) {
      throw new Error('expo-calendar package is not installed. Please install it and rebuild the app.');
    }
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        throw new Error('Calendar permissions not granted');
      }

      // Map availability to expo-calendar format
      let calendarAvailability = Calendar.Availability.BUSY;
      if (event.availability) {
        switch (event.availability) {
          case 'free':
            calendarAvailability = Calendar.Availability.FREE;
            break;
          case 'tentative':
            calendarAvailability = Calendar.Availability.TENTATIVE;
            break;
          case 'unavailable':
            calendarAvailability = Calendar.Availability.UNAVAILABLE;
            break;
          case 'busy':
          default:
            calendarAvailability = Calendar.Availability.BUSY;
            break;
        }
      }

      const eventId = await Calendar.createEventAsync(calendarId, {
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        notes: event.notes,
        location: event.location,
        allDay: event.allDay,
        availability: calendarAvailability,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      return eventId;
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }

  /**
   * Update an event in a calendar
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    updates: {
      title?: string;
      startDate?: Date;
      endDate?: Date;
      notes?: string;
      location?: string;
      allDay?: boolean;
    }
  ): Promise<void> {
    if (!Calendar) {
      throw new Error('expo-calendar package is not installed. Please install it and rebuild the app.');
    }
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        throw new Error('Calendar permissions not granted');
      }

      await Calendar.updateEventAsync(eventId, {
        ...updates,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }

  /**
   * Delete an event from a calendar
   */
  async deleteEvent(eventId: string): Promise<void> {
    if (!Calendar) {
      throw new Error('expo-calendar package is not installed. Please install it and rebuild the app.');
    }
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        throw new Error('Calendar permissions not granted');
      }

      await Calendar.deleteEventAsync(eventId);
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }

  /**
   * Get busy times from a calendar (events that mark user as busy)
   */
  async getBusyTimes(
    calendarId: string,
    startDate: Date,
    endDate: Date
  ): Promise<NativeCalendarEvent[]> {
    try {
      const events = await this.getEvents(calendarId, startDate, endDate);
      
      // Filter out events that are marked as "free" or "transparent"
      return events.filter(event => 
        event.availability !== 'free' && 
        !event.allDay // Exclude all-day events from busy time calculation
      );
    } catch (error) {
      console.error('Failed to get busy times:', error);
      throw error;
    }
  }

  /**
   * Save calendar connection to database
   */
  async saveCalendarConnection(
    userId: string,
    calendar: NativeCalendar,
    provider: 'apple' | 'samsung' | 'android'
  ): Promise<CalendarConnection> {
    try {
      const { data, error } = await supabase
        .from('calendar_connections')
        .insert({
          user_id: userId,
          provider: provider,
          calendar_id: calendar.id,
          calendar_name: calendar.title,
          is_primary: calendar.isPrimary || false,
          sync_enabled: true,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CalendarConnection;
    } catch (error) {
      console.error('Failed to save calendar connection:', error);
      throw error;
    }
  }

  /**
   * Get calendar connections for a user
   */
  async getCalendarConnections(userId: string): Promise<CalendarConnection[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', userId)
        .in('provider', ['apple', 'samsung', 'android'])
        .eq('is_active', true);

      if (error) throw error;
      return (data || []) as CalendarConnection[];
    } catch (error) {
      console.error('Failed to get calendar connections:', error);
      throw error;
    }
  }

  /**
   * Disconnect a calendar
   */
  async disconnectCalendar(userId: string, connectionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_connections')
        .update({ is_active: false, sync_enabled: false })
        .eq('id', connectionId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
      throw error;
    }
  }

  /**
   * Sync busy times from native calendar to database
   */
  async syncBusyTimes(
    userId: string,
    listingId: string,
    connection: CalendarConnection,
    startDate: string,
    endDate: string
  ): Promise<void> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const busyEvents = await this.getBusyTimes(connection.calendar_id, start, end);

      // Clear existing busy times for this period
      await supabase
        .from('provider_busy_times')
        .delete()
        .eq('provider_id', userId)
        .eq('listing_id', listingId)
        .eq('source', connection.provider)
        .gte('start_time', startDate)
        .lte('end_time', endDate);

      // Insert new busy times
      if (busyEvents.length > 0) {
        const busyTimes = busyEvents.map(event => ({
          provider_id: userId,
          listing_id: listingId,
          start_time: event.startDate.toISOString(),
          end_time: event.endDate.toISOString(),
          source: connection.provider,
          event_id: event.id,
          event_title: event.title,
        }));

        const { error } = await supabase
          .from('provider_busy_times')
          .insert(busyTimes);

        if (error) throw error;
      }

      // Update last sync time
      await supabase
        .from('calendar_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', connection.id);
    } catch (error) {
      console.error('Failed to sync busy times:', error);
      throw error;
    }
  }

  /**
   * Map calendar availability to our format
   */
  private mapAvailability(availability?: string): 'busy' | 'free' | 'tentative' | 'unavailable' {
    if (!Calendar) {
      return 'busy'; // Default if Calendar not available
    }
    switch (availability) {
      case Calendar.Availability.BUSY:
        return 'busy';
      case Calendar.Availability.FREE:
        return 'free';
      case Calendar.Availability.TENTATIVE:
        return 'tentative';
      case Calendar.Availability.UNAVAILABLE:
        return 'unavailable';
      default:
        return 'busy'; // Default to busy if not specified
    }
  }

  /**
   * Get the appropriate provider name based on platform
   */
  getProviderName(): 'apple' | 'samsung' | 'android' {
    if (Platform.OS === 'ios') {
      return 'apple';
    } else if (Platform.OS === 'android') {
      // Try to detect Samsung devices
      // Note: This is a simple check, you might want to use a library like react-native-device-info
      return 'samsung';
    }
    return 'android';
  }
}
