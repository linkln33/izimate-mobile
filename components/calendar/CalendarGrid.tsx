/**
 * CalendarGrid Component
 * Base calendar UI with month/week/day/list view modes
 */

import React from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { pastelDesignSystem } from '@/lib/pastel-design-system'
import type { CalendarGridProps, CalendarEvent, CalendarViewMode } from './types'
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  selectedDate,
  viewMode,
  events = [],
  onDateSelect,
  onNavigate,
  minDate,
  maxDate,
  disabledDates = [],
  showEventDots = true,
  showAddButton = false,
  onAddEvent,
}) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isDateDisabled = (date: Date): boolean => {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    if (disabledDates.some(d => d.toDateString() === date.toDateString())) return true
    return false
  }

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.start)
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      )
    })
  }

  const renderMonthView = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const days: (number | null)[] = []

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return (
      <View style={styles.monthView}>
        <View style={styles.dayNamesRow}>
          {dayNames.map(day => (
            <View key={day} style={styles.dayNameCell}>
              <Text style={styles.dayNameText}>{day}</Text>
            </View>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {days.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />
            }

            const date = new Date(year, month, day)
            const dateStr = date.toDateString()
            const isToday = dateStr === today.toDateString()
            const isSelected = selectedDate && selectedDate.toDateString() === dateStr
            const isPast = date < today
            const isDisabled = isDateDisabled(date)
            const dayEvents = showEventDots ? getEventsForDate(date) : []

            return (
              <Pressable
                key={day}
                style={[
                  styles.dayCell,
                  isToday && styles.todayCell,
                  isSelected && styles.selectedCell,
                  isPast && styles.pastCell,
                  isDisabled && styles.disabledCell,
                ]}
                onPress={() => !isDisabled && !isPast && onDateSelect(date)}
                disabled={isDisabled || isPast}
              >
                <View style={styles.dayCellContent}>
                  <Text
                    style={[
                      styles.dayText,
                      isToday && styles.todayText,
                      isSelected && styles.selectedText,
                      isPast && styles.pastText,
                      isDisabled && styles.disabledText,
                    ]}
                  >
                    {day}
                  </Text>
                  {showAddButton && !isPast && !isDisabled && (
                    <Pressable
                      style={styles.addButton}
                      onPress={(e) => {
                        e.stopPropagation()
                        onAddEvent?.(date)
                      }}
                    >
                      <Ionicons name="add" size={14} color={pastelColors.primary[500]} />
                    </Pressable>
                  )}
                </View>
                {showEventDots && dayEvents.length > 0 && (
                  <View style={styles.eventDots}>
                    {dayEvents.slice(0, 3).map((event, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.eventDot,
                          { backgroundColor: event.color || pastelColors.primary[500] },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      </View>
    )
  }

  const renderWeekView = () => {
    const start = new Date(currentDate)
    const day = start.getDay()
    start.setDate(start.getDate() - day) // Start from Sunday
    start.setHours(0, 0, 0, 0)

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weekDays: Date[] = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      weekDays.push(date)
    }

    return (
      <View style={styles.weekView}>
        <View style={styles.weekDaysRow}>
          {weekDays.map((date, index) => {
            const dateStr = date.toDateString()
            const isToday = dateStr === today.toDateString()
            const isSelected = selectedDate && selectedDate.toDateString() === dateStr
            const isPast = date < today
            const isDisabled = isDateDisabled(date)
            const dayEvents = showEventDots ? getEventsForDate(date) : []

            return (
              <Pressable
                key={index}
                style={[
                  styles.weekDayCell,
                  isToday && styles.weekDayToday,
                  isSelected && styles.weekDaySelected,
                  isPast && styles.weekDayPast,
                  isDisabled && styles.weekDayDisabled,
                ]}
                onPress={() => !isDisabled && !isPast && onDateSelect(date)}
                disabled={isDisabled || isPast}
              >
                <View style={styles.weekDayContent}>
                  <Text style={styles.weekDayName}>
                    {dayNames[index]}
                  </Text>
                  <Text
                    style={[
                      styles.weekDayNumber,
                      isToday && styles.weekDayNumberToday,
                      isSelected && styles.weekDayNumberSelected,
                      isPast && styles.weekDayNumberPast,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  {showAddButton && !isPast && !isDisabled && (
                    <Pressable
                      style={styles.weekAddButton}
                      onPress={(e) => {
                        e.stopPropagation()
                        onAddEvent?.(date)
                      }}
                    >
                      <Ionicons name="add" size={12} color="#f25842" />
                    </Pressable>
                  )}
                </View>
                {showEventDots && dayEvents.length > 0 && (
                  <View style={styles.weekEventDots}>
                    {dayEvents.slice(0, 2).map((event, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.eventDot,
                          { backgroundColor: event.color || pastelColors.primary[500] },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      </View>
    )
  }

  const renderDayView = () => {
    const date = selectedDate || currentDate
    const dateStr = date.toDateString()
    const dayEvents = getEventsForDate(date).sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    )

    return (
      <View style={styles.dayView}>
        <View style={styles.dayViewHeader}>
          <Text style={styles.dayViewTitle}>
            {date.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
        {dayEvents.length === 0 ? (
          <View style={styles.emptyDay}>
            <Ionicons name="calendar-outline" size={48} color={surfaces.outline} />
            <Text style={styles.emptyDayText}>No events for this day</Text>
          </View>
        ) : (
          <ScrollView style={styles.dayEventsList}>
            {dayEvents.map(event => (
              <Pressable
                key={event.id}
                style={[
                  styles.dayEventItem,
                  { borderLeftColor: event.color || pastelColors.primary[500] },
                ]}
                onPress={() => {}}
              >
                <Text style={styles.dayEventTime}>
                  {event.start.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  -{' '}
                  {event.end.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Text style={styles.dayEventTitle}>{event.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    )
  }

  const renderListView = () => {
    const sortedEvents = [...events].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    )

    return (
      <View style={styles.listView}>
        {sortedEvents.length === 0 ? (
          <View style={styles.emptyList}>
            <Ionicons name="calendar-outline" size={48} color={surfaces.outline} />
            <Text style={styles.emptyListText}>No events found</Text>
          </View>
        ) : (
          <ScrollView style={styles.eventsList}>
            {sortedEvents.map(event => (
              <Pressable
                key={event.id}
                style={styles.listEventItem}
                onPress={() => {}}
              >
                <View style={styles.listEventLeft}>
                  <Text style={styles.listEventDate}>
                    {event.start.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.listEventTime}>
                    {event.start.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={styles.listEventRight}>
                  <Text style={styles.listEventTitle}>{event.title}</Text>
                  <View
                    style={[
                      styles.listEventStatus,
                      { backgroundColor: event.color || '#f25842' },
                    ]}
                  >
                    <Text style={styles.listEventStatusText}>
                      {event.status}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    )
  }

  const formatDateHeader = (): string => {
    switch (viewMode) {
      case 'month':
        return currentDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })
      case 'week': {
        const start = new Date(currentDate)
        const day = start.getDay()
        start.setDate(start.getDate() - day)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        return `${start.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} - ${end.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`
      }
      case 'day':
        return (selectedDate || currentDate).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      case 'list':
        return 'All Events'
      default:
        return ''
    }
  }

  return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('prev')} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={surfaces.onSurface} />
        </Pressable>
        <Text style={styles.dateHeaderText}>{formatDateHeader()}</Text>
        <Pressable onPress={() => onNavigate('next')} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={surfaces.onSurface} />
        </Pressable>
      </View>

      {/* Calendar Content */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'list' && renderListView()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: surfaces.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: surfaces.outline,
  },
  navButton: {
    padding: spacing.sm,
  },
  dateHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: surfaces.onSurface,
  },
  // Month View
  monthView: {
    padding: 16,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
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
    margin: 2,
  },
  todayCell: {
    backgroundColor: pastelColors.primary[50],
    borderWidth: 2,
    borderColor: pastelColors.primary[500],
  },
  selectedCell: {
    backgroundColor: pastelColors.primary[500],
  },
  pastCell: {
    opacity: 0.4,
  },
  disabledCell: {
    opacity: 0.2,
  },
  dayText: {
    fontSize: 14,
    color: surfaces.onSurface,
  },
  todayText: {
    color: pastelColors.primary[500],
    fontWeight: '600',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pastText: {
    color: surfaces.onSurfaceVariant,
  },
  disabledText: {
    color: surfaces.outline,
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
  // Week View
  weekView: {
    padding: 16,
  },
  weekDaysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: surfaces.outline,
    backgroundColor: surfaces.surface,
    position: 'relative',
    ...elevation.level1,
  },
  weekDayContent: {
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  weekAddButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: pastelColors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...elevation.level2,
  },
  weekDayToday: {
    backgroundColor: pastelColors.primary[50],
    borderColor: pastelColors.primary[500],
  },
  weekDaySelected: {
    backgroundColor: pastelColors.primary[500],
    borderColor: pastelColors.primary[500],
  },
  weekDayPast: {
    opacity: 0.4,
  },
  weekDayDisabled: {
    opacity: 0.2,
  },
  weekDayName: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: surfaces.onSurface,
  },
  weekDayNumberToday: {
    color: pastelColors.primary[500],
  },
  weekDayNumberSelected: {
    color: '#FFFFFF',
  },
  weekDayNumberPast: {
    color: surfaces.onSurfaceVariant,
  },
  weekEventDots: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 2,
  },
  // Day View
  dayView: {
    padding: 16,
    minHeight: 300,
  },
  dayViewHeader: {
    marginBottom: 16,
  },
  dayViewTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
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
  // List View
  listView: {
    padding: 16,
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyListText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  eventsList: {
    maxHeight: 500,
  },
  listEventItem: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  listEventLeft: {
    marginRight: 16,
    alignItems: 'center',
  },
  listEventDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  listEventTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  listEventRight: {
    flex: 1,
  },
  listEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  listEventStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listEventStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
})

