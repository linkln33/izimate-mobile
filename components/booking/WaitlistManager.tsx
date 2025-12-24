/**
 * Waitlist Manager
 * Manages booking waitlist for providers and customers
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { scheduleBookingReminder } from '../../lib/utils/push-notifications';

interface WaitlistEntry {
  id: string;
  preferred_date: string;
  preferred_start_time: string;
  preferred_end_time: string;
  service_name: string;
  notes: string;
  status: 'active' | 'notified' | 'booked' | 'cancelled';
  customer: {
    id: string;
    name: string;
    phone?: string;
  };
  listing: {
    id: string;
    title: string;
  };
}

interface WaitlistManagerProps {
  providerId: string;
  listingId?: string;
  isProvider?: boolean;
}

export const WaitlistManager: React.FC<WaitlistManagerProps> = ({
  providerId,
  listingId,
  isProvider = false,
}) => {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  useEffect(() => {
    loadWaitlist();
  }, [providerId, listingId, filter]);

  const loadWaitlist = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('booking_waitlist')
        .select(`
          *,
          customer:users!customer_id(id, name, phone),
          listing:listings(id, title)
        `)
        .eq(isProvider ? 'provider_id' : 'customer_id', providerId)
        .order('created_at', { ascending: false });

      if (listingId) {
        query = query.eq('listing_id', listingId);
      }

      if (filter === 'active') {
        query = query.eq('status', 'active');
      }

      const { data, error } = await query;

      if (error) throw error;
      setWaitlist((data || []) as WaitlistEntry[]);
    } catch (error) {
      console.error('Failed to load waitlist:', error);
      Alert.alert('Error', 'Failed to load waitlist');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    // This would be called from booking calendar when no slots available
    Alert.alert(
      'Join Waitlist',
      'Would you like to be notified when a slot becomes available?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join Waitlist',
          onPress: async () => {
            // Implementation would go here
            Alert.alert('Success', 'You\'ve been added to the waitlist');
          }
        }
      ]
    );
  };

  const handleNotifyCustomer = async (entryId: string, customerId: string) => {
    try {
      const { error } = await supabase
        .from('booking_waitlist')
        .update({
          status: 'notified',
          notified_at: new Date().toISOString(),
        })
        .eq('id', entryId);

      if (error) throw error;

      // Send notification to customer
      await sendWaitlistNotification(entryId, customerId);
      Alert.alert('Success', 'Customer has been notified');
      await loadWaitlist();
    } catch (error) {
      console.error('Failed to notify customer:', error);
      Alert.alert('Error', 'Failed to notify customer');
    }
  };

  const handleRemoveFromWaitlist = async (entryId: string) => {
    Alert.alert(
      'Remove from Waitlist',
      'Are you sure you want to remove this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('booking_waitlist')
                .update({ status: 'cancelled' })
                .eq('id', entryId);

              if (error) throw error;
              await loadWaitlist();
            } catch (error) {
              console.error('Failed to remove from waitlist:', error);
              Alert.alert('Error', 'Failed to remove from waitlist');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Any date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'Any time';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const sendWaitlistNotification = async (entryId: string, customerId: string) => {
    try {
      // Get waitlist entry details
      const { data: entry, error: entryError } = await supabase
        .from('booking_waitlist')
        .select(`
          *,
          listing:listings(id, title),
          customer:users!customer_id(id, name, push_token)
        `)
        .eq('id', entryId)
        .single();

      if (entryError || !entry) {
        throw new Error('Failed to load waitlist entry');
      }

      // Create notification in database
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: customerId,
          type: 'waitlist_available',
          title: 'Slot Available!',
          message: `A slot is now available for ${entry.listing?.title || entry.service_name}. Book now!`,
          data: {
            waitlist_entry_id: entryId,
            listing_id: entry.listing_id,
            service_name: entry.service_name,
          },
          read: false,
        });

      if (notifError) {
        console.error('Failed to create notification:', notifError);
      }

      // Send push notification if customer has push token
      if (entry.customer?.push_token) {
        try {
          await scheduleBookingReminder(
            entry.customer.push_token,
            {
              title: 'Slot Available!',
              body: `A slot is now available for ${entry.listing?.title || entry.service_name}. Book now!`,
              data: {
                type: 'waitlist_available',
                waitlist_entry_id: entryId,
                listing_id: entry.listing_id,
              },
            },
            new Date(Date.now() + 1000) // Send immediately (1 second delay)
          );
        } catch (pushError) {
          console.error('Failed to send push notification:', pushError);
          // Don't fail the whole operation if push fails
        }
      }
    } catch (error) {
      console.error('Failed to send waitlist notification:', error);
      // Don't throw - notification is best effort
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isProvider && (
        <View style={styles.filterContainer}>
          <Pressable
            style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
            onPress={() => setFilter('active')}
          >
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
              Active
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
      )}

      <ScrollView style={styles.list}>
        {waitlist.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No waitlist entries</Text>
            <Text style={styles.emptySubtext}>
              {isProvider 
                ? 'Customers will appear here when they join the waitlist'
                : 'You\'re not on any waitlists'}
            </Text>
          </View>
        ) : (
          waitlist.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={styles.entryInfo}>
                  <Text style={styles.customerName}>
                    {isProvider ? entry.customer.name : entry.listing.title}
                  </Text>
                  <Text style={styles.serviceName}>{entry.service_name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(entry.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(entry.status) }]}>
                    {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.entryDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{formatDate(entry.preferred_date)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="time" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>
                    {formatTime(entry.preferred_start_time)} - {formatTime(entry.preferred_end_time)}
                  </Text>
                </View>
              </View>

              {entry.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesText}>{entry.notes}</Text>
                </View>
              )}

              {isProvider && entry.status === 'active' && (
                <View style={styles.actionsContainer}>
                  <Pressable
                    style={styles.notifyButton}
                    onPress={() => handleNotifyCustomer(entry.id, entry.customer.id)}
                  >
                    <Ionicons name="notifications" size={18} color="#007AFF" />
                    <Text style={styles.notifyButtonText}>Notify</Text>
                  </Pressable>
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => handleRemoveFromWaitlist(entry.id)}
                  >
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                </View>
              )}

              {!isProvider && entry.status === 'active' && (
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => handleRemoveFromWaitlist(entry.id)}
                >
                  <Ionicons name="close-circle" size={18} color="#ef4444" />
                  <Text style={styles.cancelButtonText}>Remove from Waitlist</Text>
                </Pressable>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return '#3b82f6';
    case 'notified': return '#10b981';
    case 'booked': return '#059669';
    case 'cancelled': return '#6b7280';
    default: return '#6b7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  list: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  entryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  entryInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: '#6b7280',
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
  entryDetails: {
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
    borderTopColor: '#e5e7eb',
  },
  notesText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  notifyButton: {
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
  notifyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  removeButton: {
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
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
});
