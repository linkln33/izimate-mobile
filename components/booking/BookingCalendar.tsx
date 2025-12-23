/**
 * BookingCalendar Component
 * Displays available time slots for customers to book appointments
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { slotCalculator, TimeSlot, ServiceOption } from '../../lib/utils/slot-calculator';
import { supabase } from '../../lib/supabase';

interface BookingCalendarProps {
  listingId: string;
  listingTitle: string;
  providerId: string;
  providerName: string;
  visible: boolean;
  onClose: () => void;
  onBookingComplete?: (bookingId: string) => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  listingId,
  listingTitle,
  providerId,
  providerName,
  visible,
  onClose,
  onBookingComplete,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Generate next 30 days for date selection
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        display: date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }),
        isToday: i === 0
      });
    }
    
    return dates;
  };

  const dateOptions = generateDateOptions();

  // Load service options and user data
  useEffect(() => {
    if (visible) {
      loadServiceOptions();
      getCurrentUser();
      
      // Auto-select today's date
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    }
  }, [visible, listingId]);

  // Load slots when date changes
  useEffect(() => {
    if (selectedDate && selectedService) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedService]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadServiceOptions = async () => {
    try {
      const options = await slotCalculator.getServiceOptions(listingId);
      setServiceOptions(options);
      
      // Auto-select first service if only one option
      if (options.length === 1) {
        setSelectedService(options[0]);
      }
    } catch (error) {
      console.error('Failed to load service options:', error);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !selectedService) return;

    setLoading(true);
    try {
      const slots = await slotCalculator.calculateAvailableSlots(
        listingId,
        selectedDate,
        selectedService.duration,
        selectedService.price,
        selectedService.name
      );
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to load available slots:', error);
      Alert.alert('Error', 'Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelection = (slot: TimeSlot) => {
    if (!slot.isAvailable) return;
    
    setSelectedSlot(slot);
    setShowBookingForm(true);
  };

  const handleBooking = async () => {
    if (!selectedSlot || !selectedService || !currentUser) return;

    setBookingLoading(true);
    try {
      const result = await slotCalculator.bookTimeSlot(
        listingId,
        currentUser.id,
        {
          date: selectedDate,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          serviceName: selectedService.name,
          servicePrice: selectedService.price,
          currency: selectedService.currency,
          customerNotes: customerNotes.trim() || undefined,
        }
      );

      if (result.success && result.bookingId) {
        Alert.alert(
          'Booking Requested',
          `Your booking request has been sent to ${providerName}. You'll receive a confirmation shortly.`,
          [
            {
              text: 'OK',
              onPress: () => {
                onBookingComplete?.(result.bookingId!);
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Booking Failed', result.error || 'Unable to complete booking');
      }
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to create booking');
    } finally {
      setBookingLoading(false);
      setShowBookingForm(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const resetState = () => {
    setSelectedDate('');
    setAvailableSlots([]);
    setSelectedSlot(null);
    setSelectedService(null);
    setCustomerNotes('');
    setShowBookingForm(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </Pressable>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Listing Info */}
          <View style={styles.listingInfo}>
            <Text style={styles.listingTitle}>{listingTitle}</Text>
            <Text style={styles.providerName}>with {providerName}</Text>
          </View>

          {/* Service Selection */}
          {serviceOptions.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Service</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {serviceOptions.map((service, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.serviceOption,
                      selectedService?.name === service.name && styles.serviceOptionSelected
                    ]}
                    onPress={() => setSelectedService(service)}
                  >
                    <Text style={[
                      styles.serviceName,
                      selectedService?.name === service.name && styles.serviceNameSelected
                    ]}>
                      {service.name}
                    </Text>
                    <Text style={[
                      styles.serviceDetails,
                      selectedService?.name === service.name && styles.serviceDetailsSelected
                    ]}>
                      {service.duration}min • {formatPrice(service.price, service.currency)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dateOptions.map((option) => (
                <Pressable
                  key={option.date}
                  style={[
                    styles.dateOption,
                    selectedDate === option.date && styles.dateOptionSelected,
                    option.isToday && styles.todayOption
                  ]}
                  onPress={() => setSelectedDate(option.date)}
                >
                  <Text style={[
                    styles.dateText,
                    selectedDate === option.date && styles.dateTextSelected
                  ]}>
                    {option.display}
                  </Text>
                  {option.isToday && (
                    <Text style={styles.todayLabel}>Today</Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Time Slots */}
          {selectedDate && selectedService && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Times</Text>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Loading available times...</Text>
                </View>
              ) : availableSlots.length === 0 ? (
                <View style={styles.noSlotsContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#ccc" />
                  <Text style={styles.noSlotsText}>No available times for this date</Text>
                  <Text style={styles.noSlotsSubtext}>Try selecting a different date</Text>
                </View>
              ) : (
                <View style={styles.slotsGrid}>
                  {availableSlots.map((slot, index) => (
                    <Pressable
                      key={index}
                      style={[
                        styles.timeSlot,
                        !slot.isAvailable && styles.timeSlotUnavailable,
                        selectedSlot === slot && styles.timeSlotSelected
                      ]}
                      onPress={() => handleSlotSelection(slot)}
                      disabled={!slot.isAvailable}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        !slot.isAvailable && styles.timeSlotTextUnavailable,
                        selectedSlot === slot && styles.timeSlotTextSelected
                      ]}>
                        {slot.start}
                      </Text>
                      {!slot.isAvailable && slot.conflictReason && (
                        <Text style={styles.conflictReason} numberOfLines={1}>
                          {slot.conflictReason}
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Booking Form Modal */}
        <Modal
          visible={showBookingForm}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setShowBookingForm(false)}
        >
          <View style={styles.bookingFormContainer}>
            <View style={styles.bookingFormHeader}>
              <Pressable 
                onPress={() => setShowBookingForm(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Text style={styles.bookingFormTitle}>Confirm Booking</Text>
              <Pressable 
                onPress={handleBooking}
                style={[styles.bookButton, bookingLoading && styles.bookButtonDisabled]}
                disabled={bookingLoading}
              >
                {bookingLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.bookButtonText}>Book</Text>
                )}
              </Pressable>
            </View>

            <ScrollView style={styles.bookingFormContent}>
              {selectedSlot && selectedService && (
                <>
                  <View style={styles.bookingSummary}>
                    <Text style={styles.bookingSummaryTitle}>Booking Summary</Text>
                    
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Service:</Text>
                      <Text style={styles.summaryValue}>{selectedService.name}</Text>
                    </View>
                    
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Date:</Text>
                      <Text style={styles.summaryValue}>
                        {new Date(selectedDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                    
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Time:</Text>
                      <Text style={styles.summaryValue}>
                        {selectedSlot.start} - {selectedSlot.end}
                      </Text>
                    </View>
                    
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Duration:</Text>
                      <Text style={styles.summaryValue}>{selectedService.duration} minutes</Text>
                    </View>
                    
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Price:</Text>
                      <Text style={styles.summaryValuePrice}>
                        {formatPrice(selectedService.price, selectedService.currency)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Additional Notes (Optional)</Text>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Any special requests or information for the provider..."
                      value={customerNotes}
                      onChangeText={setCustomerNotes}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.bookingNotice}>
                    <Ionicons name="information-circle" size={20} color="#007AFF" />
                    <Text style={styles.bookingNoticeText}>
                      Your booking request will be sent to {providerName}. You'll receive a confirmation once they approve your request.
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  listingInfo: {
    marginBottom: 30,
    alignItems: 'center' as const,
  },
  listingTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#333',
    textAlign: 'center' as const,
    marginBottom: 5,
  },
  providerName: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 15,
  },
  serviceOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 140,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  serviceOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 4,
  },
  serviceNameSelected: {
    color: 'white',
  },
  serviceDetails: {
    fontSize: 14,
    color: '#666',
  },
  serviceDetailsSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  dateOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  todayOption: {
    borderColor: '#007AFF',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
  },
  dateTextSelected: {
    color: 'white',
  },
  todayLabel: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center' as const,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  noSlotsContainer: {
    alignItems: 'center' as const,
    paddingVertical: 40,
  },
  noSlotsText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#666',
    marginTop: 15,
  },
  noSlotsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  slotsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  timeSlot: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    minWidth: 80,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeSlotSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeSlotUnavailable: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
  },
  timeSlotTextSelected: {
    color: 'white',
  },
  timeSlotTextUnavailable: {
    color: '#999',
  },
  conflictReason: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    textAlign: 'center' as const,
  },
  bookingFormContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  bookingFormHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  bookingFormTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#333',
  },
  bookButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center' as const,
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  bookingFormContent: {
    flex: 1,
    padding: 20,
  },
  bookingSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  bookingSummaryTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#333',
    flex: 1,
    textAlign: 'right' as const,
  },
  summaryValuePrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#007AFF',
  },
  notesSection: {
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 10,
  },
  notesInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
  },
  bookingNotice: {
    flexDirection: 'row' as const,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 15,
    alignItems: 'flex-start' as const,
  },
  bookingNoticeText: {
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
};