/**
 * Step 5: Booking Setup - Configure appointment booking for service listings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { googleCalendar } from '../../../lib/utils/google-calendar';
import { slotCalculator } from '../../../lib/utils/slot-calculator';

interface ServiceOption {
  name: string;
  duration: number; // minutes
  price: number;
  currency: string;
}

interface WorkingDay {
  enabled: boolean;
  start: string; // HH:MM
  end: string; // HH:MM
}

interface WorkingHours {
  monday: WorkingDay;
  tuesday: WorkingDay;
  wednesday: WorkingDay;
  thursday: WorkingDay;
  friday: WorkingDay;
  saturday: WorkingDay;
  sunday: WorkingDay;
}

interface Step5BookingProps {
  formData: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

const defaultWorkingHours: WorkingHours = {
  monday: { enabled: true, start: '09:00', end: '17:00' },
  tuesday: { enabled: true, start: '09:00', end: '17:00' },
  wednesday: { enabled: true, start: '09:00', end: '17:00' },
  thursday: { enabled: true, start: '09:00', end: '17:00' },
  friday: { enabled: true, start: '09:00', end: '17:00' },
  saturday: { enabled: false, start: '09:00', end: '15:00' },
  sunday: { enabled: false, start: '10:00', end: '16:00' },
};

export const Step5Booking: React.FC<Step5BookingProps> = ({
  formData,
  onUpdate,
  onNext,
  onBack,
  isLoading = false,
}) => {
  const [bookingEnabled, setBookingEnabled] = useState(formData.booking_enabled || false);
  const [serviceType, setServiceType] = useState(formData.service_type || 'appointment');
  const [defaultDuration, setDefaultDuration] = useState(formData.default_duration_minutes?.toString() || '60');
  const [bufferTime, setBufferTime] = useState(formData.buffer_minutes?.toString() || '15');
  const [advanceBookingDays, setAdvanceBookingDays] = useState(formData.advance_booking_days?.toString() || '30');
  const [sameDayBooking, setSameDayBooking] = useState(formData.same_day_booking ?? true);
  const [autoConfirm, setAutoConfirm] = useState(formData.auto_confirm || false);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    formData.working_hours || defaultWorkingHours
  );
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>(
    formData.service_options || []
  );
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);

  useEffect(() => {
    // Check if user has calendar connected
    checkCalendarConnection();
  }, []);

  const checkCalendarConnection = async () => {
    try {
      // This would check the user's calendar connections
      // For now, we'll assume no connection
      setCalendarConnected(false);
    } catch (error) {
      console.error('Failed to check calendar connection:', error);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    setConnectingCalendar(true);
    try {
      // Get current user ID (this should come from auth context)
      const userId = 'current-user-id'; // Replace with actual user ID
      
      const authUrl = googleCalendar.getAuthUrl(userId);
      
      Alert.alert(
        'Connect Google Calendar',
        'You will be redirected to Google to authorize calendar access. This allows us to sync your existing appointments and prevent double bookings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              // In a real app, you'd open this URL in a web browser
              // and handle the OAuth callback
              console.log('Open auth URL:', authUrl);
              Alert.alert('Demo Mode', 'Calendar integration would open in a real app');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to connect calendar:', error);
      Alert.alert('Error', 'Failed to connect Google Calendar');
    } finally {
      setConnectingCalendar(false);
    }
  };

  const addServiceOption = () => {
    const newOption: ServiceOption = {
      name: 'New Service',
      duration: 60,
      price: 50,
      currency: 'GBP'
    };
    setServiceOptions([...serviceOptions, newOption]);
  };

  const updateServiceOption = (index: number, field: keyof ServiceOption, value: string | number) => {
    const updated = [...serviceOptions];
    updated[index] = { ...updated[index], [field]: value };
    setServiceOptions(updated);
  };

  const removeServiceOption = (index: number) => {
    setServiceOptions(serviceOptions.filter((_, i) => i !== index));
  };

  const updateWorkingDay = (day: keyof WorkingHours, field: keyof WorkingDay, value: boolean | string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleNext = () => {
    if (bookingEnabled) {
      // Validate booking settings
      if (serviceOptions.length === 0) {
        Alert.alert('Missing Information', 'Please add at least one service option');
        return;
      }

      if (!defaultDuration || parseInt(defaultDuration) < 15) {
        Alert.alert('Invalid Duration', 'Default duration must be at least 15 minutes');
        return;
      }

      // Check if at least one day is enabled
      const hasWorkingDays = Object.values(workingHours).some(day => day.enabled);
      if (!hasWorkingDays) {
        Alert.alert('No Working Days', 'Please enable at least one working day');
        return;
      }
    }

    // Update form data
    onUpdate({
      booking_enabled: bookingEnabled,
      service_type: serviceType,
      default_duration_minutes: parseInt(defaultDuration),
      buffer_minutes: parseInt(bufferTime),
      advance_booking_days: parseInt(advanceBookingDays),
      same_day_booking: sameDayBooking,
      auto_confirm: autoConfirm,
      working_hours: workingHours,
      service_options: serviceOptions,
      calendar_connected: calendarConnected,
    });

    onNext();
  };

  const serviceTypes = [
    { value: 'appointment', label: 'Appointment', icon: 'calendar' },
    { value: 'consultation', label: 'Consultation', icon: 'chatbubbles' },
    { value: 'service', label: 'Service', icon: 'construct' },
    { value: 'class', label: 'Class/Session', icon: 'school' },
  ];

  const dayNames: (keyof WorkingHours)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Booking Setup</Text>
        <Text style={styles.subtitle}>
          Configure appointment booking for your service (optional)
        </Text>

        {/* Enable Booking Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Enable Online Booking</Text>
              <Text style={styles.toggleSubtitle}>
                Allow customers to book appointments directly
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
            {/* Service Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Type</Text>
              <View style={styles.serviceTypeGrid}>
                {serviceTypes.map((type) => (
                  <Pressable
                    key={type.value}
                    style={[
                      styles.serviceTypeOption,
                      serviceType === type.value && styles.serviceTypeOptionSelected
                    ]}
                    onPress={() => setServiceType(type.value)}
                  >
                    <Ionicons 
                      name={type.icon as any} 
                      size={24} 
                      color={serviceType === type.value ? '#3b82f6' : '#6b7280'} 
                    />
                    <Text style={[
                      styles.serviceTypeLabel,
                      serviceType === type.value && styles.serviceTypeLabelSelected
                    ]}>
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Basic Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Settings</Text>
              
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Default Duration (minutes)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={defaultDuration}
                    onChangeText={setDefaultDuration}
                    keyboardType="numeric"
                    placeholder="60"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Buffer Time (minutes)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={bufferTime}
                    onChangeText={setBufferTime}
                    keyboardType="numeric"
                    placeholder="15"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Advance Booking (days)</Text>
                <TextInput
                  style={styles.textInput}
                  value={advanceBookingDays}
                  onChangeText={setAdvanceBookingDays}
                  keyboardType="numeric"
                  placeholder="30"
                />
                <Text style={styles.inputHelp}>
                  How far in advance customers can book
                </Text>
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Same-day Booking</Text>
                  <Text style={styles.toggleSubtitle}>
                    Allow bookings for today
                  </Text>
                </View>
                <Switch
                  value={sameDayBooking}
                  onValueChange={setSameDayBooking}
                  trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                  thumbColor={sameDayBooking ? '#ffffff' : '#f3f4f6'}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Auto-confirm Bookings</Text>
                  <Text style={styles.toggleSubtitle}>
                    Automatically accept all booking requests
                  </Text>
                </View>
                <Switch
                  value={autoConfirm}
                  onValueChange={setAutoConfirm}
                  trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                  thumbColor={autoConfirm ? '#ffffff' : '#f3f4f6'}
                />
              </View>
            </View>

            {/* Working Hours */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Working Hours</Text>
              {dayNames.map((day, index) => (
                <View key={day} style={styles.workingDayRow}>
                  <View style={styles.dayToggle}>
                    <Switch
                      value={workingHours[day].enabled}
                      onValueChange={(value) => updateWorkingDay(day, 'enabled', value)}
                      trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                      thumbColor={workingHours[day].enabled ? '#ffffff' : '#f3f4f6'}
                    />
                    <Text style={[
                      styles.dayLabel,
                      !workingHours[day].enabled && styles.dayLabelDisabled
                    ]}>
                      {dayLabels[index]}
                    </Text>
                  </View>
                  
                  {workingHours[day].enabled && (
                    <View style={styles.timeInputs}>
                      <TextInput
                        style={styles.timeInput}
                        value={workingHours[day].start}
                        onChangeText={(value) => updateWorkingDay(day, 'start', value)}
                        placeholder="09:00"
                      />
                      <Text style={styles.timeSeparator}>to</Text>
                      <TextInput
                        style={styles.timeInput}
                        value={workingHours[day].end}
                        onChangeText={(value) => updateWorkingDay(day, 'end', value)}
                        placeholder="17:00"
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Service Options */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Service Options</Text>
                <Pressable style={styles.addButton} onPress={addServiceOption}>
                  <Ionicons name="add" size={20} color="#3b82f6" />
                  <Text style={styles.addButtonText}>Add Service</Text>
                </Pressable>
              </View>
              
              {serviceOptions.map((option, index) => (
                <View key={index} style={styles.serviceOptionCard}>
                  <View style={styles.serviceOptionHeader}>
                    <TextInput
                      style={styles.serviceNameInput}
                      value={option.name}
                      onChangeText={(value) => updateServiceOption(index, 'name', value)}
                      placeholder="Service Name"
                    />
                    <Pressable
                      style={styles.removeButton}
                      onPress={() => removeServiceOption(index)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </Pressable>
                  </View>
                  
                  <View style={styles.serviceOptionInputs}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Duration (min)</Text>
                      <TextInput
                        style={styles.textInput}
                        value={option.duration.toString()}
                        onChangeText={(value) => updateServiceOption(index, 'duration', parseInt(value) || 0)}
                        keyboardType="numeric"
                      />
                    </View>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Price (£)</Text>
                      <TextInput
                        style={styles.textInput}
                        value={option.price.toString()}
                        onChangeText={(value) => updateServiceOption(index, 'price', parseFloat(value) || 0)}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              ))}
              
              {serviceOptions.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
                  <Text style={styles.emptyStateText}>No services added yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Add your services with duration and pricing
                  </Text>
                </View>
              )}
            </View>

            {/* Calendar Integration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Calendar Integration</Text>
              <View style={styles.calendarCard}>
                <View style={styles.calendarInfo}>
                  <Ionicons 
                    name={calendarConnected ? "checkmark-circle" : "calendar-outline"} 
                    size={24} 
                    color={calendarConnected ? "#10b981" : "#6b7280"} 
                  />
                  <View style={styles.calendarText}>
                    <Text style={styles.calendarTitle}>
                      {calendarConnected ? 'Google Calendar Connected' : 'Connect Google Calendar'}
                    </Text>
                    <Text style={styles.calendarSubtitle}>
                      {calendarConnected 
                        ? 'Your calendar is synced to prevent double bookings'
                        : 'Sync your existing calendar to show real availability'
                      }
                    </Text>
                  </View>
                </View>
                
                {!calendarConnected && (
                  <Pressable
                    style={styles.connectButton}
                    onPress={handleConnectGoogleCalendar}
                    disabled={connectingCalendar}
                  >
                    <Text style={styles.connectButtonText}>
                      {connectingCalendar ? 'Connecting...' : 'Connect'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={20} color="#6b7280" />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.nextButton, isLoading && styles.nextButtonDisabled]} 
            onPress={handleNext}
            disabled={isLoading}
          >
            <Text style={styles.nextButtonText}>
              {isLoading ? 'Creating...' : 'Continue'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  serviceTypeGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  serviceTypeOption: {
    flex: 1,
    minWidth: 120,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center' as const,
    gap: 8,
  },
  serviceTypeOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  serviceTypeLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6b7280',
    textAlign: 'center' as const,
  },
  serviceTypeLabelSelected: {
    color: '#3b82f6',
  },
  inputRow: {
    flexDirection: 'row' as const,
    gap: 16,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  inputHelp: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  workingDayRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dayToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#1f2937',
  },
  dayLabelDisabled: {
    color: '#9ca3af',
  },
  timeInputs: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  timeInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: '#1f2937',
    width: 60,
    textAlign: 'center' as const,
  },
  timeSeparator: {
    fontSize: 14,
    color: '#6b7280',
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#3b82f6',
  },
  serviceOptionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  serviceOptionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 16,
  },
  serviceNameInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#1f2937',
  },
  removeButton: {
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  serviceOptionInputs: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center' as const,
  },
  calendarCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  calendarInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
    marginBottom: 16,
  },
  calendarText: {
    flex: 1,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 4,
  },
  calendarSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start' as const,
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  navigationContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#6b7280',
  },
  nextButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
};