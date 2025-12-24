import { supabase } from '../supabase';

export interface TimeSlot {
  id: string;
  start: string;
  end: string;
  isAvailable: boolean;
  price?: number;
  serviceName?: string;
  duration: number;
}

export interface ServiceOption {
  id: string;
  name: string;
  duration: number;
  price: number;
  currency: string;
}

/**
 * Get available time slots for a specific date and listing
 */
export async function getAvailableTimeSlots(
  listingId: string,
  date: string
): Promise<TimeSlot[]> {
  try {
    // Get listing details and service settings
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingError) throw listingError;

    // Get service settings for working hours
    const { data: serviceSettings, error: settingsError } = await supabase
      .from('service_settings')
      .select('*')
      .eq('listing_id', listingId)
      .single();

    // Default working hours if no settings found
    const workingHours = serviceSettings?.working_hours || {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '09:00', end: '15:00', enabled: false },
      sunday: { start: '10:00', end: '16:00', enabled: false },
    };

    // Get day of week
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const daySettings = workingHours[dayOfWeek];

    if (!daySettings?.enabled) {
      return []; // No slots available on this day
    }

    // Get existing bookings for this date
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('listing_id', listingId)
      .gte('start_time', `${date}T00:00:00`)
      .lt('start_time', `${date}T23:59:59`)
      .in('status', ['pending', 'confirmed']);

    if (bookingsError) throw bookingsError;

    // Generate time slots
    const slots: TimeSlot[] = [];
    const startTime = parseTime(daySettings.start);
    const endTime = parseTime(daySettings.end);
    const slotDuration = serviceSettings?.default_duration_minutes || 60;
    const bufferTime = serviceSettings?.buffer_minutes || 15;

    let currentTime = startTime;
    let slotId = 1;

    while (currentTime + slotDuration <= endTime) {
      const slotStart = formatTime(currentTime);
      const slotEnd = formatTime(currentTime + slotDuration);
      
      // Check if this slot conflicts with existing bookings
      const isBooked = existingBookings?.some(booking => {
        const bookingStart = new Date(booking.start_time).getTime();
        const bookingEnd = new Date(booking.end_time).getTime();
        const slotStartTime = new Date(`${date}T${slotStart}`).getTime();
        const slotEndTime = new Date(`${date}T${slotEnd}`).getTime();
        
        return (slotStartTime < bookingEnd && slotEndTime > bookingStart);
      }) || false;

      slots.push({
        id: slotId.toString(),
        start: slotStart,
        end: slotEnd,
        isAvailable: !isBooked,
        price: listing.budget_min || 50,
        serviceName: listing.title,
        duration: slotDuration,
      });

      currentTime += slotDuration + bufferTime;
      slotId++;
    }

    return slots;

  } catch (error) {
    console.error('Error getting available time slots:', error);
    // Return mock data as fallback
    return generateMockTimeSlots();
  }
}

/**
 * Generate mock time slots for development/fallback
 */
function generateMockTimeSlots(): TimeSlot[] {
  return [
    { id: '1', start: '09:00', end: '10:00', isAvailable: true, price: 50, serviceName: 'Service', duration: 60 },
    { id: '2', start: '10:30', end: '11:30', isAvailable: true, price: 50, serviceName: 'Service', duration: 60 },
    { id: '3', start: '12:00', end: '13:00', isAvailable: false, price: 50, serviceName: 'Service', duration: 60 },
    { id: '4', start: '14:00', end: '15:00', isAvailable: true, price: 50, serviceName: 'Service', duration: 60 },
    { id: '5', start: '15:30', end: '16:30', isAvailable: true, price: 50, serviceName: 'Service', duration: 60 },
    { id: '6', start: '17:00', end: '18:00', isAvailable: true, price: 50, serviceName: 'Service', duration: 60 },
  ];
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to time string (HH:MM)
 */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Book a time slot
 */
export async function bookTimeSlot(
  listingId: string,
  customerId: string,
  bookingDetails: {
    date: string;
    startTime: string;
    endTime: string;
    serviceName: string;
    servicePrice: number;
    currency?: string;
    customerNotes?: string;
  }
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    const startDateTime = new Date(`${bookingDetails.date}T${bookingDetails.startTime}`);
    const endDateTime = new Date(`${bookingDetails.date}T${bookingDetails.endTime}`);

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        listing_id: listingId,
        customer_id: customerId,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        service_name: bookingDetails.serviceName,
        service_price: bookingDetails.servicePrice,
        currency: bookingDetails.currency || 'USD',
        customer_notes: bookingDetails.customerNotes,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, bookingId: data.id };
  } catch (error) {
    console.error('Error booking time slot:', error);
    return { success: false, error: (error as Error).message };
  }
}
