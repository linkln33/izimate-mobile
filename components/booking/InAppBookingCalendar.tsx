/**
 * @deprecated This component has been replaced by UnifiedCalendar
 * Please use: import { UnifiedCalendar } from '../calendar'
 * 
 * Migration: Replace with <UnifiedCalendar mode="booking" utility="getAvailableTimeSlots" ... />
 * All features are preserved in the unified component.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getAvailableTimeSlots, type TimeSlot } from '@/lib/utils/booking-slots';
import { getCurrencySymbol } from '@/lib/utils/currency';
import type { Listing, User } from '@/lib/types';

const { width } = Dimensions.get('window');
const CALENDAR_WIDTH = width - 40;
const DAY_WIDTH = CALENDAR_WIDTH / 7;

// TimeSlot interface now imported from booking-slots utility

interface InAppBookingCalendarProps {
  listing: Listing;
  provider: User;
  onBookingSelect: (selection: {
    date: string;
    time: string;
    serviceName: string;
    servicePrice: number;
    currency?: string;
    durationMinutes: number;
  }) => void;
  onClose: () => void;
}

export const InAppBookingCalendar: React.FC<InAppBookingCalendarProps> = ({
  listing,
  provider,
  onBookingSelect,
  onClose,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [selectedService, setSelectedService] = useState<{id: string; serviceName: string; price: string} | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isPast = date < today;
      const isToday = date.toDateString() === today.toDateString();
      const dateString = date.toISOString().split('T')[0];
      
      days.push({
        date: date.getDate(),
        dateString,
        isCurrentMonth,
        isPast,
        isToday,
        isSelected: selectedDate === dateString,
      });
    }
    
    return days;
  };

  const loadAvailableSlots = async (dateString: string) => {
    setLoading(true);
    try {
      const slots = await getAvailableTimeSlots(listing.id, dateString);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading slots:', error);
      Alert.alert('Error', 'Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (dateString: string, isPast: boolean) => {
    if (isPast) return;
    
    setSelectedDate(dateString);
    setShowTimeSlots(true);
    loadAvailableSlots(dateString);
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (!slot.isAvailable || !selectedDate) return;
    
    // Set selected slot for visual feedback
    setSelectedSlot(slot)
    
    // For price_list type, require service selection
    if (listing.budget_type === 'price_list' && listing.price_list && listing.price_list.length > 0) {
      if (!selectedService) {
        Alert.alert('Select Service', 'Please select a service from the price list first.');
        setSelectedSlot(null)
        return;
      }
      
      onBookingSelect({
        date: selectedDate,
        time: slot.start,
        serviceName: selectedService.serviceName,
        servicePrice: parseFloat(selectedService.price),
        currency: listing.currency || 'GBP',
        durationMinutes: slot.duration || 60,
      });
    } else {
      // For fixed or range pricing
      let servicePrice = 0;
      if (listing.budget_type === 'fixed' && listing.budget_min) {
        servicePrice = listing.budget_min;
      } else if (listing.budget_type === 'range' && listing.budget_min) {
        servicePrice = listing.budget_min;
      } else if (slot.price) {
        servicePrice = slot.price;
      }
      
      onBookingSelect({
        date: selectedDate,
        time: slot.start,
        serviceName: slot.serviceName || listing.service_name || listing.title,
        servicePrice: servicePrice,
        currency: listing.currency || 'GBP',
        durationMinutes: slot.duration || 60,
      });
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
    setSelectedDate(null);
    setShowTimeSlots(false);
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#374151" />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Book {listing.title}</Text>
          <Text style={styles.subtitle}>with {provider.name}</Text>
        </View>
      </View>

      {/* Calendar Navigation */}
      <View style={styles.calendarHeader}>
        <Pressable onPress={() => navigateMonth('prev')} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color="#374151" />
        </Pressable>
        <Text style={styles.monthYear}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Text>
        <Pressable onPress={() => navigateMonth('next')} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color="#374151" />
        </Pressable>
      </View>

      {/* Day Names */}
      <View style={styles.dayNamesRow}>
        {dayNames.map((day) => (
          <View key={day} style={styles.dayNameCell}>
            <Text style={styles.dayNameText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => (
          <Pressable
            key={index}
            style={[
              styles.dayCell,
              !day.isCurrentMonth && styles.dayCellInactive,
              day.isPast && styles.dayCellPast,
              day.isToday && styles.dayCellToday,
              day.isSelected && styles.dayCellSelected,
            ]}
            onPress={() => handleDateSelect(day.dateString, day.isPast)}
            disabled={day.isPast}
          >
            <Text
              style={[
                styles.dayText,
                !day.isCurrentMonth && styles.dayTextInactive,
                day.isPast && styles.dayTextPast,
                day.isToday && styles.dayTextToday,
                day.isSelected && styles.dayTextSelected,
              ]}
            >
              {day.date}
            </Text>
            {day.isSelected && <View style={styles.selectedIndicator} />}
          </Pressable>
        ))}
      </View>

      {/* Service Selection for Price List */}
      {showTimeSlots && listing.budget_type === 'price_list' && listing.price_list && listing.price_list.length > 0 && (
        <View style={styles.serviceSelectionContainer}>
          <Text style={styles.serviceSelectionTitle}>Select Service</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.serviceList}
          >
            {listing.price_list.map((service) => (
              <Pressable
                key={service.id}
                style={[
                  styles.serviceOption,
                  selectedService?.id === service.id && styles.serviceOptionSelected,
                ]}
                onPress={() => setSelectedService(service)}
              >
                <Text
                  style={[
                    styles.serviceOptionName,
                    selectedService?.id === service.id && styles.serviceOptionNameSelected,
                  ]}
                >
                  {service.serviceName}
                </Text>
                <Text
                  style={[
                    styles.serviceOptionPrice,
                    selectedService?.id === service.id && styles.serviceOptionPriceSelected,
                  ]}
                >
                  {listing.currency ? getCurrencySymbol(listing.currency) : '£'}{service.price}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Time Slots */}
      {showTimeSlots && selectedDate && (
        <View style={styles.timeSlotsContainer}>
          <Text style={styles.timeSlotsTitle}>
            Available Times - {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
          {listing.budget_type === 'price_list' && !selectedService && (
            <Text style={styles.serviceSelectionHint}>
              Please select a service above to see available times
            </Text>
          )}
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#f25842" />
              <Text style={styles.loadingText}>Loading available times...</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeSlotsScroll}
            >
              {availableSlots.map((slot) => (
                <Pressable
                  key={slot.id}
                  style={[
                    styles.timeSlot,
                    !slot.isAvailable && styles.timeSlotUnavailable,
                    listing.budget_type === 'price_list' && !selectedService && styles.timeSlotDisabled,
                    selectedSlot?.id === slot.id && styles.timeSlotSelected,
                  ]}
                  onPress={() => handleTimeSlotSelect(slot)}
                  disabled={!slot.isAvailable || (listing.budget_type === 'price_list' && !selectedService)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      !slot.isAvailable && styles.timeSlotTextUnavailable,
                      selectedSlot?.id === slot.id && styles.timeSlotTextSelected,
                    ]}
                  >
                    {slot.start}
                  </Text>
                  {slot.price && listing.budget_type !== 'price_list' && (
                    <Text
                      style={[
                        styles.timeSlotPrice,
                        !slot.isAvailable && styles.timeSlotPriceUnavailable,
                      ]}
                    >
                      {listing.currency ? getCurrencySymbol(listing.currency) : '£'}{slot.price}
                    </Text>
                  )}
                  {!slot.isAvailable && (
                    <View style={styles.unavailableOverlay}>
                      <Text style={styles.unavailableText}>Booked</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Instructions */}
      {!showTimeSlots && (
        <View style={styles.instructionsContainer}>
          <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
          <Text style={styles.instructionsTitle}>Select a Date</Text>
          <Text style={styles.instructionsText}>
            Tap on any available date to see booking times
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  dayNamesRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  dayNameCell: {
    width: DAY_WIDTH,
    alignItems: 'center',
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  dayCell: {
    width: DAY_WIDTH,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCellInactive: {
    opacity: 0.3,
  },
  dayCellPast: {
    opacity: 0.4,
  },
  dayCellToday: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: '#f25842',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dayTextInactive: {
    color: '#9ca3af',
  },
  dayTextPast: {
    color: '#d1d5db',
  },
  dayTextToday: {
    color: '#92400e',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  timeSlotsContainer: {
    flex: 1,
    padding: 20,
  },
  timeSlotsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6b7280',
  },
  timeSlotsScroll: {
    paddingBottom: 20,
  },
  timeSlot: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    width: 70,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timeSlotUnavailable: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    opacity: 0.5,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
  },
  timeSlotTextUnavailable: {
    color: '#6b7280',
  },
  timeSlotPrice: {
    fontSize: 10,
    color: '#f25842',
    marginTop: 2,
    fontWeight: '500',
  },
  timeSlotPriceUnavailable: {
    color: '#d1d5db',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: {
    fontSize: 10,
    color: '#ef4444',
    fontWeight: '600',
  },
  instructionsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  serviceSelectionContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  serviceSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  serviceSelectionHint: {
    fontSize: 14,
    color: '#f25842',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  serviceList: {
    paddingBottom: 8,
  },
  serviceOption: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  serviceOptionSelected: {
    borderColor: '#f25842',
    backgroundColor: '#fef2f2',
  },
  serviceOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  serviceOptionNameSelected: {
    color: '#f25842',
  },
  serviceOptionPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  serviceOptionPriceSelected: {
    color: '#f25842',
  },
  timeSlotDisabled: {
    opacity: 0.5,
  },
  timeSlotSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  timeSlotTextSelected: {
    color: '#ffffff',
  },
});
