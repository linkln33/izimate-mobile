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
import { CalendarIntegration } from '../booking/CalendarIntegration';
import { BookingCalendarWidget } from '../booking/BookingCalendarWidget';
import { UnifiedCalendar } from '../calendar';
import { BlockedTimeManager } from '../booking/BlockedTimeManager';
import { WaitlistManager } from '../booking/WaitlistManager';
import { CouponManager } from '../booking/CouponManager';
import { StaffManager } from '../booking/StaffManager';
import { RevenueReports } from '../booking/RevenueReports';

interface Booking {
  id: string;
  start_time: string; // timestamp with time zone
  end_time: string; // timestamp with time zone
  duration_minutes?: number;
  service_name?: string;
  service_price?: number;
  currency?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  customer_notes?: string;
  provider_notes?: string;
  timezone?: string;
  metadata?: any;
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
  cancelled: number;
  no_show: number;
  revenue: number;
}

export const BookingManagementTab: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{ id: string; name?: string } | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBookingDate, setSelectedBookingDate] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingCalendarModal, setShowBookingCalendarModal] = useState(false);
  const [selectedListingForBooking, setSelectedListingForBooking] = useState<any>(null);
  const [providerNotes, setProviderNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    getCurrentUser();
    loadBookings();
  }, []);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user profile for name
        const { data: userProfile } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', user.id)
          .single();
        
        setCurrentUser({ 
          id: user.id,
          name: userProfile?.name || 'Provider'
        });
        
        // Get provider profile
        const { data: providerProfile } = await supabase
          .from('provider_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (providerProfile) {
          setProviderId(providerProfile.id);
          
          // Get user's listings with full details
          const { data: listingsData } = await supabase
            .from('listings')
            .select('id, title, user_id')
            .eq('user_id', user.id)
            .eq('status', 'active');
          
          if (listingsData && listingsData.length > 0) {
            setListings(listingsData);
            setSelectedListingId(listingsData[0].id); // Default to first listing
            setSelectedListingForBooking(listingsData[0]); // Store full listing for booking
          }
        }
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
    }
  };

  const loadBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, get the user's provider profile ID
      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!providerProfile) {
        console.log('No provider profile found for user');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Get bookings for this provider
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:users!customer_id(id, name, avatar_url, phone),
          listing:listings(id, title, category)
        `)
        .eq('provider_id', providerProfile.id)
        .order('start_time', { ascending: false }); // Most recent first

      if (error) {
        console.error('Error loading bookings:', error);
        return;
      }

      const typedBookings = (bookingsData || []) as Booking[];
      setBookings(typedBookings);

      // Calculate stats
      const statsData = typedBookings.reduce((acc, booking) => {
        acc.total++;
        
        // Count by status
        if (booking.status === 'pending') acc.pending++;
        else if (booking.status === 'confirmed') acc.confirmed++;
        else if (booking.status === 'completed') acc.completed++;
        else if (booking.status === 'cancelled') acc.cancelled++;
        else if (booking.status === 'no_show') acc.no_show++;
        
        // Calculate revenue from completed bookings
        if (booking.status === 'completed' && booking.service_price) {
          acc.revenue += booking.service_price;
        }
        
        return acc;
      }, {
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
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
    if (!selectedFilter) {
      return bookings;
    }
    return bookings.filter(booking => booking.status === selectedFilter);
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
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatPrice = (price?: number, currency?: string) => {
    if (!price || !currency) return 'Price TBD';
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
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'confirmed', label: 'Confirmed', count: stats.confirmed },
    { key: 'completed', label: 'Completed', count: stats.completed },
    { key: 'cancelled', label: 'Cancelled', count: stats.cancelled },
    { key: 'no_show', label: 'No Show', count: stats.no_show },
  ].filter(filter => filter.count > 0);

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
      {/* Calendar Integration Section */}
      {currentUser && (
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>📅 Calendar Options</Text>
          <Text style={styles.sectionSubtitle}>
            Use our calendar or sync with your existing one
          </Text>
          
          {/* Upcoming Bookings Calendar */}
          <BookingCalendarWidget
            userId={currentUser.id}
            onBookingPress={(bookingId) => {
              const booking = bookings.find(b => b.id === bookingId);
              if (booking) {
                setSelectedBooking(booking);
                setShowBookingModal(true);
              }
            }}
          />
          
          {/* Calendar Integration */}
          <CalendarIntegration
            userId={currentUser.id}
            listingId={selectedListingId || undefined}
            onConnectionChange={(connected) => {
              console.log('Calendar connection changed:', connected);
            }}
            onBookDate={(date) => {
              if (selectedListingId && selectedListingForBooking) {
                setSelectedBookingDate(date);
                setShowBookingCalendarModal(true);
              } else {
                Alert.alert('No Listing', 'Please select a listing first to book a service.');
              }
            }}
          />
        </View>
      )}

      {/* Stats Overview */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>📊 Booking Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.confirmed}</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>£{stats.revenue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.cancelled}</Text>
            <Text style={styles.statLabel}>Cancelled</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersGrid}>
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
                styles.filterTabCount,
                selectedFilter === filter.key && styles.filterTabCountActive
              ]}>
                {filter.count}
              </Text>
              <Text style={[
                styles.filterTabText,
                selectedFilter === filter.key && styles.filterTabTextActive
              ]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* New Features Section */}
      {currentUser && providerId && (
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>🛠️ Booking Tools</Text>
          
          {/* Listing Selector */}
          {listings.length > 1 && (
            <View style={styles.listingSelector}>
              <Text style={styles.selectorLabel}>Select Listing:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {listings.map((listing) => (
                  <Pressable
                    key={listing.id}
                    style={[
                      styles.listingChip,
                      selectedListingId === listing.id && styles.listingChipActive
                    ]}
                    onPress={() => setSelectedListingId(listing.id)}
                  >
                    <Text style={[
                      styles.listingChipText,
                      selectedListingId === listing.id && styles.listingChipTextActive
                    ]}>
                      {listing.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Blocked Time Manager */}
          {selectedListingId && (
            <View style={styles.featureCard}>
              <Text style={styles.featureTitle}>⏰ Blocked Time</Text>
              <BlockedTimeManager
                providerId={providerId}
                listingId={selectedListingId}
              />
            </View>
          )}

          {/* Waitlist Manager */}
          {selectedListingId && (
            <View style={styles.featureCard}>
              <Text style={styles.featureTitle}>📋 Waitlist</Text>
              <WaitlistManager
                providerId={providerId}
                listingId={selectedListingId}
              />
            </View>
          )}

          {/* Coupon Manager */}
          {selectedListingId && (
            <View style={styles.featureCard}>
              <Text style={styles.featureTitle}>🎫 Discount Codes</Text>
              <CouponManager
                providerId={providerId}
                listingId={selectedListingId}
              />
            </View>
          )}

          {/* Staff Manager */}
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>👥 Staff Members</Text>
            <StaffManager providerId={providerId} />
          </View>

          {/* Revenue Reports */}
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>📊 Revenue Reports</Text>
            <RevenueReports providerId={providerId} />
          </View>
        </View>
      )}

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
              {!selectedFilter 
                ? 'You don\'t have any bookings yet'
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
                  <Text style={styles.serviceName}>{booking.service_name || booking.listing.title}</Text>
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
                    {formatDateTime(booking.start_time)}
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
                    {formatDate(selectedBooking.start_time)} at {formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}
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

      {/* Booking Calendar Modal for Date Selection */}
      {selectedListingForBooking && currentUser && (
        <UnifiedCalendar
          mode="booking"
          listingId={selectedListingForBooking.id}
          listing={selectedListingForBooking}
          provider={{ id: currentUser.id, name: currentUser.name || 'Provider' } as any}
          visible={showBookingCalendarModal}
          initialDate={selectedBookingDate || undefined}
          onClose={() => {
            setShowBookingCalendarModal(false);
            setSelectedBookingDate(null);
          }}
          onBookingComplete={(bookingId) => {
            setShowBookingCalendarModal(false);
            setSelectedBookingDate(null);
            loadBookings(); // Refresh bookings list
            Alert.alert('Success', 'Booking created successfully!');
          }}
          showTimeSlots={true}
          showServiceSelection={true}
          allowBookingCreation={true}
          utility="slotCalculator"
        />
      )}
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  calendarSection: {
    marginBottom: 16,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  calendarSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  statsSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  statItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: '30%',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1f2937',
    lineHeight: 24,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6b7280',
    textAlign: 'center' as const,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filtersGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: '30%',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6b7280',
    marginTop: 4,
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  filterTabCount: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1f2937',
    lineHeight: 24,
  },
  filterTabCountActive: {
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
  featuresSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  listingSelector: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  listingChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  listingChipActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#f25842',
  },
  listingChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  listingChipTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
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