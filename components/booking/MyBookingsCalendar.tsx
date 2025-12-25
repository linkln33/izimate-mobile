import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { QuickEventForm } from './QuickEventForm';
import type { Booking, Listing, User } from '@/lib/types';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { triggerLight } from '@/lib/utils/haptics';

const { width } = Dimensions.get('window');
const CALENDAR_WIDTH = width - 40;
const DAY_WIDTH = CALENDAR_WIDTH / 7;

interface MyBookingsCalendarProps {
  userId: string;
  viewType?: 'customer' | 'provider' | 'both';
}

type CalendarViewMode = 'day' | 'week' | 'month' | 'list';

interface BookingEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  provider?: string;
  customer?: string;
  price?: number;
  currency?: string;
}

export const MyBookingsCalendar: React.FC<MyBookingsCalendarProps> = ({ 
  userId, 
  viewType = 'both' 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayBookings, setDayBookings] = useState<BookingEvent[]>([]);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventFormDate, setEventFormDate] = useState<string>('');
  const [showDayViewModal, setShowDayViewModal] = useState(false);

  useEffect(() => {
    loadBookings();
  }, [userId, currentDate]);

  // Helper function to format date as YYYY-MM-DD using local date components
  const formatLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() is 0-indexed
    const day = date.getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      
      // Get start and end of current month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const allBookings: BookingEvent[] = [];

      // Load bookings where user is customer (if viewType allows)
      if (viewType === 'customer' || viewType === 'both') {
        const { data: customerBookings, error: customerError } = await supabase
          .from('bookings')
          .select(`
            *,
            listing:listings(title, user_id),
            provider:provider_profiles!provider_id(user:users!user_id(name, avatar_url))
          `)
          .eq('customer_id', userId)
          .gte('start_time', startOfMonth.toISOString())
          .lte('start_time', endOfMonth.toISOString())
          .not('status', 'eq', 'cancelled') // Exclude cancelled bookings
          .order('start_time', { ascending: true });

        if (customerError) console.error('Customer bookings error:', customerError);

        // Add customer bookings
        customerBookings?.forEach(booking => {
          allBookings.push({
            id: booking.id,
            title: booking.service_name || booking.listing?.title || 'Service',
            start: new Date(booking.start_time),
            end: new Date(booking.end_time),
            status: booking.status,
            provider: booking.provider?.customer?.name || 'Provider',
            price: booking.service_price,
            currency: booking.currency,
          });
        });
      }

      // Load bookings where user is provider (if viewType allows)
      if (viewType === 'provider' || viewType === 'both') {
        const { data: providerBookings, error: providerError } = await supabase
          .from('bookings')
          .select(`
            *,
            listing:listings!inner(title),
            customer:users!bookings_customer_id_fkey(name, avatar_url)
          `)
          .eq('listing.user_id', userId)
          .gte('start_time', startOfMonth.toISOString())
          .lte('start_time', endOfMonth.toISOString())
          .not('status', 'eq', 'cancelled') // Exclude cancelled bookings
          .order('start_time', { ascending: true });

        if (providerError) console.error('Provider bookings error:', providerError);

        // Add provider bookings
        providerBookings?.forEach(booking => {
          allBookings.push({
            id: booking.id,
            title: booking.service_name || booking.listing?.title || 'Service',
            start: new Date(booking.start_time),
            end: new Date(booking.end_time),
            status: booking.status,
            customer: booking.customer?.name || 'Customer',
            price: booking.service_price,
            currency: booking.currency,
          });
        });
      }

      // Sort by start time
      allBookings.sort((a, b) => a.start.getTime() - b.start.getTime());
      
      setBookings(allBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

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
      const isToday = date.toDateString() === today.toDateString();
      // Use local date components to create dateString (YYYY-MM-DD format)
      const dateYear = date.getFullYear();
      const dateMonth = date.getMonth() + 1; // getMonth() is 0-indexed
      const dateDay = date.getDate();
      const dateString = `${dateYear}-${String(dateMonth).padStart(2, '0')}-${String(dateDay).padStart(2, '0')}`;
      
      // Check if this date has bookings (compare using local date components)
      const hasBookings = bookings.some(booking => {
        const bookingDate = booking.start;
        return bookingDate.getFullYear() === dateYear &&
               bookingDate.getMonth() === dateMonth - 1 && // getMonth() is 0-indexed
               bookingDate.getDate() === dateDay;
      });
      
      days.push({
        date: date.getDate(),
        dateString,
        isCurrentMonth,
        isToday,
        hasBookings,
        isSelected: selectedDate === dateString,
      });
    }
    
    return days;
  };

  const handleDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    
    // Filter bookings for selected date (compare using local date components)
    const [dateYear, dateMonth, dateDay] = dateString.split('-').map(Number);
    const selectedBookings = bookings.filter(booking => {
      const bookingDate = booking.start;
      return bookingDate.getFullYear() === dateYear &&
             bookingDate.getMonth() === dateMonth - 1 && // getMonth() is 0-indexed
             bookingDate.getDate() === dateDay;
    });
    setDayBookings(selectedBookings);
    
    // Show day view modal
    setShowDayViewModal(true);
  };

  const handleCreateEvent = (dateString: string) => {
    console.log('handleCreateEvent called with:', dateString);
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Don't allow creating events in the past
    if (selectedDate < today) {
      Alert.alert('Invalid Date', 'Cannot create events in the past');
      return;
    }

    console.log('Setting event form date and showing form');
    setEventFormDate(dateString);
    setShowEventForm(true);
  };

  const handleEventCreated = () => {
    // Reload bookings after creating a new event
    loadBookings();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
    setSelectedDate(null);
    setDayBookings([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'completed': return '#6366f1';
      case 'cancelled': return '#ef4444';
      case 'no_show': return '#9ca3af';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'completed': return 'checkmark-done-circle';
      case 'cancelled': return 'close-circle';
      case 'no_show': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const handleExternalCalendarSync = async (provider: 'google' | 'outlook' | 'icloud') => {
    try {
      // Direct users to use the CalendarIntegration component for full calendar management
      // This is a simplified handler - full integration is available in CalendarIntegration component
      Alert.alert(
        'Calendar Integration',
        `To connect your ${provider === 'google' ? 'Google' : provider === 'outlook' ? 'Outlook' : 'iCloud'} Calendar, please use the Calendar Integration settings in your dashboard or listing settings.`,
        [
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('External calendar sync error:', error);
      Alert.alert('Error', 'Failed to connect to external calendar');
    }
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonLoader type="calendar" count={5} />
      </View>
    );
  }

  const getViewTitle = () => {
    switch (viewType) {
      case 'customer': return 'My Bookings Calendar';
      case 'provider': return 'Provider Calendar';
      default: return 'All Bookings Calendar';
    }
  };

  const renderCalendarContent = () => {
    switch (viewMode) {
      case 'day':
        return renderDayView();
      case 'week':
        return renderWeekView();
      case 'month':
        return renderMonthView();
      case 'list':
        return renderListView();
      default:
        return renderMonthView();
    }
  };

  const renderMonthView = () => (
    <>
      {/* Calendar Header */}
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
              day.isToday && styles.dayCellToday,
              day.isSelected && styles.dayCellSelected,
            ]}
            onPress={() => day.isCurrentMonth && handleDateSelect(day.dateString)}
          >
            <Text
              style={[
                styles.dayText,
                !day.isCurrentMonth && styles.dayTextInactive,
                day.isToday && styles.dayTextToday,
                day.isSelected && styles.dayTextSelected,
              ]}
            >
              {day.date}
            </Text>
            {day.hasBookings && (
              <View style={[
                styles.bookingIndicator,
                day.isSelected && styles.bookingIndicatorSelected
              ]} />
            )}
          </Pressable>
        ))}
      </View>
    </>
  );

  const renderDayView = () => (
    <View style={styles.dayViewContainer}>
      <View style={styles.dayViewHeader}>
        <Pressable onPress={() => navigateDay('prev')} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color="#374151" />
        </Pressable>
        <Text style={styles.dayViewTitle}>
          {currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })}
        </Text>
        <Pressable onPress={() => navigateDay('next')} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color="#374151" />
        </Pressable>
      </View>
      
      {/* Create Event Button for Day View */}
      <View style={styles.dayViewActions}>
        <Pressable 
          style={styles.createEventButton}
          onPress={() => handleCreateEvent(formatLocalDateString(currentDate))}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.createEventButtonText}>New Event</Text>
        </Pressable>
      </View>
      
      {renderDayBookings(formatLocalDateString(currentDate))}
    </View>
  );

  const renderWeekView = () => {
    const startOfWeek = getStartOfWeek(currentDate);
    const weekDays = [];
    
    // Generate 7 days for the week
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }

    return (
      <View style={styles.weekViewContainer}>
        {/* Week Navigation */}
        <View style={styles.weekViewHeader}>
          <Pressable onPress={() => navigateWeek('prev')} style={styles.navButton}>
            <Ionicons name="chevron-back" size={20} color="#374151" />
          </Pressable>
          <Text style={styles.weekViewTitle}>
            {startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {' '}
            {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
          <Pressable onPress={() => navigateWeek('next')} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={20} color="#374151" />
          </Pressable>
        </View>

        {/* Week Days Header */}
        <View style={styles.weekDaysHeader}>
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            // Compare using local date components
            const dayBookings = bookings.filter(booking => {
              const bookingDate = booking.start;
              const dayDate = day;
              return bookingDate.getFullYear() === dayDate.getFullYear() &&
                     bookingDate.getMonth() === dayDate.getMonth() &&
                     bookingDate.getDate() === dayDate.getDate();
            });
            
            return (
              <View key={index} style={styles.weekDayColumn}>
                <View style={[styles.weekDayHeader, isToday && styles.weekDayHeaderToday]}>
                  <Text style={[styles.weekDayName, isToday && styles.weekDayNameToday]}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.weekDayNumber, isToday && styles.weekDayNumberToday]}>
                    {day.getDate()}
                  </Text>
                </View>
                
                {/* Day's Bookings */}
                <View style={styles.weekDayBookings}>
                  {dayBookings.length === 0 ? (
                    <View style={styles.weekEmptyDay}>
                      <Text style={styles.weekEmptyText}>No bookings</Text>
                    </View>
                  ) : (
                    dayBookings.map((booking) => (
                      <View key={booking.id} style={[styles.weekBookingItem, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                        <Text style={styles.weekBookingTime}>
                          {booking.start.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}
                        </Text>
                        <Text style={styles.weekBookingTitle} numberOfLines={2}>
                          {booking.title}
                        </Text>
                        <View style={[styles.weekBookingStatus, { backgroundColor: getStatusColor(booking.status) }]}>
                          <Ionicons 
                            name={getStatusIcon(booking.status)} 
                            size={8} 
                            color="#ffffff" 
                          />
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderListView = () => (
    <View style={styles.listViewContainer}>
      {bookings.length === 0 ? (
        <View style={styles.noBookingsContainer}>
          <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
          <Text style={styles.noBookingsText}>No bookings found</Text>
          <Pressable 
            style={styles.createFirstEventButton}
            onPress={() => handleCreateEvent(formatLocalDateString(new Date()))}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.createEventButtonText}>Create Your First Event</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.bookingsList}>
            {bookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingTitleRow}>
                    <Text style={styles.bookingTitle}>{booking.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                      <Ionicons 
                        name={getStatusIcon(booking.status)} 
                        size={12} 
                        color="#ffffff" 
                      />
                      <Text style={styles.statusText}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bookingDate}>
                    {booking.start.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })} • {booking.start.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - {booking.end.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
                
                <View style={styles.bookingDetails}>
                  {booking.provider && (
                    <Text style={styles.bookingPerson}>
                      <Ionicons name="person" size={14} color="#6b7280" /> Provider: {booking.provider}
                    </Text>
                  )}
                  {booking.customer && (
                    <Text style={styles.bookingPerson}>
                      <Ionicons name="person" size={14} color="#6b7280" /> Customer: {booking.customer}
                    </Text>
                  )}
                  {booking.price && (
                    <Text style={styles.bookingPrice}>
                      <Ionicons name="card" size={14} color="#10b981" /> {booking.currency || '$'}{booking.price}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
          
          {/* Floating Action Button */}
          <Pressable 
            style={styles.floatingActionButton}
            onPress={() => handleCreateEvent(formatLocalDateString(new Date()))}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </Pressable>
        </>
      )}
    </View>
  );

  const renderDayBookings = (dateString: string) => {
    // Parse the dateString to get year, month, day for comparison
    const [dateYear, dateMonth, dateDay] = dateString.split('-').map(Number);
    
    const dayBookings = bookings.filter(booking => {
      const bookingDate = booking.start;
      return bookingDate.getFullYear() === dateYear &&
             bookingDate.getMonth() === dateMonth - 1 && // getMonth() is 0-indexed
             bookingDate.getDate() === dateDay;
    });

    return (
      <View style={styles.dayBookingsContainer}>
        {dayBookings.length === 0 ? (
          <View style={styles.noBookingsContainer}>
            <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
            <Text style={styles.noBookingsText}>No bookings on this date</Text>
          </View>
        ) : (
          <View style={styles.bookingsList}>
            {dayBookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingTitleRow}>
                    <Text style={styles.bookingTitle}>{booking.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                      <Ionicons 
                        name={getStatusIcon(booking.status)} 
                        size={12} 
                        color="#ffffff" 
                      />
                      <Text style={styles.statusText}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bookingTime}>
                    {booking.start.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - {booking.end.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
                
                <View style={styles.bookingDetails}>
                  {booking.provider && (
                    <Text style={styles.bookingPerson}>
                      <Ionicons name="person" size={14} color="#6b7280" /> Provider: {booking.provider}
                    </Text>
                  )}
                  {booking.customer && (
                    <Text style={styles.bookingPerson}>
                      <Ionicons name="person" size={14} color="#6b7280" /> Customer: {booking.customer}
                    </Text>
                  )}
                  {booking.price && (
                    <Text style={styles.bookingPrice}>
                      <Ionicons name="card" size={14} color="#10b981" /> {booking.currency || '$'}{booking.price}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const getStartOfWeek = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day; // Sunday is 0
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* View Title */}
      <View style={styles.viewHeader}>
        <Text style={styles.viewTitle}>{getViewTitle()}</Text>
        <Text style={styles.viewSubtitle}>
          {viewType === 'customer' ? 'Bookings you made' : 
           viewType === 'provider' ? 'Bookings you received' : 
           'All your bookings'}
        </Text>
      </View>

      {/* Calendar View Options */}
      <View style={styles.viewOptionsContainer}>
        <View style={styles.viewOptions}>
          {(['day', 'week', 'month', 'list'] as CalendarViewMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={[
                styles.viewOption,
                viewMode === mode && styles.activeViewOption,
              ]}
              onPress={() => setViewMode(mode)}
            >
              <Text
                style={[
                  styles.viewOptionText,
                  viewMode === mode && styles.activeViewOptionText,
                ]}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Calendar Content */}
      {renderCalendarContent()}

      {/* External Calendar Integration - Square boxes below calendar */}
      <View style={styles.externalCalendarContainer}>
        <Text style={styles.externalCalendarTitle}>Sync with:</Text>
        <View style={styles.calendarProvidersRow}>
          <Pressable 
            style={styles.providerSquareBox}
            onPress={() => handleExternalCalendarSync('google')}
          >
            <View style={[styles.providerIconSquare, { backgroundColor: '#4285F4' }]}>
              <Ionicons name="logo-google" size={20} color="#ffffff" />
            </View>
            <Text style={styles.providerTextSquare}>Google</Text>
          </Pressable>

          <Pressable 
            style={styles.providerSquareBox}
            onPress={() => handleExternalCalendarSync('outlook')}
          >
            <View style={[styles.providerIconSquare, { backgroundColor: '#0078D4' }]}>
              <Ionicons name="mail" size={20} color="#ffffff" />
            </View>
            <Text style={styles.providerTextSquare}>Outlook</Text>
          </Pressable>

          <Pressable 
            style={styles.providerSquareBox}
            onPress={() => handleExternalCalendarSync('icloud')}
          >
            <View style={[styles.providerIconSquare, { backgroundColor: '#007AFF' }]}>
              <Ionicons name="logo-apple" size={20} color="#ffffff" />
            </View>
            <Text style={styles.providerTextSquare}>iCloud</Text>
          </Pressable>
        </View>
      </View>
      {/* Selected Date Bookings for Month View */}
      {viewMode === 'month' && selectedDate && (
        <View style={styles.dayBookingsContainer}>
          <View style={styles.dayBookingsHeader}>
            <Text style={styles.dayBookingsTitle}>
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
            <Pressable 
              style={styles.createEventButton}
              onPress={() => handleCreateEvent(selectedDate)}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text style={styles.createEventButtonText}>New Event</Text>
            </Pressable>
          </View>
          
          {/* Provider View: Show day summary first */}
          {viewType === 'provider' && dayBookings.length > 0 && (
            <View style={styles.daySummary}>
              <View style={styles.daySummaryItem}>
                <Ionicons name="calendar" size={16} color="#3b82f6" />
                <Text style={styles.daySummaryText}>{dayBookings.length} bookings</Text>
              </View>
              <View style={styles.daySummaryItem}>
                <Ionicons name="cash" size={16} color="#10b981" />
                <Text style={styles.daySummaryText}>
                  £{dayBookings.reduce((sum, b) => sum + (b.price || 0), 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.daySummaryItem}>
                <Ionicons name="checkmark-circle" size={16} color="#f59e0b" />
                <Text style={styles.daySummaryText}>
                  {dayBookings.filter(b => b.status === 'completed').length} completed
                </Text>
              </View>
            </View>
          )}
          
          {renderDayBookings(selectedDate)}
        </View>
      )}

      {/* Monthly Summary */}
      {viewMode === 'month' && !selectedDate && bookings.length > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>This Month</Text>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{bookings.length}</Text>
              <Text style={styles.statLabel}>Total Bookings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {bookings.filter(b => b.status === 'confirmed').length}
              </Text>
              <Text style={styles.statLabel}>Confirmed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {bookings.filter(b => b.status === 'pending').length}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {bookings.filter(b => b.status === 'completed').length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>
      )}

      {/* Day View Modal */}
      <Modal
        visible={showDayViewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDayViewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dayViewModal}>
            {/* Modal Header */}
            <View style={styles.dayViewHeader}>
              <View style={styles.dayViewHeaderLeft}>
                <Text style={styles.dayViewDate}>
                  {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
                {dayBookings.length > 0 && (
                  <View style={styles.dayViewStats}>
                    <View style={styles.dayViewStatItem}>
                      <Ionicons name="calendar" size={14} color="#3b82f6" />
                      <Text style={styles.dayViewStatText}>{dayBookings.length} bookings</Text>
                    </View>
                    <View style={styles.dayViewStatItem}>
                      <Ionicons name="cash" size={14} color="#10b981" />
                      <Text style={styles.dayViewStatText}>
                        £{dayBookings.reduce((sum, b) => sum + (b.price || 0), 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              <Pressable
                style={styles.closeModalButton}
                onPress={() => setShowDayViewModal(false)}
              >
                <Ionicons name="close" size={28} color="#6b7280" />
              </Pressable>
            </View>

            {/* Activities List */}
            <ScrollView style={styles.dayViewContent}>
              {dayBookings.length === 0 ? (
                <View style={styles.emptyDayView}>
                  <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
                  <Text style={styles.emptyDayViewTitle}>No Activities</Text>
                  <Text style={styles.emptyDayViewText}>
                    No bookings scheduled for this day
                  </Text>
                </View>
              ) : (
                dayBookings.map((booking, index) => (
                  <View key={booking.id} style={styles.dayViewBookingCard}>
                    <View style={styles.dayViewBookingTime}>
                      <Ionicons name="time-outline" size={20} color="#6b7280" />
                      <Text style={styles.dayViewTimeText}>
                        {booking.start.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {' - '}
                        {booking.end.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>

                    <View style={styles.dayViewBookingDetails}>
                      <Text style={styles.dayViewBookingTitle}>{booking.title}</Text>
                      
                      {viewType === 'provider' && booking.customer && (
                        <View style={styles.dayViewBookingInfo}>
                          <Ionicons name="person-outline" size={16} color="#6b7280" />
                          <Text style={styles.dayViewBookingInfoText}>
                            Customer: {booking.customer}
                          </Text>
                        </View>
                      )}
                      
                      {viewType === 'customer' && booking.provider && (
                        <View style={styles.dayViewBookingInfo}>
                          <Ionicons name="briefcase-outline" size={16} color="#6b7280" />
                          <Text style={styles.dayViewBookingInfoText}>
                            Provider: {booking.provider}
                          </Text>
                        </View>
                      )}

                      {booking.price && (
                        <View style={styles.dayViewBookingInfo}>
                          <Ionicons name="cash-outline" size={16} color="#6b7280" />
                          <Text style={styles.dayViewBookingInfoText}>
                            {booking.currency || 'GBP'} {booking.price.toFixed(2)}
                          </Text>
                        </View>
                      )}

                      <View style={[
                        styles.dayViewBookingStatus,
                        { backgroundColor: getStatusColor(booking.status) + '20' }
                      ]}>
                        <Ionicons
                          name={getStatusIcon(booking.status)}
                          size={14}
                          color={getStatusColor(booking.status)}
                        />
                        <Text style={[
                          styles.dayViewBookingStatusText,
                          { color: getStatusColor(booking.status) }
                        ]}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.dayViewActions}>
              <Pressable
                style={styles.dayViewAddButton}
                onPress={() => {
                  setShowDayViewModal(false);
                  if (selectedDate) {
                    handleCreateEvent(selectedDate);
                  }
                }}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
                <Text style={styles.dayViewAddButtonText}>Add New Booking</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Event Form Modal */}
      <QuickEventForm
        visible={showEventForm}
        onClose={() => setShowEventForm(false)}
        selectedDate={eventFormDate}
        userId={userId}
        viewType={viewType}
        onEventCreated={handleEventCreated}
      />
    </ScrollView>
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
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
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
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 4,
  },
  dayCell: {
    width: DAY_WIDTH,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRadius: 8,
    margin: 2,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  dayCellInactive: {
    opacity: 0.3,
    backgroundColor: '#f9fafb',
  },
  dayCellToday: {
    backgroundColor: '#fef2f2',
    borderWidth: 2,
    borderColor: '#f25842',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dayCellSelected: {
    backgroundColor: '#f25842',
    borderRadius: 8,
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dayText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dayTextInactive: {
    color: '#9ca3af',
  },
  dayTextToday: {
    color: '#92400e',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  bookingIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f25842',
  },
  bookingIndicatorSelected: {
    backgroundColor: '#ffffff',
  },
  dayBookingsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  daySummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  daySummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daySummaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  dayBookingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  noBookingsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noBookingsText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  bookingsList: {
    gap: 12,
  },
  bookingCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bookingHeader: {
    marginBottom: 12,
  },
  bookingTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  bookingTime: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  bookingDetails: {
    gap: 6,
  },
  bookingPerson: {
    fontSize: 14,
    color: '#374151',
  },
  bookingPrice: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  summaryContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f25842',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  viewHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  viewTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  viewSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  viewOptionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  viewOptions: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 3,
  },
  viewOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 7,
    alignItems: 'center',
  },
  activeViewOption: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeViewOptionText: {
    color: '#f25842',
    fontWeight: '600',
  },
  externalCalendarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 16,
  },
  externalCalendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  calendarProvidersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  providerSquareBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  providerIconSquare: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerTextSquare: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  dayViewContainer: {
    paddingHorizontal: 20,
  },
  dayViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  dayViewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  dayViewActions: {
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  weekViewContainer: {
    paddingHorizontal: 20,
  },
  weekViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  weekViewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    gap: 4,
  },
  weekDayColumn: {
    flex: 1,
    minHeight: 300,
  },
  weekDayHeader: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 8,
  },
  weekDayHeaderToday: {
    backgroundColor: '#fef3c7',
  },
  weekDayName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  weekDayNameToday: {
    color: '#92400e',
    fontWeight: '600',
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  weekDayNumberToday: {
    color: '#92400e',
  },
  weekDayBookings: {
    flex: 1,
    gap: 4,
  },
  weekEmptyDay: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  weekEmptyText: {
    fontSize: 10,
    color: '#d1d5db',
    fontStyle: 'italic',
  },
  weekBookingItem: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    padding: 6,
    marginBottom: 2,
    position: 'relative',
  },
  weekBookingTime: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  weekBookingTitle: {
    fontSize: 10,
    color: '#1f2937',
    lineHeight: 12,
  },
  weekBookingStatus: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listViewContainer: {
    paddingHorizontal: 20,
  },
  bookingDate: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  addEventButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  dayBookingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f25842',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  createEventButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  createFirstEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f25842',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#f25842',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // Day View Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dayViewModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dayViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dayViewHeaderLeft: {
    flex: 1,
  },
  dayViewDate: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  dayViewStats: {
    flexDirection: 'row',
    gap: 16,
  },
  dayViewStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayViewStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  closeModalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayViewContent: {
    flex: 1,
    padding: 20,
  },
  emptyDayView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyDayViewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptyDayViewText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  dayViewBookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dayViewBookingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dayViewTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  dayViewBookingDetails: {
    gap: 8,
  },
  dayViewBookingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  dayViewBookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayViewBookingInfoText: {
    fontSize: 14,
    color: '#6b7280',
  },
  dayViewBookingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  dayViewBookingStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayViewActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  dayViewAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f25842',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dayViewAddButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
