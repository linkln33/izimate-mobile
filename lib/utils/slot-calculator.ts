/**
 * Smart Slot Detection Algorithm for Izimate Booking System
 * Calculates available booking slots based on working hours, existing bookings, and external calendar events
 */

import { supabase } from '../supabase';
import { googleCalendar } from './google-calendar';

export interface ServiceOption {
  name: string;
  duration: number; // minutes
  price: number;
  currency: string;
}

export interface WorkingHours {
  [key: string]: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}

export interface BreakTime {
  start: string; // HH:MM format
  end: string; // HH:MM format
  title: string;
}

export interface ServiceSettings {
  id: string;
  listing_id: string;
  booking_enabled: boolean;
  service_type: string;
  default_duration_minutes: number;
  buffer_minutes: number;
  service_options: ServiceOption[];
  advance_booking_days: number;
  same_day_booking: boolean;
  auto_confirm: boolean;
  cancellation_hours: number;
  working_hours: WorkingHours;
  break_times: BreakTime[];
  calendar_connected: boolean;
  timezone: string;
}

export interface TimeSlot {
  start: string; // HH:MM format
  end: string; // HH:MM format
  startDateTime: string; // ISO datetime
  endDateTime: string; // ISO datetime
  duration: number; // minutes
  isAvailable: boolean;
  price?: number;
  currency?: string;
  serviceName?: string;
  conflictReason?: string; // Why slot is unavailable
}

export interface BusyTime {
  start_time: string; // ISO datetime
  end_time: string; // ISO datetime
  title: string;
  source: 'booking' | 'google' | 'manual';
}

export class SlotCalculator {
  private static instance: SlotCalculator;
  
  public static getInstance(): SlotCalculator {
    if (!SlotCalculator.instance) {
      SlotCalculator.instance = new SlotCalculator();
    }
    return SlotCalculator.instance;
  }

  /**
   * Get service settings for a listing
   */
  async getServiceSettings(listingId: string): Promise<ServiceSettings | null> {
    const { data, error } = await supabase
      .from('service_settings')
      .select(`
        *,
        listings!inner(timezone)
      `)
      .eq('listing_id', listingId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      ...data,
      timezone: data.listings?.timezone || 'Europe/London'
    };
  }

  /**
   * Get all busy times for a provider on a specific date
   */
  async getBusyTimes(
    providerId: string,
    listingId: string,
    date: string // YYYY-MM-DD format
  ): Promise<BusyTime[]> {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    // Get existing bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('booking_date, start_time, end_time, service_name, status')
      .eq('provider_id', providerId)
      .eq('booking_date', date)
      .in('status', ['pending', 'confirmed']);

    // Get external calendar busy times
    const { data: externalBusy } = await supabase
      .from('provider_busy_times')
      .select('start_time, end_time, title, source')
      .eq('provider_id', providerId)
      .eq('listing_id', listingId)
      .eq('is_active', true)
      .gte('start_time', startOfDay)
      .lte('end_time', endOfDay);

    const busyTimes: BusyTime[] = [];

    // Add bookings as busy times
    if (bookings) {
      bookings.forEach(booking => {
        busyTimes.push({
          start_time: `${booking.booking_date}T${booking.start_time}`,
          end_time: `${booking.booking_date}T${booking.end_time}`,
          title: booking.service_name || 'Booking',
          source: 'booking'
        });
      });
    }

    // Add external calendar events as busy times
    if (externalBusy) {
      externalBusy.forEach(busy => {
        busyTimes.push({
          start_time: busy.start_time,
          end_time: busy.end_time,
          title: busy.title,
          source: busy.source as 'google' | 'manual'
        });
      });
    }

    return busyTimes;
  }

  /**
   * Check if a time slot conflicts with busy times
   */
  private hasConflict(
    slotStart: Date,
    slotEnd: Date,
    busyTimes: BusyTime[]
  ): { hasConflict: boolean; reason?: string } {
    for (const busy of busyTimes) {
      const busyStart = new Date(busy.start_time);
      const busyEnd = new Date(busy.end_time);

      // Check for overlap
      if (
        (slotStart < busyEnd && slotEnd > busyStart) || // Any overlap
        (slotStart >= busyStart && slotStart < busyEnd) || // Slot starts during busy time
        (slotEnd > busyStart && slotEnd <= busyEnd) || // Slot ends during busy time
        (slotStart <= busyStart && slotEnd >= busyEnd) // Slot encompasses busy time
      ) {
        return {
          hasConflict: true,
          reason: `Conflicts with ${busy.title} (${busy.source})`
        };
      }
    }

    return { hasConflict: false };
  }

  /**
   * Check if time is within break period
   */
  private isInBreakTime(
    slotStart: Date,
    slotEnd: Date,
    breakTimes: BreakTime[]
  ): { isBreak: boolean; breakTitle?: string } {
    const slotStartTime = slotStart.toTimeString().substring(0, 5); // HH:MM
    const slotEndTime = slotEnd.toTimeString().substring(0, 5); // HH:MM

    for (const breakTime of breakTimes) {
      // Simple time comparison (assumes same day)
      if (
        (slotStartTime >= breakTime.start && slotStartTime < breakTime.end) ||
        (slotEndTime > breakTime.start && slotEndTime <= breakTime.end) ||
        (slotStartTime <= breakTime.start && slotEndTime >= breakTime.end)
      ) {
        return {
          isBreak: true,
          breakTitle: breakTime.title
        };
      }
    }

    return { isBreak: false };
  }

  /**
   * Generate available slots for a specific date and service
   */
  async calculateAvailableSlots(
    listingId: string,
    date: string, // YYYY-MM-DD format
    serviceDuration?: number, // minutes, optional override
    servicePrice?: number,
    serviceName?: string
  ): Promise<TimeSlot[]> {
    // Get service settings
    const settings = await this.getServiceSettings(listingId);
    if (!settings || !settings.booking_enabled) {
      return [];
    }

    // Check if date is within booking advance limit
    const today = new Date();
    const targetDate = new Date(date);
    const daysDifference = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > settings.advance_booking_days) {
      return [];
    }

    if (daysDifference < 0 || (daysDifference === 0 && !settings.same_day_booking)) {
      return [];
    }

    // Get day of week
    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySettings = settings.working_hours[dayName];

    if (!daySettings || !daySettings.enabled) {
      return [];
    }

    // Get provider ID from listing
    const { data: listing } = await supabase
      .from('listings')
      .select('user_id')
      .eq('id', listingId)
      .single();

    if (!listing) {
      return [];
    }

    const providerId = listing.user_id;

    // Get busy times for this date
    const busyTimes = await this.getBusyTimes(providerId, listingId, date);

    // Use provided duration or default
    const duration = serviceDuration || settings.default_duration_minutes;
    const bufferTime = settings.buffer_minutes;

    // Parse working hours
    const workStart = this.parseTime(daySettings.start);
    const workEnd = this.parseTime(daySettings.end);

    const slots: TimeSlot[] = [];
    let currentTime = new Date(targetDate);
    currentTime.setHours(workStart.hours, workStart.minutes, 0, 0);

    const endOfWork = new Date(targetDate);
    endOfWork.setHours(workEnd.hours, workEnd.minutes, 0, 0);

    // Generate slots throughout the working day
    while (currentTime.getTime() + duration * 60 * 1000 <= endOfWork.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60 * 1000);

      // Check for conflicts
      const conflictCheck = this.hasConflict(currentTime, slotEnd, busyTimes);
      
      // Check for break times
      const breakCheck = this.isInBreakTime(currentTime, slotEnd, settings.break_times);

      const isAvailable = !conflictCheck.hasConflict && !breakCheck.isBreak;
      let conflictReason: string | undefined;

      if (conflictCheck.hasConflict) {
        conflictReason = conflictCheck.reason;
      } else if (breakCheck.isBreak) {
        conflictReason = `During ${breakCheck.breakTitle}`;
      }

      slots.push({
        start: this.formatTime(currentTime),
        end: this.formatTime(slotEnd),
        startDateTime: currentTime.toISOString(),
        endDateTime: slotEnd.toISOString(),
        duration,
        isAvailable,
        price: servicePrice,
        currency: settings.service_options[0]?.currency || 'GBP',
        serviceName: serviceName || 'Service',
        conflictReason
      });

      // Move to next slot (duration + buffer)
      currentTime = new Date(currentTime.getTime() + (duration + bufferTime) * 60 * 1000);
    }

    return slots;
  }

  /**
   * Get available slots for multiple days
   */
  async getAvailabilityCalendar(
    listingId: string,
    startDate: string, // YYYY-MM-DD
    endDate: string, // YYYY-MM-DD
    serviceDuration?: number
  ): Promise<{ [date: string]: TimeSlot[] }> {
    const calendar: { [date: string]: TimeSlot[] } = {};
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Sync calendar data if connected (for the date range)
    await this.syncCalendarForDateRange(listingId, startDate, endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      calendar[dateStr] = await this.calculateAvailableSlots(
        listingId,
        dateStr,
        serviceDuration
      );
    }

    return calendar;
  }

  /**
   * Sync calendar data for a date range
   */
  private async syncCalendarForDateRange(
    listingId: string,
    startDate: string,
    endDate: string
  ): Promise<void> {
    // Get listing owner
    const { data: listing } = await supabase
      .from('listings')
      .select('user_id')
      .eq('id', listingId)
      .single();

    if (!listing) return;

    // Get active calendar connections
    const connections = await googleCalendar.getCalendarConnections(listing.user_id);
    
    for (const connection of connections) {
      if (connection.sync_enabled && connection.is_active) {
        try {
          await googleCalendar.syncBusyTimes(
            listing.user_id,
            listingId,
            connection,
            `${startDate}T00:00:00Z`,
            `${endDate}T23:59:59Z`
          );
        } catch (error) {
          console.error(`Failed to sync calendar ${connection.calendar_name}:`, error);
        }
      }
    }
  }

  /**
   * Book a specific time slot
   */
  async bookTimeSlot(
    listingId: string,
    customerId: string,
    slotData: {
      date: string; // YYYY-MM-DD
      startTime: string; // HH:MM
      endTime: string; // HH:MM
      serviceName: string;
      servicePrice: number;
      currency: string;
      customerNotes?: string;
    }
  ): Promise<{ success: boolean; bookingId?: string; error?: string }> {
    try {
      // Get listing details
      const { data: listing } = await supabase
        .from('listings')
        .select('user_id, title')
        .eq('id', listingId)
        .single();

      if (!listing) {
        return { success: false, error: 'Listing not found' };
      }

      // Verify slot is still available
      const slots = await this.calculateAvailableSlots(listingId, slotData.date);
      const requestedSlot = slots.find(slot => 
        slot.start === slotData.startTime && slot.end === slotData.endTime
      );

      if (!requestedSlot || !requestedSlot.isAvailable) {
        return { success: false, error: 'Time slot is no longer available' };
      }

      // Calculate duration
      const startDateTime = new Date(`${slotData.date}T${slotData.startTime}`);
      const endDateTime = new Date(`${slotData.date}T${slotData.endTime}`);
      const duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));

      // Create booking
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          listing_id: listingId,
          customer_id: customerId,
          provider_id: listing.user_id,
          booking_date: slotData.date,
          start_time: slotData.startTime,
          end_time: slotData.endTime,
          duration_minutes: duration,
          service_name: slotData.serviceName,
          service_price: slotData.servicePrice,
          currency: slotData.currency,
          customer_notes: slotData.customerNotes,
          status: 'pending' // Will be confirmed by provider or auto-confirmed based on settings
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // TODO: Send notifications to provider and customer
      // TODO: Create calendar event if provider has calendar connected

      return { success: true, bookingId: booking.id };

    } catch (error) {
      console.error('Booking error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Utility functions
   */
  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  private formatTime(date: Date): string {
    return date.toTimeString().substring(0, 5); // HH:MM
  }

  /**
   * Get service options for a listing
   */
  async getServiceOptions(listingId: string): Promise<ServiceOption[]> {
    const settings = await this.getServiceSettings(listingId);
    return settings?.service_options || [];
  }

  /**
   * Update service settings
   */
  async updateServiceSettings(
    listingId: string,
    updates: Partial<ServiceSettings>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('service_settings')
        .upsert({
          listing_id: listingId,
          ...updates,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'listing_id'
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const slotCalculator = SlotCalculator.getInstance();