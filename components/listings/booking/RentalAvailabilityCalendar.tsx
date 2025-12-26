/**
 * Rental Availability Calendar Component
 * Allows rental owners to mark date ranges as available/unavailable
 */

import React, { useState, useEffect } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isBefore, startOfDay } from 'date-fns'
import { colors, spacing, borderRadius, elevation } from '@/lib/design-system'

export interface AvailabilityPeriod {
  id: string
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  is_available: boolean // true = available, false = blocked
  notes?: string
}

interface RentalAvailabilityCalendarProps {
  availabilityPeriods: AvailabilityPeriod[]
  onAvailabilityChange: (periods: AvailabilityPeriod[]) => void
}

export function RentalAvailabilityCalendar({
  availabilityPeriods,
  onAvailabilityChange,
}: RentalAvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionMode, setSelectionMode] = useState<'available' | 'blocked'>('available')

  // Get all days in current month
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get first day of week for the month
  const firstDayOfWeek = monthStart.getDay()
  const daysBeforeMonth = Array.from({ length: firstDayOfWeek }, (_, i) => i)

  // Check if a date is in an availability period
  const getDateStatus = (date: Date): 'available' | 'blocked' | 'none' => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    for (const period of availabilityPeriods) {
      if (dateStr >= period.start_date && dateStr <= period.end_date) {
        return period.is_available ? 'available' : 'blocked'
      }
    }
    
    return 'none'
  }

  // Handle date selection
  const handleDatePress = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) {
      Alert.alert('Invalid Date', 'Cannot select past dates')
      return
    }

    if (!isSelecting) {
      // Start new selection
      setSelectedStartDate(date)
      setSelectedEndDate(date)
      setIsSelecting(true)
    } else {
      // Complete selection
      if (selectedStartDate) {
        const start = selectedStartDate < date ? selectedStartDate : date
        const end = selectedStartDate < date ? date : selectedStartDate
        
        setSelectedEndDate(end)
        
        // Create or update availability period
        const newPeriod: AvailabilityPeriod = {
          id: `period-${Date.now()}`,
          start_date: format(start, 'yyyy-MM-dd'),
          end_date: format(end, 'yyyy-MM-dd'),
          is_available: selectionMode === 'available',
        }
        
        // Remove overlapping periods and add new one
        const updatedPeriods = removeOverlappingPeriods(availabilityPeriods, newPeriod)
        updatedPeriods.push(newPeriod)
        
        onAvailabilityChange(updatedPeriods)
        
        // Reset selection
        setSelectedStartDate(null)
        setSelectedEndDate(null)
        setIsSelecting(false)
      }
    }
  }

  // Remove overlapping periods
  const removeOverlappingPeriods = (
    existing: AvailabilityPeriod[],
    newPeriod: AvailabilityPeriod
  ): AvailabilityPeriod[] => {
    return existing.filter(period => {
      // Check if periods overlap
      const periodStart = new Date(period.start_date)
      const periodEnd = new Date(period.end_date)
      const newStart = new Date(newPeriod.start_date)
      const newEnd = new Date(newPeriod.end_date)
      
      // If periods don't overlap, keep the existing period
      if (periodEnd < newStart || periodStart > newEnd) {
        return true
      }
      
      // If they overlap, remove the existing period
      return false
    })
  }

  // Check if date is in current selection range
  const isInSelection = (date: Date): boolean => {
    if (!selectedStartDate || !selectedEndDate) return false
    const start = selectedStartDate < selectedEndDate ? selectedStartDate : selectedEndDate
    const end = selectedStartDate < selectedEndDate ? selectedEndDate : selectedStartDate
    return date >= start && date <= end
  }

  // Get day style based on status
  const getDayStyle = (date: Date) => {
    const status = getDateStatus(date)
    const inSelection = isInSelection(date)
    const isToday = isSameDay(date, new Date())
    const isPast = isBefore(date, startOfDay(new Date()))
    
    if (inSelection) {
      return [
        styles.day,
        styles.daySelected,
        selectionMode === 'available' ? styles.daySelectedAvailable : styles.daySelectedBlocked,
      ]
    }
    
    if (isPast) {
      return [styles.day, styles.dayPast]
    }
    
    if (status === 'available') {
      return [styles.day, styles.dayAvailable]
    }
    
    if (status === 'blocked') {
      return [styles.day, styles.dayBlocked]
    }
    
    return [styles.day, styles.dayDefault]
  }

  // Clear all availability
  const handleClearAll = () => {
    Alert.alert(
      'Clear All Availability',
      'Are you sure you want to clear all availability periods?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => onAvailabilityChange([]),
        },
      ]
    )
  }

  // Mark entire month as available
  const handleMarkMonthAvailable = () => {
    const newPeriod: AvailabilityPeriod = {
      id: `period-${Date.now()}`,
      start_date: format(monthStart, 'yyyy-MM-dd'),
      end_date: format(monthEnd, 'yyyy-MM-dd'),
      is_available: true,
    }
    
    const updatedPeriods = removeOverlappingPeriods(availabilityPeriods, newPeriod)
    updatedPeriods.push(newPeriod)
    onAvailabilityChange(updatedPeriods)
  }

  // Mark entire month as blocked
  const handleMarkMonthBlocked = () => {
    const newPeriod: AvailabilityPeriod = {
      id: `period-${Date.now()}`,
      start_date: format(monthStart, 'yyyy-MM-dd'),
      end_date: format(monthEnd, 'yyyy-MM-dd'),
      is_available: false,
    }
    
    const updatedPeriods = removeOverlappingPeriods(availabilityPeriods, newPeriod)
    updatedPeriods.push(newPeriod)
    onAvailabilityChange(updatedPeriods)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Set Availability</Text>
        <Text style={styles.subtitle}>
          Select date ranges to mark as available or blocked
        </Text>
      </View>

      {/* Mode Selection */}
      <View style={styles.modeContainer}>
        <Pressable
          style={[
            styles.modeButton,
            selectionMode === 'available' && styles.modeButtonActive,
            selectionMode === 'available' && styles.modeButtonAvailable,
          ]}
          onPress={() => {
            setSelectionMode('available')
            setIsSelecting(false)
            setSelectedStartDate(null)
            setSelectedEndDate(null)
          }}
        >
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={selectionMode === 'available' ? '#ffffff' : '#10b981'}
          />
          <Text
            style={[
              styles.modeButtonText,
              selectionMode === 'available' && styles.modeButtonTextActive,
            ]}
          >
            Mark Available
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.modeButton,
            selectionMode === 'blocked' && styles.modeButtonActive,
            selectionMode === 'blocked' && styles.modeButtonBlocked,
          ]}
          onPress={() => {
            setSelectionMode('blocked')
            setIsSelecting(false)
            setSelectedStartDate(null)
            setSelectedEndDate(null)
          }}
        >
          <Ionicons
            name="close-circle"
            size={20}
            color={selectionMode === 'blocked' ? '#ffffff' : '#ef4444'}
          />
          <Text
            style={[
              styles.modeButtonText,
              selectionMode === 'blocked' && styles.modeButtonTextActive,
            ]}
          >
            Mark Blocked
          </Text>
        </Pressable>
      </View>

      {/* Calendar Navigation */}
      <View style={styles.calendarHeader}>
        <Pressable
          style={styles.navButton}
          onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>

        <Text style={styles.monthTitle}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>

        <Pressable
          style={styles.navButton}
          onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendar}>
        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.dayHeader}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Days */}
        <View style={styles.daysContainer}>
          {/* Empty days before month start */}
          {daysBeforeMonth.map((_, index) => (
            <View key={`empty-${index}`} style={styles.day} />
          ))}

          {/* Days in month */}
          {daysInMonth.map((date) => {
            const status = getDateStatus(date)
            const inSelection = isInSelection(date)
            const isToday = isSameDay(date, new Date())
            const isPast = isBefore(date, startOfDay(new Date()))

            return (
              <Pressable
                key={date.toISOString()}
                style={getDayStyle(date)}
                onPress={() => !isPast && handleDatePress(date)}
                disabled={isPast}
              >
                <Text
                  style={[
                    styles.dayText,
                    status === 'available' && styles.dayTextAvailable,
                    status === 'blocked' && styles.dayTextBlocked,
                    inSelection && styles.dayTextSelected,
                    isToday && styles.dayTextToday,
                    isPast && styles.dayTextPast,
                  ]}
                >
                  {format(date, 'd')}
                </Text>
                {status === 'available' && (
                  <View style={styles.statusIndicator}>
                    <Ionicons name="checkmark" size={12} color="#10b981" />
                  </View>
                )}
                {status === 'blocked' && (
                  <View style={styles.statusIndicator}>
                    <Ionicons name="close" size={12} color="#ef4444" />
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable style={styles.quickActionButton} onPress={handleMarkMonthAvailable}>
          <Ionicons name="calendar" size={18} color={colors.primary} />
          <Text style={styles.quickActionText}>Mark Month Available</Text>
        </Pressable>

        <Pressable style={styles.quickActionButton} onPress={handleMarkMonthBlocked}>
          <Ionicons name="ban" size={18} color={colors.error} />
          <Text style={styles.quickActionText}>Mark Month Blocked</Text>
        </Pressable>

        <Pressable style={styles.quickActionButton} onPress={handleClearAll}>
          <Ionicons name="trash-outline" size={18} color={colors.gray[600]} />
          <Text style={styles.quickActionText}>Clear All</Text>
        </Pressable>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          {isSelecting
            ? 'Select end date to complete the range'
            : 'Tap a date to start selecting a range, then tap another date to complete'}
        </Text>
      </View>

      {/* Availability Summary */}
      {availabilityPeriods.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Availability Periods</Text>
          <ScrollView style={styles.summaryList}>
            {availabilityPeriods.map((period) => (
              <View key={period.id} style={styles.summaryItem}>
                <View
                  style={[
                    styles.summaryIndicator,
                    period.is_available
                      ? styles.summaryIndicatorAvailable
                      : styles.summaryIndicatorBlocked,
                  ]}
                />
                <Text style={styles.summaryText}>
                  {format(new Date(period.start_date), 'MMM d')} -{' '}
                  {format(new Date(period.end_date), 'MMM d, yyyy')}
                </Text>
                <Text
                  style={[
                    styles.summaryStatus,
                    period.is_available
                      ? styles.summaryStatusAvailable
                      : styles.summaryStatusBlocked,
                  ]}
                >
                  {period.is_available ? 'Available' : 'Blocked'}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray[600],
  },
  modeContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray[300],
    backgroundColor: '#ffffff',
  },
  modeButtonActive: {
    borderWidth: 2,
  },
  modeButtonAvailable: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  modeButtonBlocked: {
    borderColor: colors.error,
    backgroundColor: colors.error,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  modeButtonTextActive: {
    color: '#ffffff',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
  },
  calendar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[600],
    paddingVertical: spacing.xs,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    margin: 2,
    position: 'relative',
  },
  dayDefault: {
    backgroundColor: colors.gray[50],
  },
  dayAvailable: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: colors.success,
  },
  dayBlocked: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: colors.error,
  },
  daySelected: {
    borderWidth: 2,
  },
  daySelectedAvailable: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  daySelectedBlocked: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  dayPast: {
    backgroundColor: colors.gray[100],
    opacity: 0.5,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[900],
  },
  dayTextAvailable: {
    color: colors.success,
  },
  dayTextBlocked: {
    color: colors.error,
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  dayTextToday: {
    fontWeight: 'bold',
  },
  dayTextPast: {
    color: colors.gray[400],
  },
  statusIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  quickActions: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray[700],
  },
  instructions: {
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  instructionsText: {
    fontSize: 13,
    color: colors.gray[600],
    textAlign: 'center',
  },
  summary: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  summaryList: {
    maxHeight: 150,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  summaryIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  summaryIndicatorAvailable: {
    backgroundColor: colors.success,
  },
  summaryIndicatorBlocked: {
    backgroundColor: colors.error,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    color: colors.gray[900],
  },
  summaryStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryStatusAvailable: {
    color: colors.success,
  },
  summaryStatusBlocked: {
    color: colors.error,
  },
})

