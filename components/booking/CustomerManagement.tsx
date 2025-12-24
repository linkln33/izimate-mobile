/**
 * Customer Management
 * View and manage customer list, booking history, and notes
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface CustomerManagementProps {
  userId: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalBookings: number;
  completedBookings: number;
  totalSpent: number;
  lastBooking?: string;
  isGuest: boolean;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  userId,
}) => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'bookings' | 'spent'>('name');

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterAndSortCustomers();
  }, [customers, searchQuery, sortBy]);

  const loadCustomers = async () => {
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

      // Get all bookings for this provider
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('provider_id', providerProfile.id);

      if (error) throw error;

      if (!bookings || bookings.length === 0) {
        setCustomers([]);
        setFilteredCustomers([]);
        setLoading(false);
        return;
      }

      // Group bookings by customer
      const customerMap = new Map<string, {
        id: string;
        name: string;
        email?: string;
        phone?: string;
        bookings: any[];
        isGuest: boolean;
      }>();

      // Process regular customer bookings
      const regularBookings = bookings.filter(b => b.customer_id && !b.guest_booking);
      for (const booking of regularBookings) {
        if (!booking.customer_id) continue;

        if (!customerMap.has(booking.customer_id)) {
          // Fetch customer details
          const { data: customer } = await supabase
            .from('users')
            .select('id, name, email, phone')
            .eq('id', booking.customer_id)
            .single();

          if (customer) {
            customerMap.set(customer.id, {
              id: customer.id,
              name: customer.name || 'Unknown',
              email: customer.email,
              phone: customer.phone,
              bookings: [],
              isGuest: false,
            });
          }
        }

        const customerData = customerMap.get(booking.customer_id);
        if (customerData) {
          customerData.bookings.push(booking);
        }
      }

      // Process guest bookings
      const guestBookings = bookings.filter(b => b.guest_customer_id);
      for (const booking of guestBookings) {
        if (!booking.guest_customer_id) continue;

        if (!customerMap.has(booking.guest_customer_id)) {
          // Fetch guest details
          const { data: guest } = await supabase
            .from('guest_users')
            .select('id, name, email, phone')
            .eq('id', booking.guest_customer_id)
            .single();

          if (guest) {
            customerMap.set(guest.id, {
              id: guest.id,
              name: guest.name || 'Guest Customer',
              email: guest.email,
              phone: guest.phone,
              bookings: [],
              isGuest: true,
            });
          }
        }

        const guestData = customerMap.get(booking.guest_customer_id);
        if (guestData) {
          guestData.bookings.push(booking);
        }
      }

      // Calculate customer stats
      const customersArray: Customer[] = Array.from(customerMap.values()).map(customer => {
        const completedBookings = customer.bookings.filter(b => b.status === 'completed');
        const totalSpent = completedBookings.reduce((sum, b) => sum + (b.service_price || 0), 0);
        const sortedBookings = customer.bookings.sort((a, b) => 
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );
        const lastBooking = sortedBookings[0]?.start_time;

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          totalBookings: customer.bookings.length,
          completedBookings: completedBookings.length,
          totalSpent,
          lastBooking,
          isGuest: customer.isGuest,
        };
      });

      setCustomers(customersArray);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Error', 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCustomers = () => {
    let filtered = [...customers];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.includes(query)
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'bookings':
          return b.totalBookings - a.totalBookings;
        case 'spent':
          return b.totalSpent - a.totalSpent;
        default:
          return 0;
      }
    });

    setFilteredCustomers(filtered);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f25842" />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="people" size={32} color="#f25842" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Customers</Text>
          <Text style={styles.subtitle}>{customers.length} total customers</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search customers..."
          placeholderTextColor="#9ca3af"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </Pressable>
        )}
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['name', 'bookings', 'spent'] as const).map((option) => (
            <Pressable
              key={option}
              style={[
                styles.sortButton,
                sortBy === option && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy(option)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === option && styles.sortButtonTextActive,
                ]}
              >
                {option === 'name' && 'Name'}
                {option === 'bookings' && 'Bookings'}
                {option === 'spent' && 'Total Spent'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Customer List */}
      <ScrollView style={styles.customerList} contentContainerStyle={styles.customerListContent}>
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </Text>
          </View>
        ) : (
          filteredCustomers.map((customer) => (
            <View key={customer.id} style={styles.customerCard}>
              <View style={styles.customerAvatar}>
                <Ionicons name="person" size={24} color="#f25842" />
              </View>
              
              <View style={styles.customerInfo}>
                <View style={styles.customerNameRow}>
                  <Text style={styles.customerName}>{customer.name}</Text>
                  {customer.isGuest && (
                    <View style={styles.guestBadge}>
                      <Text style={styles.guestBadgeText}>Guest</Text>
                    </View>
                  )}
                </View>
                
                {customer.email && (
                  <View style={styles.customerDetail}>
                    <Ionicons name="mail" size={14} color="#6b7280" />
                    <Text style={styles.customerDetailText}>{customer.email}</Text>
                  </View>
                )}
                
                {customer.phone && (
                  <View style={styles.customerDetail}>
                    <Ionicons name="call" size={14} color="#6b7280" />
                    <Text style={styles.customerDetailText}>{customer.phone}</Text>
                  </View>
                )}

                <View style={styles.customerStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="calendar" size={16} color="#6b7280" />
                    <Text style={styles.statText}>{customer.totalBookings} bookings</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="cash" size={16} color="#10b981" />
                    <Text style={styles.statText}>£{customer.totalSpent.toFixed(2)}</Text>
                  </View>
                </View>

                {customer.lastBooking && (
                  <Text style={styles.lastBooking}>
                    Last booking: {new Date(customer.lastBooking).toLocaleDateString()}
                  </Text>
                )}
              </View>

              <Pressable
                style={styles.actionButton}
                onPress={() => {
                  Alert.alert(
                    customer.name,
                    `Total Bookings: ${customer.totalBookings}\nCompleted: ${customer.completedBookings}\nTotal Spent: £${customer.totalSpent.toFixed(2)}`,
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      {/* Stats Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{customers.length}</Text>
          <Text style={styles.summaryLabel}>Total Customers</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {customers.filter(c => !c.isGuest).length}
          </Text>
          <Text style={styles.summaryLabel}>Registered</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {customers.filter(c => c.isGuest).length}
          </Text>
          <Text style={styles.summaryLabel}>Guests</Text>
        </View>
      </View>
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
    padding: 16,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#f25842',
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  sortButtonTextActive: {
    color: '#f25842',
  },
  customerList: {
    flex: 1,
  },
  customerListContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  customerCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  guestBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  guestBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f59e0b',
  },
  customerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  customerDetailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  customerStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  lastBooking: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  actionButton: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f25842',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
});

