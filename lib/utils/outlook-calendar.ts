/**
 * Outlook Calendar Integration for Izimate Booking System
 * Handles OAuth authentication, calendar sync, and event management
 */

import { supabase } from '../supabase';
import type { CalendarConnection } from './google-calendar';

// Outlook Calendar API Configuration
const OUTLOOK_CALENDAR_CONFIG = {
  clientId: process.env.EXPO_PUBLIC_OUTLOOK_CLIENT_ID || '',
  clientSecret: process.env.EXPO_PUBLIC_OUTLOOK_CLIENT_SECRET || '', // Server-side only
  redirectUri: process.env.EXPO_PUBLIC_OUTLOOK_REDIRECT_URI || 'exp://localhost:19000/--/auth/callback',
  scopes: [
    'https://graph.microsoft.com/Calendars.Read',
    'https://graph.microsoft.com/Calendars.ReadWrite',
    'https://graph.microsoft.com/User.Read'
  ]
};

export interface OutlookCalendarEvent {
  id: string;
  subject: string;
  body?: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  isAllDay: boolean;
  showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  isCancelled: boolean;
}

export class OutlookCalendarService {
  private static instance: OutlookCalendarService;
  
  public static getInstance(): OutlookCalendarService {
    if (!OutlookCalendarService.instance) {
      OutlookCalendarService.instance = new OutlookCalendarService();
    }
    return OutlookCalendarService.instance;
  }

  /**
   * Generate Outlook OAuth URL for calendar access
   */
  getAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id: OUTLOOK_CALENDAR_CONFIG.clientId,
      redirect_uri: OUTLOOK_CALENDAR_CONFIG.redirectUri,
      scope: OUTLOOK_CALENDAR_CONFIG.scopes.join(' '),
      response_type: 'code',
      response_mode: 'query',
      state: userId
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code: string, userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: OUTLOOK_CALENDAR_CONFIG.clientId,
        client_secret: OUTLOOK_CALENDAR_CONFIG.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: OUTLOOK_CALENDAR_CONFIG.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: OUTLOOK_CALENDAR_CONFIG.clientId,
        client_secret: OUTLOOK_CALENDAR_CONFIG.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        redirect_uri: OUTLOOK_CALENDAR_CONFIG.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's calendar list
   */
  async getCalendarList(accessToken: string): Promise<Array<{
    id: string;
    name: string;
    canEdit: boolean;
    isDefaultCalendar?: boolean;
  }>> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendars: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  }

  /**
   * Get busy times from Outlook Calendar for a date range
   */
  async getBusyTimes(
    accessToken: string,
    calendarId: string,
    startDate: string,
    endDate: string
  ): Promise<OutlookCalendarEvent[]> {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/calendarView?startDateTime=${encodeURIComponent(startDate)}&endDateTime=${encodeURIComponent(endDate)}&$orderby=start/dateTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'outlook.timezone="UTC"',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  }

  /**
   * Create a booking event in Outlook Calendar
   */
  async createBookingEvent(
    accessToken: string,
    calendarId: string,
    event: {
      subject: string;
      body?: string;
      start: string; // ISO datetime
      end: string; // ISO datetime
      attendees?: Array<{ emailAddress: { address: string; name?: string } }>;
    }
  ): Promise<string> {
    const eventData = {
      subject: event.subject,
      body: {
        contentType: 'HTML',
        content: event.body || '',
      },
      start: {
        dateTime: event.start,
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.end,
        timeZone: 'UTC',
      },
      attendees: event.attendees,
      isReminderOn: true,
      reminderMinutesBeforeStart: 30,
    };

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create event: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Update booking event in Outlook Calendar
   */
  async updateBookingEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    updates: Partial<{
      subject: string;
      body: string;
      start: string;
      end: string;
    }>
  ): Promise<void> {
    const eventData: any = {};
    
    if (updates.subject) eventData.subject = updates.subject;
    if (updates.body) {
      eventData.body = {
        contentType: 'HTML',
        content: updates.body,
      };
    }
    if (updates.start) {
      eventData.start = {
        dateTime: updates.start,
        timeZone: 'UTC',
      };
    }
    if (updates.end) {
      eventData.end = {
        dateTime: updates.end,
        timeZone: 'UTC',
      };
    }

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update event: ${response.statusText}`);
    }
  }

  /**
   * Delete booking event from Outlook Calendar
   */
  async deleteBookingEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete event: ${response.statusText}`);
    }
  }

  /**
   * Store calendar connection in database
   */
  async saveCalendarConnection(
    userId: string,
    calendarData: {
      calendar_id: string;
      calendar_name: string;
      access_token: string;
      refresh_token: string;
      expires_in: number;
      is_primary?: boolean;
    }
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + calendarData.expires_in * 1000);

    const { error } = await supabase
      .from('calendar_connections')
      .upsert({
        user_id: userId,
        provider: 'outlook',
        calendar_id: calendarData.calendar_id,
        calendar_name: calendarData.calendar_name,
        access_token: calendarData.access_token,
        refresh_token: calendarData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        is_primary: calendarData.is_primary || false,
        is_active: true,
        connection_status: 'active',
      }, {
        onConflict: 'user_id,provider,calendar_id'
      });

    if (error) {
      throw new Error(`Failed to save calendar connection: ${error.message}`);
    }
  }

  /**
   * Get active calendar connections for user
   */
  async getCalendarConnections(userId: string): Promise<CalendarConnection[]> {
    const { data, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'outlook')
      .eq('is_active', true)
      .order('is_primary', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch calendar connections: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Sync busy times from Outlook Calendar to database
   */
  async syncBusyTimes(
    userId: string,
    listingId: string,
    connection: CalendarConnection,
    startDate: string,
    endDate: string
  ): Promise<void> {
    try {
      // Check if token needs refresh
      const tokenExpiry = new Date(connection.token_expires_at || 0);
      let accessToken = connection.access_token;

      if (tokenExpiry <= new Date() && connection.refresh_token) {
        const refreshed = await this.refreshAccessToken(connection.refresh_token);
        accessToken = refreshed.access_token;

        // Update token in database
        await supabase
          .from('calendar_connections')
          .update({
            access_token: refreshed.access_token,
            token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          })
          .eq('id', connection.id);
      }

      // Fetch events from Outlook Calendar
      const events = await this.getBusyTimes(
        accessToken!,
        connection.calendar_id,
        startDate,
        endDate
      );

      // Filter out free events and cancelled events
      const busyEvents = events.filter(event => 
        !event.isCancelled && 
        event.showAs !== 'free' &&
        !event.isAllDay
      );

      // Clear existing busy times for this period
      await supabase
        .from('provider_busy_times')
        .delete()
        .eq('provider_id', userId)
        .eq('listing_id', listingId)
        .eq('source', 'outlook')
        .gte('start_time', startDate)
        .lte('end_time', endDate);

      // Insert new busy times
      if (busyEvents.length > 0) {
        const busyTimesData = busyEvents.map(event => ({
          provider_id: userId,
          listing_id: listingId,
          external_event_id: event.id,
          title: event.subject || 'Busy',
          start_time: event.start.dateTime,
          end_time: event.end.dateTime,
          is_all_day: false,
          source: 'outlook',
          calendar_id: connection.calendar_id,
          is_active: true,
        }));

        const { error } = await supabase
          .from('provider_busy_times')
          .insert(busyTimesData);

        if (error) {
          throw new Error(`Failed to insert busy times: ${error.message}`);
        }
      }

      // Update last sync time
      await supabase
        .from('calendar_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', connection.id);

    } catch (error) {
      console.error('Calendar sync failed:', error);
      
      // Update connection status to error
      await supabase
        .from('calendar_connections')
        .update({
          connection_status: 'error',
          last_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', connection.id);
      
      throw error;
    }
  }

  /**
   * Disconnect calendar
   */
  async disconnectCalendar(userId: string, connectionId: string): Promise<void> {
    const { error } = await supabase
      .from('calendar_connections')
      .update({ 
        is_active: false,
        connection_status: 'disconnected'
      })
      .eq('id', connectionId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to disconnect calendar: ${error.message}`);
    }

    // Also deactivate related busy times
    await supabase
      .from('provider_busy_times')
      .update({ is_active: false })
      .eq('provider_id', userId)
      .eq('source', 'outlook');
  }
}

export const outlookCalendar = OutlookCalendarService.getInstance();

