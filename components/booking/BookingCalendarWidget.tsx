/**
 * Booking Calendar Widget
 * Shows upcoming bookings in a compact calendar view for the booking management tab
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface BookingEvent {
  id: string;
  start_time: string;
  end_time: string;
  service_name?: string;
  customer_name: string;
  status: string;
}

interface BookingCalendarWidgetProps {
  userId: string;
  onBookingPress?: (bookingId: string) => void;
}

export const BookingCalendarWidget: React.FC<BookingCalendarWidgetProps> = ({
  userId,
  onBookingPress
}) => {
  const [upcomingBookings, setUpcomingBookings] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingBookings();
  }, [userId]);

  const loadUpcomingBookings = async () => {
    try {
      // Get provider profile ID
      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!providerProfile) return;

      // Get upcoming bookings (next 7 days)
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          service_name,
          status,
          customer:users!customer_id(name)
        `)
        .eq('provider_id', providerProfile.id)
        .gte('start_time', today.toISOString())
        .lte('start_time', nextWeek.toISOString())
        .in('status', ['pending', 'confirmed'])
        .order('start_time', { ascending: true })
        .limit(5);

      if (error) {
        console.error('Error loading upcoming bookings:', error);
        return;
      }

      const events = (bookingsData || []).map(booking => ({
        id: booking.id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        service_name: booking.service_name,
        customer_name: booking.customer?.name || 'Unknown Customer',
        status: booking.status
      }));

      setUpcomingBookings(events);
    } catch (error) {
      console.error('Failed to load upcoming bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const startStr = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const endStr = end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${startStr} - ${endStr}`;
  };

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="calendar-outline" size={20} color="#6b7280" />
          <Text style={styles.title}>Upcoming Bookings</Text>
        </View>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (upcomingBookings.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="calendar-outline" size={20} color="#6b7280" />
          <Text style={styles.title}>Upcoming Bookings</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="calendar-clear" size={32} color="#d1d5db" />
          <Text style={styles.emptyText}>No upcoming bookings</Text>
          <Text style={styles.emptySubtext}>Your next 7 days are free</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="calendar" size={20} color="#3b82f6" />
        <Text style={styles.title}>Upcoming Bookings</Text>
        <Text style={styles.subtitle}>Next 7 days</Text>
      </View>

      <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
        {upcomingBookings.map((event) => (
          <Pressable
            key={event.id}
            style={styles.eventItem}
            onPress={() => onBookingPress?.(event.id)}
          >
            <View style={styles.eventTime}>
              <Text style={styles.eventDate}>{formatEventDate(event.start_time)}</Text>
              <Text style={styles.eventTimeText}>{formatEventTime(event.start_time, event.end_time)}</Text>
            </View>
            
            <View style={styles.eventDetails}>
              <Text style={styles.eventService} numberOfLines={1}>
                {event.service_name || 'Service'}
              </Text>
              <Text style={styles.eventCustomer} numberOfLines={1}>
                {event.customer_name}
              </Text>
            </View>

            <View style={[styles.eventStatus, { backgroundColor: getStatusColor(event.status) }]}>
              <Text style={styles.eventStatusText}>
                {event.status === 'pending' ? 'P' : 'C'}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  eventsList: {
    maxHeight: 200,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  eventTime: {
    width: 80,
    alignItems: 'center',
  },
  eventDate: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  eventTimeText: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '600',
    marginTop: 2,
  },
  eventDetails: {
    flex: 1,
    marginLeft: 12,
  },
  eventService: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  eventCustomer: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  eventStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  eventStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});