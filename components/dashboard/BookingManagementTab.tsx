/**
 * Booking Management Tab for Provider Dashboard
 * Allows providers to view, manage, and respond to booking requests
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  service_name: string;
  service_price: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  customer_notes?: string;
  provider_notes?: string;
  created_at: string;
  customer: {
    id: string;
    name: string;
    avatar_url?: string;
    phone?: string;
  };
  listing: {
    id: string;
    title: string;
    category: string;
  };
}

interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  revenue: number;
}

export const BookingManagementTab: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [providerNotes, setProviderNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:users!customer_id(id, name, avatar_url, phone),
          listing:listings(id, title, category)
        `)
        .eq('provider_id', user.id)
        .gte('booking_date', new Date().toISOString().split('T')[0]) // Only future bookings
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error loading bookings:', error);
        return;
      }

      const typedBookings = bookingsData as Booking[];
      setBookings(typedBookings);

      // Calculate stats
      const statsData = typedBookings.reduce((acc, booking) => {
        acc.total++;
        acc[booking.status]++;
        if (booking.status === 'completed') {
          acc.revenue += booking.service_price;
        }
        return acc;
      }, {
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        revenue: 0
      });

      setStats(statsData);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleBookingAction = async (bookingId: string, action: 'confirm' | 'cancel' | 'complete' | 'no_show') => {
    setActionLoading(true);
    try {
      const updates: any = {
        status: action === 'confirm' ? 'confirmed' : 
                action === 'cancel' ? 'cancelled' :
                action === 'complete' ? 'completed' : 'no_show',
        updated_at: new Date().toISOString()
      };

      if (action === 'confirm') {
        updates.confirmed_at = new Date().toISOString();
      } else if (action === 'complete') {
        updates.completed_at = new Date().toISOString();
      } else if (action === 'cancel') {
        updates.cancelled_at = new Date().toISOString();
      }

      if (providerNotes.trim()) {
        updates.provider_notes = providerNotes.trim();
      }

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId);

      if (error) {
        throw error;
      }

      // Refresh bookings
      await loadBookings();
      
      // Close modal
      setShowBookingModal(false);
      setSelectedBooking(null);
      setProviderNotes('');

      // Show success message
      const actionText = action === 'confirm' ? 'confirmed' : 
                        action === 'cancel' ? 'cancelled' :
                        action === 'complete' ? 'completed' : 'marked as no-show';
      
      Alert.alert('Success', `Booking ${actionText} successfully`);

    } catch (error) {
      console.error('Failed to update booking:', error);
      Alert.alert('Error', 'Failed to update booking status');
    } finally {
      setActionLoading(false);
    }
  };

  const openBookingModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setProviderNotes(booking.provider_notes || '');
    setShowBookingModal(true);
  };

  const getFilteredBookings = () => {
    if (selectedFilter === 'all') {
      return bookings;
    }
    return bookings.filter(booking => booking.status === selectedFilter);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // HH:MM
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle';
      case 'completed': return 'checkmark-done-circle';
      case 'cancelled': return 'close-circle';
      case 'no_show': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const filters = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'confirmed', label: 'Confirmed', count: stats.confirmed },
    { key: 'completed', label: 'Completed', count: stats.completed },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color="#3b82f6" />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Bookings</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          <Text style={styles.statValue}>{stats.confirmed}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="cash" size={24} color="#8b5cf6" />
          <Text style={styles.statValue}>£{stats.revenue}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </ScrollView>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {filters.map((filter) => (
          <Pressable
            key={filter.key}
            style={[
              styles.filterTab,
              selectedFilter === filter.key && styles.filterTabActive
            ]}
            onPress={() => setSelectedFilter(filter.key as any)}
          >
            <Text style={[
              styles.filterTabText,
              selectedFilter === filter.key && styles.filterTabTextActive
            ]}>
              {filter.label} ({filter.count})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Bookings List */}
      <ScrollView
        style={styles.bookingsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {getFilteredBookings().length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No bookings found</Text>
            <Text style={styles.emptyStateSubtitle}>
              {selectedFilter === 'all' 
                ? 'You don\'t have any upcoming bookings yet'
                : `No ${selectedFilter} bookings at the moment`
              }
            </Text>
          </View>
        ) : (
          getFilteredBookings().map((booking) => (
            <Pressable
              key={booking.id}
              style={styles.bookingCard}
              onPress={() => openBookingModal(booking)}
            >
              <View style={styles.bookingHeader}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.serviceName}>{booking.service_name}</Text>
                  <Text style={styles.listingTitle}>{booking.listing.title}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                  <Ionicons 
                    name={getStatusIcon(booking.status) as any} 
                    size={14} 
                    color={getStatusColor(booking.status)} 
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.bookingDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="person" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{booking.customer.name}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Ionicons name="calendar" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>
                    {formatDate(booking.booking_date)} at {formatTime(booking.start_time)}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Ionicons name="time" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{booking.duration_minutes} minutes</Text>
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
                  <Text style={styles.notesLabel}>Customer Notes:</Text>
                  <Text style={styles.notesText}>{booking.customer_notes}</Text>
                </View>
              )}
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Booking Detail Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBookingModal(false)}
      >
        {selectedBooking && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setShowBookingModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <View style={styles.modalPlaceholder} />
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Service Information</Text>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Service:</Text>
                  <Text style={styles.modalDetailValue}>{selectedBooking.service_name}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Listing:</Text>
                  <Text style={styles.modalDetailValue}>{selectedBooking.listing.title}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Date & Time:</Text>
                  <Text style={styles.modalDetailValue}>
                    {formatDate(selectedBooking.booking_date)} at {formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}
                  </Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Duration:</Text>
                  <Text style={styles.modalDetailValue}>{selectedBooking.duration_minutes} minutes</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Price:</Text>
                  <Text style={styles.modalDetailValue}>
                    {formatPrice(selectedBooking.service_price, selectedBooking.currency)}
                  </Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Customer Information</Text>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Name:</Text>
                  <Text style={styles.modalDetailValue}>{selectedBooking.customer.name}</Text>
                </View>
                {selectedBooking.customer.phone && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Phone:</Text>
                    <Text style={styles.modalDetailValue}>{selectedBooking.customer.phone}</Text>
                  </View>
                )}
              </View>

              {selectedBooking.customer_notes && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Customer Notes</Text>
                  <Text style={styles.customerNotesText}>{selectedBooking.customer_notes}</Text>
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Provider Notes</Text>
                <TextInput
                  style={styles.providerNotesInput}
                  placeholder="Add notes about this booking..."
                  value={providerNotes}
                  onChangeText={setProviderNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {selectedBooking.status === 'pending' && (
                <View style={styles.actionsSection}>
                  <Text style={styles.modalSectionTitle}>Actions</Text>
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={[styles.actionButton, styles.confirmButton]}
                      onPress={() => handleBookingAction(selectedBooking.id, 'confirm')}
                      disabled={actionLoading}
                    >
                      <Ionicons name="checkmark" size={20} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Confirm</Text>
                    </Pressable>
                    
                    <Pressable
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleBookingAction(selectedBooking.id, 'cancel')}
                      disabled={actionLoading}
                    >
                      <Ionicons name="close" size={20} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Decline</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {selectedBooking.status === 'confirmed' && (
                <View style={styles.actionsSection}>
                  <Text style={styles.modalSectionTitle}>Actions</Text>
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => handleBookingAction(selectedBooking.id, 'complete')}
                      disabled={actionLoading}
                    >
                      <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Mark Complete</Text>
                    </Pressable>
                    
                    <Pressable
                      style={[styles.actionButton, styles.noShowButton]}
                      onPress={() => handleBookingAction(selectedBooking.id, 'no_show')}
                      disabled={actionLoading}
                    >
                      <Ionicons name="alert" size={20} color="#ffffff" />
                      <Text style={styles.actionButtonText}>No Show</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center' as const,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  bookingsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 4,
  },
  listingTitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    fontWeight: '500' as const,
    color: '#6b7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#3b82f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1f2937',
  },
  modalPlaceholder: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 12,
  },
  modalDetailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalDetailLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  modalDetailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1f2937',
    flex: 2,
    textAlign: 'right' as const,
  },
  customerNotesText: {
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    lineHeight: 20,
  },
  providerNotesInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  actionsSection: {
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  completeButton: {
    backgroundColor: '#3b82f6',
  },
  noShowButton: {
    backgroundColor: '#6b7280',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
};