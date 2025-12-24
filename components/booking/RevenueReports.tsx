/**
 * Revenue Tracking & Reports Component
 * Shows revenue analytics and appointment trends
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

interface RevenueStats {
  totalRevenue: number;
  completedBookings: number;
  averageBookingValue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowth: number;
}

interface BookingTrend {
  date: string;
  count: number;
  revenue: number;
}

interface RevenueReportsProps {
  providerId: string;
  listingId?: string;
}

export const RevenueReports: React.FC<RevenueReportsProps> = ({
  providerId,
  listingId,
}) => {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [trends, setTrends] = useState<BookingTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadRevenueData();
  }, [providerId, listingId, period]);

  const loadRevenueData = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      if (period === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      // Get completed bookings
      let query = supabase
        .from('bookings')
        .select('service_price, currency, booking_date, status')
        .eq('provider_id', providerId)
        .eq('status', 'completed');

      if (listingId) {
        query = query.eq('listing_id', listingId);
      }

      const { data: bookings, error } = await query;

      if (error) throw error;

      // Calculate stats
      const allBookings = bookings || [];
      const totalRevenue = allBookings.reduce((sum, b) => sum + parseFloat(b.service_price || '0'), 0);
      const completedBookings = allBookings.length;
      const averageBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;

      // This month vs last month
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonthBookings = allBookings.filter(b => 
        new Date(b.booking_date) >= thisMonthStart
      );
      const lastMonthBookings = allBookings.filter(b => {
        const date = new Date(b.booking_date);
        return date >= lastMonthStart && date <= lastMonthEnd;
      });

      const thisMonthRevenue = thisMonthBookings.reduce((sum, b) => sum + parseFloat(b.service_price || '0'), 0);
      const lastMonthRevenue = lastMonthBookings.reduce((sum, b) => sum + parseFloat(b.service_price || '0'), 0);
      const revenueGrowth = lastMonthRevenue > 0 
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      setStats({
        totalRevenue,
        completedBookings,
        averageBookingValue,
        thisMonthRevenue,
        lastMonthRevenue,
        revenueGrowth,
      });

      // Calculate trends
      const trendMap = new Map<string, { count: number; revenue: number }>();
      
      allBookings.forEach(booking => {
        const date = new Date(booking.booking_date).toISOString().split('T')[0];
        const existing = trendMap.get(date) || { count: 0, revenue: 0 };
        trendMap.set(date, {
          count: existing.count + 1,
          revenue: existing.revenue + parseFloat(booking.service_price || '0'),
        });
      });

      const trendArray: BookingTrend[] = Array.from(trendMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 days

      setTrends(trendArray);
    } catch (error) {
      console.error('Failed to load revenue data:', error);
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

  if (!stats) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No revenue data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodContainer}>
        {(['week', 'month', 'year'] as const).map((p) => (
          <Pressable
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Revenue Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="cash" size={24} color="#10b981" />
          </View>
          <Text style={styles.statValue}>{formatPrice(stats.totalRevenue)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="calendar-check" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.statValue}>{stats.completedBookings}</Text>
          <Text style={styles.statLabel}>Completed Bookings</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="trending-up" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.statValue}>{formatPrice(stats.averageBookingValue)}</Text>
          <Text style={styles.statLabel}>Avg. Booking Value</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons 
              name={stats.revenueGrowth >= 0 ? 'arrow-up' : 'arrow-down'} 
              size={24} 
              color={stats.revenueGrowth >= 0 ? '#10b981' : '#ef4444'} 
            />
          </View>
          <Text style={[styles.statValue, { color: stats.revenueGrowth >= 0 ? '#10b981' : '#ef4444' }]}>
            {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}%
          </Text>
          <Text style={styles.statLabel}>Growth (vs last month)</Text>
        </View>
      </View>

      {/* Monthly Comparison */}
      <View style={styles.comparisonCard}>
        <Text style={styles.sectionTitle}>Monthly Comparison</Text>
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>This Month</Text>
            <Text style={styles.comparisonValue}>{formatPrice(stats.thisMonthRevenue)}</Text>
          </View>
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>Last Month</Text>
            <Text style={styles.comparisonValue}>{formatPrice(stats.lastMonthRevenue)}</Text>
          </View>
        </View>
      </View>

      {/* Trends */}
      {trends.length > 0 && (
        <View style={styles.trendsCard}>
          <Text style={styles.sectionTitle}>Booking Trends (Last 30 Days)</Text>
          <View style={styles.trendsList}>
            {trends.map((trend, index) => (
              <View key={index} style={styles.trendItem}>
                <Text style={styles.trendDate}>
                  {new Date(trend.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                </Text>
                <View style={styles.trendBar}>
                  <View 
                    style={[
                      styles.trendBarFill, 
                      { width: `${Math.min((trend.count / 10) * 100, 100)}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.trendCount}>{trend.count}</Text>
                <Text style={styles.trendRevenue}>{formatPrice(trend.revenue)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
  periodContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  periodTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
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
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  comparisonCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  comparisonItem: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  trendsCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  trendsList: {
    gap: 12,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trendDate: {
    fontSize: 12,
    color: '#6b7280',
    width: 60,
  },
  trendBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trendBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  trendCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    width: 30,
    textAlign: 'right',
  },
  trendRevenue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    width: 70,
    textAlign: 'right',
  },
});
