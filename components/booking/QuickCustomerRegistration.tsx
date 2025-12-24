/**
 * Quick Customer Registration
 * Fast registration form for walk-in customers (e.g., "George, Hair, 24.12.2025, 13h")
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import type { Listing } from '@/lib/types';

interface QuickCustomerRegistrationProps {
  userId: string;
}

export const QuickCustomerRegistration: React.FC<QuickCustomerRegistrationProps> = ({
  userId,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    loadUserListings();
    setDefaultDateTime();
  }, []);

  const setDefaultDateTime = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setDate(dateStr);
    setTime(`${hours}:${minutes}`);
  };

  const loadUserListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('booking_enabled', true)
        .limit(20);

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error loading listings:', error);
    }
  };

  const handleQuickRegister = async () => {
    console.log('=== Quick Register Started ===');
    console.log('Customer Name:', customerName);
    console.log('Service Name:', serviceName);
    console.log('Date:', date);
    console.log('Time:', time);
    
    // Validation
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }
    if (!serviceName.trim()) {
      Alert.alert('Error', 'Please enter service name');
      return;
    }
    if (!date) {
      Alert.alert('Error', 'Please select a date');
      return;
    }
    if (!time) {
      Alert.alert('Error', 'Please select a time');
      return;
    }

    console.log('Validation passed, proceeding...');
    setLoading(true);
    
    try {
      // Create datetime for booking
      const startDateTime = new Date(`${date}T${time}:00`);
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + parseInt(duration));

      console.log('Start Time:', startDateTime.toISOString());
      console.log('End Time:', endDateTime.toISOString());

      // Get provider profile ID
      console.log('Fetching provider profile for userId:', userId);
      const { data: providerProfile, error: profileError } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      console.log('Provider Profile:', providerProfile);
      console.log('Profile Error:', profileError);

      if (profileError || !providerProfile) {
        console.error('Provider profile error:', profileError);
        Alert.alert('Error', 'Provider profile not found. Please contact support.');
        return;
      }

      console.log('Provider Profile ID:', providerProfile.id);

      // Create or get guest user
      let guestUserId: string | null = null;

      if (customerEmail) {
        console.log('Checking for existing guest user with email:', customerEmail);
        // Check if guest user exists
        const { data: existingGuest } = await supabase
          .from('guest_users')
          .select('id')
          .eq('email', customerEmail.toLowerCase().trim())
          .single();

        if (existingGuest) {
          console.log('Found existing guest user:', existingGuest.id);
          guestUserId = existingGuest.id;
          
          // Update guest user info
          await supabase
            .from('guest_users')
            .update({
              name: customerName.trim(),
              phone: customerPhone.trim() || null,
            })
            .eq('id', guestUserId);
        } else {
          console.log('Creating new guest user');
          // Create new guest user
          const { data: newGuest, error: guestError } = await supabase
            .from('guest_users')
            .insert({
              name: customerName.trim(),
              email: customerEmail.toLowerCase().trim(),
              phone: customerPhone.trim() || null,
            })
            .select()
            .single();

          if (guestError) {
            console.error('Guest creation error:', guestError);
            throw guestError;
          }
          console.log('Created guest user:', newGuest.id);
          guestUserId = newGuest.id;
        }
      }

      // Create booking
      const bookingData: any = {
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        provider_id: providerProfile.id,
        service_name: serviceName.trim(),
        service_price: price ? parseFloat(price) : null,
        currency: 'GBP',
        duration_minutes: parseInt(duration),
        provider_notes: notes.trim() || null,
        status: 'confirmed',
        guest_booking: !guestUserId,
      };

      if (guestUserId) {
        bookingData.guest_customer_id = guestUserId;
      }

      console.log('Creating booking with data:', bookingData);

      const { data: createdBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select();

      console.log('Created booking:', createdBooking);
      console.log('Booking error:', bookingError);

      if (bookingError) {
        console.error('Booking creation error:', bookingError);
        throw bookingError;
      }

      console.log('=== Booking Created Successfully ===');

      Alert.alert(
        'Success!',
        `Booking created for ${customerName} on ${date} at ${time}`,
        [
          {
            text: 'Create Another',
            onPress: () => {
              setCustomerName('');
              setCustomerPhone('');
              setCustomerEmail('');
              setServiceName('');
              setPrice('');
              setNotes('');
              setDefaultDateTime();
            },
          },
          {
            text: 'Done',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert('Error', `Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const selectService = (listing: Listing) => {
    setServiceName(listing.title);
    if (listing.budget_min) {
      setPrice(listing.budget_min.toString());
    }
    if (listing.default_duration_minutes) {
      setDuration(listing.default_duration_minutes.toString());
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="flash" size={32} color="#f25842" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Quick Register</Text>
          <Text style={styles.subtitle}>Fast booking for walk-in customers</Text>
        </View>
      </View>

      {/* Quick Services */}
      {listings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Select Service</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.servicesScroll}
          >
            {listings.map((listing) => (
              <Pressable
                key={listing.id}
                style={[
                  styles.serviceChip,
                  serviceName === listing.title && styles.serviceChipActive,
                ]}
                onPress={() => selectService(listing)}
              >
                <Text
                  style={[
                    styles.serviceChipText,
                    serviceName === listing.title && styles.serviceChipTextActive,
                  ]}
                >
                  {listing.title}
                </Text>
                {listing.budget_min && (
                  <Text
                    style={[
                      styles.serviceChipPrice,
                      serviceName === listing.title && styles.serviceChipPriceActive,
                    ]}
                  >
                    £{listing.budget_min}
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Customer Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="e.g., George"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone (Optional)</Text>
          <TextInput
            style={styles.input}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="+44 7XXX XXXXXX"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email (Optional)</Text>
          <TextInput
            style={styles.input}
            value={customerEmail}
            onChangeText={setCustomerEmail}
            placeholder="customer@email.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Booking Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service *</Text>
          <TextInput
            style={styles.input}
            value={serviceName}
            onChangeText={setServiceName}
            placeholder="e.g., Hair Cut"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Date *</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
            <Text style={styles.label}>Time *</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="13:00"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Duration (min)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="60"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
            <Text style={styles.label}>Price (£)</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Special requests, preferences..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Create Button */}
      <Pressable
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={handleQuickRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
            <Text style={styles.createButtonText}>Create Booking</Text>
          </>
        )}
      </Pressable>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color="#3b82f6" />
        <Text style={styles.infoBannerText}>
          Customers can be registered quickly without an app account. They'll receive booking confirmations via email if provided.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  servicesScroll: {
    marginHorizontal: -4,
  },
  serviceChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceChipActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#f25842',
  },
  serviceChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  serviceChipTextActive: {
    color: '#f25842',
  },
  serviceChipPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  serviceChipPriceActive: {
    color: '#f25842',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#f25842',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});

