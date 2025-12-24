/**
 * Enhanced Client Profile Component
 * Shows booking history, preferences, and client information for providers
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface ClientProfileEnhancedProps {
  customerId: string;
}

interface ClientStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  averageBookingValue: number;
  favoriteService?: string;
  lastBookingDate?: string;
}

export const ClientProfileEnhanced: React.FC<ClientProfileEnhancedProps> = ({
  customerId,
}) => {
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<any>(null);

  useEffect(() => {
    loadClientData();
  }, [customerId]);

  const loadClientData = async () => {
    try {
      setLoading(true);

      // Load client info
      const { data: client } = await supabase
        .from('users')
        .select('*')
        .eq('id', customerId)
        .single();

      if (client) {
        setClientInfo(client);
      }

      // Load booking stats
      const { data: bookings } = await supabase
        .from('bookings')
        .select('service_name, service_price, status, booking_date, currency')
        .eq('customer_id', customerId);

      if (bookings) {
        const totalBookings = bookings.length;
        const completedBookings = bookings.filter(b => b.status === 'completed').length;
        const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
        const totalSpent = bookings
          .filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + parseFloat(b.service_price || '0'), 0);
        const averageBookingValue = completedBookings > 0 ? totalSpent / completedBookings : 0;

        // Find favorite service
        const serviceCounts = new Map<string, number>();
        bookings.forEach(b => {
          if (b.service_name) {
            serviceCounts.set(b.service_name, (serviceCounts.get(b.service_name) || 0) + 1);
          }
        });
        const favoriteService = Array.from(serviceCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0];

        // Last booking date
        const sortedBookings = bookings
          .filter(b => b.booking_date)
          .sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime());
        const lastBookingDate = sortedBookings[0]?.booking_date;

        setStats({
          totalBookings,
          completedBookings,
          cancelledBookings,
          totalSpent,
          averageBookingValue,
          favoriteService,
          lastBookingDate,
        });
      }
    } catch (error) {
      console.error('Failed to load client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!clientInfo || !stats) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No client data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Client Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{clientInfo.name}</Text>
          </View>
          {clientInfo.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{clientInfo.email}</Text>
            </View>
          )}
          {clientInfo.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{clientInfo.phone}</Text>
            </View>
          )}
          {clientInfo.location_address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{clientInfo.location_address}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Booking Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#3b82f6" />
            <Text style={styles.statValue}>{stats.totalBookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={styles.statValue}>{stats.completedBookings}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>{formatPrice(stats.totalSpent)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>{formatPrice(stats.averageBookingValue)}</Text>
            <Text style={styles.statLabel}>Avg. Value</Text>
          </View>
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.preferencesCard}>
          {stats.favoriteService && (
            <View style={styles.preferenceItem}>
              <Ionicons name="star" size={20} color="#f59e0b" />
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceLabel}>Favorite Service</Text>
                <Text style={styles.preferenceValue}>{stats.favoriteService}</Text>
              </View>
            </View>
          )}
          {stats.lastBookingDate && (
            <View style={styles.preferenceItem}>
              <Ionicons name="time" size={20} color="#3b82f6" />
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceLabel}>Last Booking</Text>
                <Text style={styles.preferenceValue}>
                  {new Date(stats.lastBookingDate).toLocaleDateString('en-GB', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}
          {clientInfo.bio && (
            <View style={styles.preferenceItem}>
              <Ionicons name="document-text" size={20} color="#6b7280" />
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceLabel}>Bio</Text>
                <Text style={styles.preferenceValue}>{clientInfo.bio}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  preferencesCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  preferenceInfo: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  preferenceValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
});
