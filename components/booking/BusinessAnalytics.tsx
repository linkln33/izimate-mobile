/**
 * Business Analytics
 * Revenue, bookings, and performance analytics for providers
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getUserCurrency } from '@/lib/utils/currency';
import type { User } from '@/lib/types';

interface BusinessAnalyticsProps {
  userId: string;
}

interface AnalyticsData {
  totalRevenue: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageBookingValue: number;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  upcomingBookings: number;
}

const { width } = Dimensions.get('window');

export const BusinessAnalytics: React.FC<BusinessAnalyticsProps> = ({
  userId,
}) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    averageBookingValue: 0,
    topServices: [],
    revenueByMonth: [],
    upcomingBookings: 0,
  });
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  // Get user currency - default to GBP if user not loaded yet
  const userCurrency = user ? getUserCurrency(user.currency, user.country) : 'GBP';
  
  if (__DEV__ && user) {
    console.log('📊 BusinessAnalytics: Using currency:', userCurrency, 'from user.currency:', user.currency, 'user.country:', user.country);
  }

  useEffect(() => {
    loadUser();
    loadAnalytics();
  }, [timeRange]);

  // Reload user data when component comes into focus (e.g., after currency change)
  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [userId])
  );

  const loadUser = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userData) {
        if (__DEV__) {
          console.log('📊 BusinessAnalytics: Loaded user currency:', userData.currency);
        }
        setUser(userData as User);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading user:', error);
      }
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Get provider profile
      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!providerProfile) {
        setLoading(false);
        return;
      }

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Fetch all bookings for the provider
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('provider_id', providerProfile.id)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      if (!bookings || bookings.length === 0) {
        setAnalytics({
          totalRevenue: 0,
          totalBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          averageBookingValue: 0,
          topServices: [],
          revenueByMonth: [],
          upcomingBookings: 0,
        });
        setLoading(false);
        return;
      }

      // Calculate metrics
      const completed = bookings.filter(b => b.status === 'completed');
      const cancelled = bookings.filter(b => b.status === 'cancelled');
      const upcoming = bookings.filter(b => 
        b.status === 'confirmed' && new Date(b.start_time) > now
      );

      const totalRevenue = completed.reduce((sum, b) => sum + (b.service_price || 0), 0);
      const averageBookingValue = completed.length > 0 ? totalRevenue / completed.length : 0;

      // Top services
      const serviceMap = new Map<string, { count: number; revenue: number }>();
      completed.forEach(booking => {
        const serviceName = booking.service_name || 'Unknown Service';
        const existing = serviceMap.get(serviceName) || { count: 0, revenue: 0 };
        serviceMap.set(serviceName, {
          count: existing.count + 1,
          revenue: existing.revenue + (booking.service_price || 0),
        });
      });

      const topServices = Array.from(serviceMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Revenue by month
      const monthMap = new Map<string, number>();
      completed.forEach(booking => {
        const month = new Date(booking.start_time).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        });
        monthMap.set(month, (monthMap.get(month) || 0) + (booking.service_price || 0));
      });

      const revenueByMonth = Array.from(monthMap.entries())
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-6);

      setAnalytics({
        totalRevenue,
        totalBookings: bookings.length,
        completedBookings: completed.length,
        cancelledBookings: cancelled.length,
        averageBookingValue,
        topServices,
        revenueByMonth,
        upcomingBookings: upcoming.length,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f25842" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="analytics" size={32} color="#f25842" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Business Analytics</Text>
          <Text style={styles.subtitle}>Track your performance</Text>
        </View>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['week', 'month', 'year'] as const).map((range) => (
          <Pressable
            key={range}
            style={[
              styles.timeRangeButton,
              timeRange === range && styles.timeRangeButtonActive,
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text
              style={[
                styles.timeRangeText,
                timeRange === range && styles.timeRangeTextActive,
              ]}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: '#f0fdf4' }]}>
          <Ionicons name="cash" size={20} color="#10b981" />
          <Text style={styles.metricValue}>{formatCurrency(analytics.totalRevenue, userCurrency)}</Text>
          <Text style={styles.metricLabel}>Total Revenue</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: '#eff6ff' }]}>
          <Ionicons name="calendar" size={20} color="#3b82f6" />
          <Text style={styles.metricValue}>{analytics.totalBookings}</Text>
          <Text style={styles.metricLabel}>Total Bookings</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: '#fef3c7' }]}>
          <Ionicons name="checkmark-circle" size={20} color="#f59e0b" />
          <Text style={styles.metricValue}>{analytics.completedBookings}</Text>
          <Text style={styles.metricLabel}>Completed</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: '#fef2f2' }]}>
          <Ionicons name="time" size={20} color="#f25842" />
          <Text style={styles.metricValue}>{analytics.upcomingBookings}</Text>
          <Text style={styles.metricLabel}>Upcoming</Text>
        </View>
      </View>

      {/* Average Booking Value */}
      <View style={styles.avgCard}>
        <View style={styles.avgHeader}>
          <Ionicons name="trending-up" size={20} color="#6b7280" />
          <Text style={styles.avgLabel}>Average Booking Value</Text>
        </View>
        <Text style={styles.avgValue}>{formatCurrency(analytics.averageBookingValue, userCurrency)}</Text>
      </View>

      {/* Top Services */}
      {analytics.topServices.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Services</Text>
          {analytics.topServices.map((service, index) => (
            <View key={index} style={styles.serviceCard}>
              <View style={styles.serviceRank}>
                <Text style={styles.serviceRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceStats}>
                  {service.count} booking{service.count !== 1 ? 's' : ''} • {formatCurrency(service.revenue, userCurrency)}
                </Text>
              </View>
              <View style={styles.serviceRevenue}>
                <Text style={styles.serviceRevenueText}>{formatCurrency(service.revenue, userCurrency)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Revenue Trend */}
      {analytics.revenueByMonth.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Trend</Text>
          <View style={styles.chartContainer}>
            {analytics.revenueByMonth.map((item, index) => {
              const maxRevenue = Math.max(...analytics.revenueByMonth.map(m => m.revenue));
              const height = (item.revenue / maxRevenue) * 120;
              
              return (
                <View key={index} style={styles.chartBar}>
                  <Text style={styles.chartValue}>{formatCurrency(item.revenue, userCurrency)}</Text>
                  <View style={[styles.bar, { height: Math.max(height, 20) }]} />
                  <Text style={styles.chartLabel}>{item.month}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Performance Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Performance Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Completion Rate</Text>
          <Text style={styles.summaryValue}>
            {analytics.totalBookings > 0
              ? ((analytics.completedBookings / analytics.totalBookings) * 100).toFixed(1)
              : 0}%
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Cancellation Rate</Text>
          <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
            {analytics.totalBookings > 0
              ? ((analytics.cancelledBookings / analytics.totalBookings) * 100).toFixed(1)
              : 0}%
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

import { Pressable } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  timeRangeTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 3,
    textAlign: 'center',
  },
  avgCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avgLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  avgValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f25842',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f25842',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  serviceStats: {
    fontSize: 12,
    color: '#6b7280',
  },
  serviceRevenue: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderRadius: 6,
  },
  serviceRevenueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f25842',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 24,
    backgroundColor: '#f25842',
    borderRadius: 4,
    marginVertical: 8,
  },
  chartValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#3b82f6',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
  },
});

