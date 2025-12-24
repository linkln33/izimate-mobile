/**
 * Step 5: Simplified Booking Setup
 * 
 * Simple, intuitive booking configuration:
 * 1. Text input for service name/description
 * 2. Interactive calendar to create custom time slots
 * 3. Visual slot management with drag-to-create
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, startOfWeek, addWeeks, isSameDay } from 'date-fns';

interface TimeSlot {
  id: string;
  day: string; // Day of week (monday, tuesday, etc.)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  service?: string; // Optional: pre-assigned service
  notes?: string; // Optional: notes (e.g., "Lunch break", "Personal appointment")
  isBlocked?: boolean; // If true, slot is blocked/unavailable
}

interface Step5BookingSimplifiedProps {
  formData: any;
  onUpdate: (data: any) => void;
  isLoading?: boolean;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const Step5BookingSimplified: React.FC<Step5BookingSimplifiedProps> = ({
  formData,
  onUpdate,
  isLoading = false,
}) => {
  const [bookingEnabled, setBookingEnabled] = useState(formData.booking_enabled || false);
  const [serviceName, setServiceName] = useState(formData.service_name || '');
  const [defaultPrice, setDefaultPrice] = useState(formData.default_price?.toString() || '');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(formData.time_slots || []);
  
  // Calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Update parent whenever data changes
  useEffect(() => {
    onUpdate({
      booking_enabled: bookingEnabled,
      service_name: serviceName,
      default_price: defaultPrice ? parseFloat(defaultPrice) : null,
      time_slots: timeSlots,
    });
  }, [bookingEnabled, serviceName, defaultPrice, timeSlots]);

  // Expose validation function for parent
  useEffect(() => {
    (window as any).validateStep5Booking = async () => {
      if (bookingEnabled) {
        if (!serviceName.trim()) {
          alert('Please enter a service name');
          return false;
        }
        if (timeSlots.length === 0) {
          alert('Please create at least one time slot');
          return false;
        }
      }
      return true;
    };
    return () => {
      delete (window as any).validateStep5Booking;
    };
  }, [bookingEnabled, serviceName, timeSlots]);

  const handleDaySelect = (day: string) => {
    setSelectedDay(day);
    setShowCalendar(true);
  };

  const handleHourPress = (hour: number) => {
    if (!selectedDay) return;

    // Check if this hour already has a slot
    const existingSlot = timeSlots.find(slot => 
      slot.day === selectedDay &&
      parseInt(slot.startTime.split(':')[0]) === hour
    );

    if (existingSlot) {
      // Remove existing slot
      setTimeSlots(timeSlots.filter(s => s.id !== existingSlot.id));
    } else {
      // Create new 1-hour slot immediately
      const newSlot: TimeSlot = {
        id: `${selectedDay}-${Date.now()}`,
        day: selectedDay,
        startTime: `${hour.toString().padStart(2, '0')}:00`,
        endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
      };

      setTimeSlots([...timeSlots, newSlot]);
    }
  };

  const handleDeleteSlot = (slotId: string) => {
    setTimeSlots(timeSlots.filter(slot => slot.id !== slotId));
  };

  const getSlotsForDay = (day: string) => {
    return timeSlots.filter(slot => slot.day === day);
  };

  const isHourInSlot = (day: string, hour: number) => {
    const slots = getSlotsForDay(day);
    return slots.some(slot => {
      const start = parseInt(slot.startTime.split(':')[0]);
      const end = parseInt(slot.endTime.split(':')[0]);
      return hour >= start && hour < end;
    });
  };

  const renderDaySchedule = () => {
    if (!selectedDay) return null;

    const slots = getSlotsForDay(selectedDay);
    const dayLabel = DAYS_OF_WEEK.find(d => d.key === selectedDay)?.label;

    // Group hours into rows of 3
    const hourRows: number[][] = [];
    for (let i = 0; i < HOURS.length; i += 3) {
      hourRows.push(HOURS.slice(i, i + 3));
    }

    return (
      <Modal
        visible={showCalendar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{dayLabel}</Text>
              <Pressable onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={28} color="#1a1a1a" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Click any hour to add a 1-hour slot, click again to remove
            </Text>

            {/* Hourly Grid - 3 per row */}
            <ScrollView style={styles.hourlyGrid}>
              {hourRows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.hourRow}>
                  {row.map(hour => {
                    const isInSlot = isHourInSlot(selectedDay, hour);

                    return (
                      <Pressable
                        key={hour}
                        style={[
                          styles.hourBlockCompact,
                          isInSlot && styles.hourBlockBooked,
                        ]}
                        onPress={() => handleHourPress(hour)}
                      >
                        <Text style={[
                          styles.hourTextCompact,
                          isInSlot && styles.hourTextActive
                        ]}>
                          {hour.toString().padStart(2, '0')}:00
                        </Text>
                        {isInSlot && (
                          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            {/* Existing Slots List - Editable */}
            {slots.length > 0 && (
              <View style={styles.slotsList}>
                <Text style={styles.slotsListTitle}>Available Time Slots</Text>
                <Text style={styles.slotsListHelp}>
                  Add service and notes to block specific slots or leave empty for customer booking
                </Text>
                <ScrollView 
                  style={styles.slotsScrollView}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {slots.map(slot => (
                    <View key={slot.id} style={styles.slotItemEditable}>
                      {/* Time Inputs */}
                      <View style={styles.slotTimeRow}>
                        <View style={styles.slotTimeInputs}>
                          <TextInput
                            style={styles.timeInput}
                            value={slot.startTime}
                            onChangeText={(value) => {
                              const updatedSlots = timeSlots.map(s => 
                                s.id === slot.id ? { ...s, startTime: value } : s
                              );
                              setTimeSlots(updatedSlots);
                            }}
                            placeholder="09:00"
                          />
                          <Text style={styles.timeSeparator}>-</Text>
                          <TextInput
                            style={styles.timeInput}
                            value={slot.endTime}
                            onChangeText={(value) => {
                              const updatedSlots = timeSlots.map(s => 
                                s.id === slot.id ? { ...s, endTime: value } : s
                              );
                              setTimeSlots(updatedSlots);
                            }}
                            placeholder="17:00"
                          />
                        </View>
                        <Pressable 
                          style={styles.deleteButton}
                          onPress={() => handleDeleteSlot(slot.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </Pressable>
                      </View>

                      {/* Service Input */}
                      <TextInput
                        style={styles.slotServiceInput}
                        value={slot.service || ''}
                        onChangeText={(value) => {
                          const updatedSlots = timeSlots.map(s => 
                            s.id === slot.id ? { ...s, service: value, isBlocked: !!value } : s
                          );
                          setTimeSlots(updatedSlots);
                        }}
                        placeholder="Service (optional) - e.g., Lunch Break, Personal..."
                        placeholderTextColor="#9ca3af"
                      />

                      {/* Notes Input */}
                      <TextInput
                        style={styles.slotNotesInput}
                        value={slot.notes || ''}
                        onChangeText={(value) => {
                          const updatedSlots = timeSlots.map(s => 
                            s.id === slot.id ? { ...s, notes: value } : s
                          );
                          setTimeSlots(updatedSlots);
                        }}
                        placeholder="Notes (optional) - e.g., Don't disturb..."
                        placeholderTextColor="#9ca3af"
                      />

                      {/* Blocked Indicator */}
                      {slot.isBlocked && (
                        <View style={styles.blockedIndicator}>
                          <Ionicons name="lock-closed" size={12} color="#ef4444" />
                          <Text style={styles.blockedText}>Blocked - Not available for booking</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Apply Button */}
            <Pressable
              style={styles.applyButton}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.applyButtonText}>Apply Changes</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Booking Setup</Text>
        <Text style={styles.subtitle}>
          Set up your availability for customers to book directly
        </Text>

        {/* Enable Booking Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Enable Online Booking</Text>
              <Text style={styles.toggleSubtitle}>
                Let customers book appointments with you
              </Text>
            </View>
            <Switch
              value={bookingEnabled}
              onValueChange={setBookingEnabled}
              trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
              thumbColor={bookingEnabled ? '#ffffff' : '#f3f4f6'}
            />
          </View>
        </View>

        {bookingEnabled && (
          <>
            {/* Service Name */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What service do you provide?</Text>
              <TextInput
                style={styles.serviceInput}
                value={serviceName}
                onChangeText={setServiceName}
                placeholder="e.g., Haircut, Manicure, Massage Therapy..."
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.inputHelp}>
                Describe the service you offer in a few words
              </Text>
            </View>

            {/* Default Price */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Default Price (£)</Text>
              <TextInput
                style={styles.priceInput}
                value={defaultPrice}
                onChangeText={setDefaultPrice}
                placeholder="50"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.inputHelp}>
                Starting price for your service (can be customized per slot)
              </Text>
            </View>

            {/* Weekly Calendar */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Set Your Available Time Slots</Text>
              <Text style={styles.sectionSubtitle}>
                Tap any day to create your custom schedule
              </Text>

              <View style={styles.weekGrid}>
                {DAYS_OF_WEEK.map(day => {
                  const daySlots = getSlotsForDay(day.key);
                  const totalSlots = daySlots.length;

                  return (
                    <Pressable
                      key={day.key}
                      style={[
                        styles.dayCard,
                        totalSlots > 0 && styles.dayCardActive
                      ]}
                      onPress={() => handleDaySelect(day.key)}
                    >
                      <Text style={[
                        styles.dayLabel,
                        totalSlots > 0 && styles.dayLabelActive
                      ]}>
                        {day.short}
                      </Text>
                      <Text style={styles.dayName}>{day.label}</Text>
                      {totalSlots > 0 ? (
                        <>
                          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                          <Text style={styles.slotsCount}>{totalSlots} slots</Text>
                        </>
                      ) : (
                        <Ionicons name="add-circle-outline" size={24} color="#9ca3af" />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Summary */}
              {timeSlots.length > 0 && (
                <View style={styles.summary}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="calendar" size={20} color="#3b82f6" />
                    <Text style={styles.summaryText}>
                      {timeSlots.length} total time slots created
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Ionicons name="time" size={20} color="#3b82f6" />
                    <Text style={styles.summaryText}>
                      Across {new Set(timeSlots.map(s => s.day)).size} days
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Day Schedule Modal */}
      {renderDaySchedule()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  serviceInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  priceInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  inputHelp: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8,
  },
  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  dayCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  dayCardActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  dayLabelActive: {
    color: '#10b981',
  },
  dayName: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  slotsCount: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
    marginTop: 4,
  },
  summary: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  hourlyGrid: {
    maxHeight: 400,
  },
  hourRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  hourBlockCompact: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    minHeight: 60,
  },
  hourBlockBooked: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  hourBlockSelecting: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  hourBlockStarting: {
    backgroundColor: '#eff6ff',
    borderColor: '#60a5fa',
  },
  hourTextCompact: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  hourTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  slotsList: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  slotsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  slotsListHelp: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  slotsScrollView: {
    maxHeight: 180, // Show approximately 2 rows (90px each)
  },
  slotItemEditable: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  slotTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  slotTimeInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  deleteButton: {
    padding: 8,
  },
  slotServiceInput: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 6,
  },
  slotNotesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 4,
  },
  blockedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  blockedText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#f25842',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

