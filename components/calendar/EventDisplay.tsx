/**
 * EventDisplay Component
 * Displays bookings/events on calendar with status colors and details
 */

import React from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { EventDisplayProps, CalendarEvent, CalendarViewMode } from './types'

export const EventDisplay: React.FC<EventDisplayProps> = ({
  events,
  viewMode,
  selectedDate,
  onEventPress,
  showStatusColors = true,
}) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed':
        return '#10b981'
      case 'pending':
        return '#f59e0b'
      case 'completed':
        return '#6366f1'
      case 'cancelled':
        return '#ef4444'
      case 'no_show':
        return '#9ca3af'
      default:
        return '#6b7280'
    }
  }

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'confirmed':
        return 'checkmark-circle'
      case 'pending':
        return 'time'
      case 'completed':
        return 'checkmark-done-circle'
      case 'cancelled':
        return 'close-circle'
      case 'no_show':
        return 'alert-circle'
      default:
        return 'help-circle'
    }
  }

  // Filter events for selected date if in day view
  const getDisplayEvents = (): CalendarEvent[] => {
    if (viewMode === 'day' && selectedDate) {
      return events.filter(event => {
        const eventDate = new Date(event.start)
        return (
          eventDate.getFullYear() === selectedDate.getFullYear() &&
          eventDate.getMonth() === selectedDate.getMonth() &&
          eventDate.getDate() === selectedDate.getDate()
        )
      })
    }
    return events
  }

  const displayEvents = getDisplayEvents().sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  )

  if (viewMode === 'month' || viewMode === 'week') {
    // Events are shown as dots on calendar grid, no separate display needed
    return null
  }

  if (viewMode === 'day') {
    return (
      <View style={styles.dayViewContainer}>
        {displayEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No bookings for this day</Text>
          </View>
        ) : (
          <ScrollView style={styles.eventsList}>
            {displayEvents.map(event => {
              const statusColor = showStatusColors
                ? getStatusColor(event.status)
                : event.color || '#f25842'

              return (
                <Pressable
                  key={event.id}
                  style={[
                    styles.eventCard,
                    { borderLeftColor: statusColor },
                  ]}
                  onPress={() => onEventPress?.(event)}
                >
                  <View style={styles.eventHeader}>
                    <View style={styles.eventTimeContainer}>
                      <Ionicons name="time-outline" size={18} color="#6b7280" />
                      <Text style={styles.eventTime}>
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
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColor },
                      ]}
                    >
                      <Ionicons
                        name={getStatusIcon(event.status) as any}
                        size={12}
                        color="#ffffff"
                      />
                      <Text style={styles.statusText}>
                        {event.status.charAt(0).toUpperCase() +
                          event.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.eventTitle}>{event.title}</Text>

                  <View style={styles.eventDetails}>
                    {event.provider && (
                      <View style={styles.eventDetailRow}>
                        <Ionicons name="person-outline" size={14} color="#6b7280" />
                        <Text style={styles.eventDetailText}>
                          Provider: {event.provider}
                        </Text>
                      </View>
                    )}
                    {event.customer && (
                      <View style={styles.eventDetailRow}>
                        <Ionicons name="person-outline" size={14} color="#6b7280" />
                        <Text style={styles.eventDetailText}>
                          Customer: {event.customer}
                        </Text>
                      </View>
                    )}
                    {event.price && (
                      <View style={styles.eventDetailRow}>
                        <Ionicons name="cash-outline" size={14} color="#10b981" />
                        <Text style={styles.eventDetailPrice}>
                          {event.currency || 'GBP'} {event.price.toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              )
            })}
          </ScrollView>
        )}
      </View>
    )
  }

  if (viewMode === 'list') {
    return (
      <View style={styles.listViewContainer}>
        {displayEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        ) : (
          <ScrollView style={styles.eventsList}>
            {displayEvents.map(event => {
              const statusColor = showStatusColors
                ? getStatusColor(event.status)
                : event.color || '#f25842'

              return (
                <Pressable
                  key={event.id}
                  style={styles.listEventCard}
                  onPress={() => onEventPress?.(event)}
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
                    <View style={styles.listEventHeader}>
                      <Text style={styles.listEventTitle}>{event.title}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusColor },
                        ]}
                      >
                        <Ionicons
                          name={getStatusIcon(event.status) as any}
                          size={12}
                          color="#ffffff"
                        />
                        <Text style={styles.statusText}>
                          {event.status.charAt(0).toUpperCase() +
                            event.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.listEventDateFull}>
                      {event.start.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      •{' '}
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

                    <View style={styles.listEventDetails}>
                      {event.provider && (
                        <Text style={styles.listEventDetail}>
                          <Ionicons name="person" size={12} color="#6b7280" />{' '}
                          {event.provider}
                        </Text>
                      )}
                      {event.customer && (
                        <Text style={styles.listEventDetail}>
                          <Ionicons name="person" size={12} color="#6b7280" />{' '}
                          {event.customer}
                        </Text>
                      )}
                      {event.price && (
                        <Text style={styles.listEventPrice}>
                          <Ionicons name="card" size={12} color="#10b981" />{' '}
                          {event.currency || '$'}
                          {event.price}
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              )
            })}
          </ScrollView>
        )}
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  dayViewContainer: {
    padding: 16,
  },
  listViewContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  eventsList: {
    maxHeight: 400,
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
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
    textTransform: 'capitalize',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  eventDetailPrice: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  // List View Styles
  listEventCard: {
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
    minWidth: 60,
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
  listEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  listEventDateFull: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  listEventDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  listEventDetail: {
    fontSize: 14,
    color: '#374151',
  },
  listEventPrice: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
})

