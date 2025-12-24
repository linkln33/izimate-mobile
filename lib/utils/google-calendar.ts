/**
 * Google Calendar Integration for Izimate Booking System
 * Handles OAuth authentication, calendar sync, and event management
 */

import { supabase } from '../supabase';

// Google Calendar API Configuration
const GOOGLE_CALENDAR_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '', // Server-side only
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'exp://localhost:19000/--/auth/callback',
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email'
  ]
};

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status: 'confirmed' | 'tentative' | 'cancelled';
  transparency?: 'opaque' | 'transparent'; // opaque = busy, transparent = free
}

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: 'google' | 'apple' | 'samsung' | 'android' | 'outlook' | 'icloud';
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

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  
  public static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  /**
   * Generate Google OAuth URL for calendar access
   */
  getAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_CALENDAR_CONFIG.clientId,
      redirect_uri: GOOGLE_CALENDAR_CONFIG.redirectUri,
      scope: GOOGLE_CALENDAR_CONFIG.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state: userId // Pass user ID for security
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Static method to generate OAuth URL without instance
   */
  static getAuthUrl(userId?: string): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_CALENDAR_CONFIG.clientId,
      redirect_uri: GOOGLE_CALENDAR_CONFIG.redirectUri,
      scope: GOOGLE_CALENDAR_CONFIG.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state: userId || 'test' // Pass user ID for security
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code: string, userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CALENDAR_CONFIG.clientId,
        client_secret: GOOGLE_CALENDAR_CONFIG.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_CALENDAR_CONFIG.redirectUri,
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
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CALENDAR_CONFIG.clientId,
        client_secret: GOOGLE_CALENDAR_CONFIG.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
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
    summary: string;
    primary?: boolean;
    accessRole: string;
  }>> {
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendars: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Get busy times from Google Calendar for a date range
   */
  async getBusyTimes(
    accessToken: string,
    calendarId: string,
    startDate: string,
    endDate: string
  ): Promise<GoogleCalendarEvent[]> {
    const params = new URLSearchParams({
      timeMin: startDate,
      timeMax: endDate,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250'
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Create a booking event in Google Calendar
   */
  async createBookingEvent(
    accessToken: string,
    calendarId: string,
    event: {
      summary: string;
      description?: string;
      start: string; // ISO datetime
      end: string; // ISO datetime
      attendees?: Array<{ email: string; displayName?: string }>;
    }
  ): Promise<string> {
    const eventData = {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.start,
        timeZone: 'Europe/London', // Should be dynamic based on listing timezone
      },
      end: {
        dateTime: event.end,
        timeZone: 'Europe/London',
      },
      attendees: event.attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
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
   * Update booking event in Google Calendar
   */
  async updateBookingEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    updates: Partial<{
      summary: string;
      description: string;
      start: string;
      end: string;
    }>
  ): Promise<void> {
    const eventData: any = {};
    
    if (updates.summary) eventData.summary = updates.summary;
    if (updates.description) eventData.description = updates.description;
    if (updates.start) {
      eventData.start = {
        dateTime: updates.start,
        timeZone: 'Europe/London',
      };
    }
    if (updates.end) {
      eventData.end = {
        dateTime: updates.end,
        timeZone: 'Europe/London',
      };
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
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
   * Delete booking event from Google Calendar
   */
  async deleteBookingEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
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
        provider: 'google',
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
      .eq('is_active', true)
      .order('is_primary', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch calendar connections: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Sync busy times from Google Calendar to database
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
      const tokenExpiry = new Date(connection.token_expires_at);
      let accessToken = connection.access_token;

      if (tokenExpiry <= new Date()) {
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

      // Fetch events from Google Calendar
      const events = await this.getBusyTimes(
        accessToken,
        connection.calendar_id,
        startDate,
        endDate
      );

      // Filter out transparent (free) events and cancelled events
      const busyEvents = events.filter(event => 
        event.status !== 'cancelled' && 
        event.transparency !== 'transparent' &&
        event.start.dateTime && // Only timed events, not all-day
        event.end.dateTime
      );

      // Clear existing busy times for this period
      await supabase
        .from('provider_busy_times')
        .delete()
        .eq('provider_id', userId)
        .eq('listing_id', listingId)
        .eq('source', 'google')
        .gte('start_time', startDate)
        .lte('end_time', endDate);

      // Insert new busy times
      if (busyEvents.length > 0) {
        const busyTimesData = busyEvents.map(event => ({
          provider_id: userId,
          listing_id: listingId,
          external_event_id: event.id,
          title: event.summary || 'Busy',
          start_time: event.start.dateTime,
          end_time: event.end.dateTime,
          is_all_day: false,
          source: 'google',
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
      .eq('source', 'google');
  }
}

export const googleCalendar = GoogleCalendarService.getInstance();