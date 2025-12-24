/**
 * Calendar View Component
 * Full calendar with month/week/day view options
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

type ViewMode = 'month' | 'week' | 'day';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
}

interface CalendarViewProps {
  userId: string;
  listingId?: string;
  onDateSelect?: (date: Date) => void;
  onEventPress?: (event: CalendarEvent) => void;
  onBookDate?: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  userId,
  listingId,
  onDateSelect,
  onEventPress,
  onBookDate,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [userId, currentDate, viewMode]);

  const loadEvents = async () => {
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

      // Calculate date range based on view mode
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);

      if (viewMode === 'month') {
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
      } else if (viewMode === 'week') {
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day);
        endDate.setDate(startDate.getDate() + 6);
      } else {
        // day view
        endDate.setDate(startDate.getDate() + 1);
      }

      // Load bookings
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, start_time, end_time, service_name, status')
        .eq('provider_id', providerProfile.id)
        .gte('start_time', startDate.toISOString())
        .lt('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      const calendarEvents: CalendarEvent[] = (bookings || []).map(booking => ({
        id: booking.id,
        title: booking.service_name || 'Booking',
        start: new Date(booking.start_time),
        end: new Date(booking.end_time),
        color: booking.status === 'confirmed' ? '#10b981' : 
               booking.status === 'pending' ? '#f59e0b' : '#6b7280',
      }));

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const formatDateHeader = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const start = new Date(currentDate);
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const todayStr = today.toDateString();

    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toDateString();
      const isToday = dateStr === todayStr;
      const isSelected = selectedDate.toDateString() === dateStr;
      const dayEvents = events.filter(e => 
        e.start.toDateString() === dateStr
      );

      days.push(
        <Pressable
          key={day}
          style={[
            styles.dayCell,
            isToday && styles.todayCell,
            isSelected && styles.selectedCell,
          ]}
          onPress={() => {
            setSelectedDate(date);
            onDateSelect?.(date);
            // If listingId is provided, allow booking
            if (listingId && onBookDate) {
              onBookDate(date);
            }
          }}
        >
          <Text style={[
            styles.dayText,
            isToday && styles.todayText,
            isSelected && styles.selectedText,
          ]}>
            {day}
          </Text>
          {dayEvents.length > 0 && (
            <View style={styles.eventDots}>
              {dayEvents.slice(0, 3).map((event, idx) => (
                <View
                  key={idx}
                  style={[styles.eventDot, { backgroundColor: event.color || '#f25842' }]}
                />
              ))}
            </View>
          )}
        </Pressable>
      );
    }

    return (
      <View style={styles.monthView}>
        <View style={styles.dayNamesRow}>
          {dayNames.map(day => (
            <Text key={day} style={styles.dayName}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {days}
        </View>
      </View>
    );
  };

  const renderWeekView = () => {
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const todayStr = today.toDateString();

    return (
      <View style={styles.weekView}>
        <View style={styles.weekDaysRow}>
          {dayNames.map((dayName, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            const dateStr = date.toDateString();
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate.toDateString() === dateStr;
            const dayEvents = events.filter(e => 
              e.start.toDateString() === dateStr
            );

            return (
              <Pressable
                key={index}
                style={[
                  styles.weekDayCell,
                  isToday && styles.todayCell,
                  isSelected && styles.selectedCell,
                ]}
                onPress={() => {
                  setSelectedDate(date);
                  onDateSelect?.(date);
                  // If listingId is provided, allow booking
                  if (listingId && onBookDate) {
                    onBookDate(date);
                  }
                }}
              >
                <Text style={styles.weekDayName}>{dayName}</Text>
                <Text style={[
                  styles.weekDayNumber,
                  isToday && styles.todayText,
                  isSelected && styles.selectedText,
                ]}>
                  {date.getDate()}
                </Text>
                {dayEvents.length > 0 && (
                  <View style={styles.eventDots}>
                    {dayEvents.slice(0, 2).map((event, idx) => (
                      <View
                        key={idx}
                        style={[styles.eventDot, { backgroundColor: event.color || '#f25842' }]}
                      />
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  const renderDayView = () => {
    const dateStr = selectedDate.toDateString();
    const dayEvents = events.filter(e => 
      e.start.toDateString() === dateStr
    ).sort((a, b) => a.start.getTime() - b.start.getTime());

    return (
      <View style={styles.dayView}>
        <Text style={styles.dayViewTitle}>
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <ScrollView style={styles.dayEventsList}>
          {dayEvents.length === 0 ? (
            <View style={styles.emptyDay}>
              <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyDayText}>No bookings for this day</Text>
            </View>
          ) : (
            dayEvents.map(event => (
              <Pressable
                key={event.id}
                style={[styles.dayEventItem, { borderLeftColor: event.color || '#f25842' }]}
                onPress={() => onEventPress?.(event)}
              >
                <Text style={styles.dayEventTime}>
                  {event.start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - 
                  {event.end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.dayEventTitle}>{event.title}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <Pressable
          style={[styles.viewModeButton, viewMode === 'month' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('month')}
        >
          <Ionicons 
            name="calendar" 
            size={18} 
            color={viewMode === 'month' ? '#f25842' : '#6b7280'} 
          />
          <Text style={[styles.viewModeText, viewMode === 'month' && styles.viewModeTextActive]}>
            Month
          </Text>
        </Pressable>
        <Pressable
          style={[styles.viewModeButton, viewMode === 'week' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('week')}
        >
          <Ionicons 
            name="calendar-outline" 
            size={18} 
            color={viewMode === 'week' ? '#f25842' : '#6b7280'} 
          />
          <Text style={[styles.viewModeText, viewMode === 'week' && styles.viewModeTextActive]}>
            Week
          </Text>
        </Pressable>
        <Pressable
          style={[styles.viewModeButton, viewMode === 'day' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('day')}
        >
          <Ionicons 
            name="today" 
            size={18} 
            color={viewMode === 'day' ? '#f25842' : '#6b7280'} 
          />
          <Text style={[styles.viewModeText, viewMode === 'day' && styles.viewModeTextActive]}>
            Day
          </Text>
        </Pressable>
      </View>

      {/* Calendar Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigateDate('prev')} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </Pressable>
        
        <Pressable onPress={goToToday} style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>{formatDateHeader()}</Text>
          <Text style={styles.todayButtonText}>Today</Text>
        </Pressable>
        
        <Pressable onPress={() => navigateDate('next')} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#1f2937" />
        </Pressable>
      </View>

      {/* Calendar Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      ) : (
        <>
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  viewModeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  viewModeTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  dateHeader: {
    alignItems: 'center',
  },
  dateHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  todayButtonText: {
    fontSize: 12,
    color: '#f25842',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  monthView: {
    minHeight: 300,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  todayCell: {
    backgroundColor: '#fef2f2',
  },
  selectedCell: {
    backgroundColor: '#f25842',
  },
  dayText: {
    fontSize: 14,
    color: '#1f2937',
  },
  todayText: {
    color: '#f25842',
    fontWeight: '600',
  },
  selectedText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  eventDots: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  weekView: {
    minHeight: 120,
  },
  weekDaysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  weekDayName: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  dayView: {
    minHeight: 300,
  },
  dayViewTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  dayEventsList: {
    maxHeight: 400,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyDayText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  dayEventItem: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  dayEventTime: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  dayEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
});
