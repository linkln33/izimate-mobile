import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface Event {
  id: string
  title: string
  date: Date
  time: string
  type: 'meeting' | 'interview' | 'deadline' | 'other'
}

interface CalendarWidgetProps {
  events?: Event[]
}

export function CalendarWidget({ events = [] }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Get current month and year
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  // Check if date has events
  const hasEvents = (day: number) => {
    const dateToCheck = new Date(currentYear, currentMonth, day)
    return events.some(event => 
      event.date.toDateString() === dateToCheck.toDateString()
    )
  }

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.toDateString() === date.toDateString()
    )
  }

  // Check if date is today
  const isToday = (day: number) => {
    const today = new Date()
    const dateToCheck = new Date(currentYear, currentMonth, day)
    return dateToCheck.toDateString() === today.toDateString()
  }

  // Check if date is selected
  const isSelected = (day: number) => {
    const dateToCheck = new Date(currentYear, currentMonth, day)
    return dateToCheck.toDateString() === selectedDate.toDateString()
  }

  // Generate calendar days
  const renderCalendarDays = () => {
    const days = []
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={styles.emptyDay} />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const hasEvent = hasEvents(day)
      const isCurrentDay = isToday(day)
      const isSelectedDay = isSelected(day)

      days.push(
        <Pressable
          key={day}
          style={[
            styles.dayButton,
            isCurrentDay && styles.todayButton,
            isSelectedDay && styles.selectedButton,
          ]}
          onPress={() => setSelectedDate(new Date(currentYear, currentMonth, day))}
        >
          <Text style={[
            styles.dayText,
            isCurrentDay && styles.todayText,
            isSelectedDay && styles.selectedText,
          ]}>
            {day}
          </Text>
          {hasEvent && <View style={styles.eventDot} />}
        </Pressable>
      )
    }

    return days
  }

  const selectedDateEvents = getEventsForDate(selectedDate)
  const upcomingEvents = events
    .filter(event => event.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3)

  const getEventIcon = (type: Event['type']) => {
    switch (type) {
      case 'meeting': return 'people'
      case 'interview': return 'briefcase'
      case 'deadline': return 'alarm'
      default: return 'calendar'
    }
  }

  const getEventColor = (type: Event['type']) => {
    switch (type) {
      case 'meeting': return '#3b82f6'
      case 'interview': return '#f25842'
      case 'deadline': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return (
    <View style={styles.container}>
      {/* Upcoming Events */}
      <View style={styles.eventsSection}>
        <Text style={styles.eventsTitle}>Upcoming Events</Text>
        {upcomingEvents.length > 0 ? (
          <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
            {upcomingEvents.map(event => (
              <View key={event.id} style={styles.eventItem}>
                <View style={[styles.eventIcon, { backgroundColor: getEventColor(event.type) }]}>
                  <Ionicons 
                    name={getEventIcon(event.type)} 
                    size={16} 
                    color="#ffffff" 
                  />
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDateTime}>
                    {event.date.toLocaleDateString()} at {event.time}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.noEventsText}>No upcoming events</Text>
        )}
      </View>

      {/* Calendar Header */}
      <View style={styles.header}>
        <Pressable onPress={goToPreviousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color="#6b7280" />
        </Pressable>
        
        <Text style={styles.monthYear}>
          {monthNames[currentMonth]} {currentYear}
        </Text>
        
        <Pressable onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </Pressable>
      </View>

      {/* Day Names */}
      <View style={styles.dayNamesRow}>
        {dayNames.map(dayName => (
          <Text key={dayName} style={styles.dayName}>
            {dayName}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {renderCalendarDays()}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    paddingVertical: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dayButton: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  todayButton: {
    backgroundColor: '#f25842',
    borderRadius: 8,
  },
  selectedButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  todayText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  selectedText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  eventDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f25842',
  },
  eventsSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 16,
    marginBottom: 16,
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  eventsList: {
    maxHeight: 120,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  eventDateTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  noEventsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
})