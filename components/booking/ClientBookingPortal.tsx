/**
 * Client Self-Service Portal
 * Allows clients to view, cancel, and reschedule their bookings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  service_name: string;
  service_price: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  customer_notes?: string;
  provider_notes?: string;
  listing: {
    id: string;
    title: string;
  };
  provider: {
    id: string;
    name: string;
  };
}

interface ClientBookingPortalProps {
  userId: string;
}

export const ClientBookingPortal: React.FC<ClientBookingPortalProps> = ({ userId }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  useEffect(() => {
    loadBookings();
  }, [userId, filter]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('bookings')
        .select(`
          *,
          listing:listings(id, title),
          provider:users!provider_id(id, name)
        `)
        .eq('customer_id', userId)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (filter === 'upcoming') {
        query = query.gte('booking_date', today).in('status', ['pending', 'confirmed']);
      } else if (filter === 'past') {
        query = query.or(`booking_date.lt.${today},status.in.(completed,cancelled,no_show)`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBookings((data || []) as Booking[]);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      Alert.alert('Error', 'Failed to load your bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string, bookingDate: string, startTime: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('bookings')
                .update({
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString(),
                  cancellation_reason: 'Cancelled by customer'
                })
                .eq('id', bookingId);

              if (error) throw error;

              Alert.alert('Success', 'Booking cancelled successfully');
              await loadBookings();
            } catch (error) {
              console.error('Failed to cancel booking:', error);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleReschedule = (booking: Booking) => {
    Alert.alert(
      'Reschedule Booking',
      'To reschedule, please cancel this booking and create a new one with your preferred time.',
      [{ text: 'OK' }]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#10b981';
      case 'completed': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      case 'no_show': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const canCancel = (booking: Booking) => {
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return booking.status === 'pending' || booking.status === 'confirmed' && hoursUntilBooking > 24;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <Pressable
          style={[styles.filterTab, filter === 'upcoming' && styles.filterTabActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
            Upcoming
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'past' && styles.filterTabActive]}
          onPress={() => setFilter('past')}
        >
          <Text style={[styles.filterText, filter === 'past' && styles.filterTextActive]}>
            Past
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </Pressable>
      </View>

      {/* Bookings List */}
      <ScrollView style={styles.bookingsList}>
        {bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No bookings found</Text>
            <Text style={styles.emptyStateSubtitle}>
              {filter === 'upcoming' 
                ? 'You don\'t have any upcoming bookings'
                : 'No past bookings to display'}
            </Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.serviceName}>{booking.service_name}</Text>
                  <Text style={styles.listingTitle}>{booking.listing.title}</Text>
                  <Text style={styles.providerName}>with {booking.provider.name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.bookingDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>
                    {formatDate(booking.booking_date)}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Ionicons name="time" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Ionicons name="cash" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>
                    {formatPrice(booking.service_price, booking.currency)}
                  </Text>
                </View>
              </View>

              {booking.customer_notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Your Notes:</Text>
                  <Text style={styles.notesText}>{booking.customer_notes}</Text>
                </View>
              )}

              {booking.provider_notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Provider Notes:</Text>
                  <Text style={styles.notesText}>{booking.provider_notes}</Text>
                </View>
              )}

              {/* Actions */}
              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                <View style={styles.actionsContainer}>
                  {canCancel(booking) && (
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => handleCancelBooking(booking.id, booking.booking_date, booking.start_time)}
                    >
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                  )}
                  {canCancel(booking) && (
                    <Pressable
                      style={styles.rescheduleButton}
                      onPress={() => handleReschedule(booking)}
                    >
                      <Ionicons name="calendar-outline" size={18} color="#007AFF" />
                      <Text style={styles.rescheduleButtonText}>Reschedule</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  bookingsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  listingTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  providerName: {
    fontSize: 13,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  rescheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  rescheduleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});
