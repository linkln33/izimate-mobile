/**
 * Rental Booking Calendar Component
 * Allows customers to view available dates and book rental periods
 */

import React, { useState, useEffect } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isBefore, startOfDay, addDays, differenceInDays } from 'date-fns'
import { colors, spacing, borderRadius, elevation } from '@/lib/design-system'
import { supabase } from '@/lib/supabase'
import type { AvailabilityPeriod } from './RentalAvailabilityCalendar'

interface RentalBookingCalendarProps {
  listingId: string
  listingTitle: string
  providerId: string
  rentalDurationType: 'hourly' | 'daily' | 'weekly' | 'monthly'
  rentalRate: number
  currency: string
  availabilityPeriods: AvailabilityPeriod[]
  onBookingSelect: (selection: {
    startDate: string
    endDate: string
    duration: number
    totalPrice: number
  }) => void
  onClose: () => void
  visible: boolean
}

export function RentalBookingCalendar({
  listingId,
  listingTitle,
  providerId,
  rentalDurationType,
  rentalRate,
  currency,
  availabilityPeriods,
  onBookingSelect,
  onClose,
  visible,
}: RentalBookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null)
  const [existingBookings, setExistingBookings] = useState<Array<{ start_date: string; end_date: string }>>([])
  const [loading, setLoading] = useState(false)

  // Get all days in current month
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get first day of week for the month
  const firstDayOfWeek = monthStart.getDay()
  const daysBeforeMonth = Array.from({ length: firstDayOfWeek }, (_, i) => i)

  // Load existing bookings to check conflicts
  useEffect(() => {
    if (visible && listingId) {
      loadExistingBookings()
    }
  }, [visible, listingId])

  const loadExistingBookings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('listing_id', listingId)
        .in('status', ['pending', 'confirmed'])
        .gte('end_time', new Date().toISOString())

      if (error) throw error

      const bookings = (data || []).map(booking => ({
        start_date: booking.start_time.split('T')[0],
        end_date: booking.end_time.split('T')[0],
      }))

      setExistingBookings(bookings)
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  // Check if a date is available
  const isDateAvailable = (date: Date): boolean => {
    if (isBefore(date, startOfDay(new Date()))) return false

    const dateStr = format(date, 'yyyy-MM-dd')

    // Check if date is in an available period
    const inAvailablePeriod = availabilityPeriods.some(period => {
      if (!period.is_available) return false
      return dateStr >= period.start_date && dateStr <= period.end_date
    })

    if (!inAvailablePeriod) return false

    // Check if date conflicts with existing bookings
    const conflictsWithBooking = existingBookings.some(booking => {
      return dateStr >= booking.start_date && dateStr <= booking.end_date
    })

    return !conflictsWithBooking
  }

  // Check if date is in selection range
  const isInSelection = (date: Date): boolean => {
    if (!selectedStartDate || !selectedEndDate) return false
    const start = selectedStartDate < selectedEndDate ? selectedStartDate : selectedEndDate
    const end = selectedStartDate < selectedEndDate ? selectedEndDate : selectedStartDate
    return date >= start && date <= end
  }

  // Handle date selection
  const handleDatePress = (date: Date) => {
    if (!isDateAvailable(date)) {
      Alert.alert('Date Unavailable', 'This date is not available for booking')
      return
    }

    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      // Start new selection
      setSelectedStartDate(date)
      setSelectedEndDate(null)
    } else {
      // Complete selection
      if (date < selectedStartDate) {
        setSelectedEndDate(selectedStartDate)
        setSelectedStartDate(date)
      } else {
        setSelectedEndDate(date)
      }
    }
  }

  // Calculate total price based on duration
  const calculatePrice = (): number => {
    if (!selectedStartDate || !selectedEndDate) return 0

    const start = selectedStartDate < selectedEndDate ? selectedStartDate : selectedEndDate
    const end = selectedStartDate < selectedEndDate ? selectedEndDate : selectedStartDate

    const days = differenceInDays(end, start) + 1

    switch (rentalDurationType) {
      case 'hourly':
        return rentalRate * days * 24
      case 'daily':
        return rentalRate * days
      case 'weekly':
        return rentalRate * Math.ceil(days / 7)
      case 'monthly':
        return rentalRate * Math.ceil(days / 30)
      default:
        return rentalRate * days
    }
  }

  // Get currency symbol
  const getCurrencySymbol = (code: string): string => {
    const currencyMap: { [key: string]: string } = {
      GBP: '£',
      USD: '$',
      EUR: '€',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥',
      CHF: 'CHF',
      CNY: '¥',
      INR: '₹',
      BRL: 'R$',
      MXN: '$',
      ZAR: 'R',
      NZD: 'NZ$',
      SGD: 'S$',
      HKD: 'HK$',
      NOK: 'kr',
      SEK: 'kr',
      DKK: 'kr',
      PLN: 'zł',
      CZK: 'Kč',
    }
    return currencyMap[code] || code
  }

  const currencySymbol = getCurrencySymbol(currency)

  // Handle booking confirmation
  const handleConfirmBooking = () => {
    if (!selectedStartDate || !selectedEndDate) {
      Alert.alert('Select Dates', 'Please select a start and end date for your rental')
      return
    }

    const start = selectedStartDate < selectedEndDate ? selectedStartDate : selectedEndDate
    const end = selectedStartDate < selectedEndDate ? selectedEndDate : selectedStartDate
    const days = differenceInDays(end, start) + 1
    const totalPrice = calculatePrice()

    onBookingSelect({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      duration: days,
      totalPrice,
    })
  }

  // Get day style
  const getDayStyle = (date: Date) => {
    const available = isDateAvailable(date)
    const inSelection = isInSelection(date)
    const isToday = isSameDay(date, new Date())
    const isPast = isBefore(date, startOfDay(new Date()))

    if (isPast) {
      return [styles.day, styles.dayPast]
    }

    if (inSelection) {
      return [styles.day, styles.daySelected]
    }

    if (available) {
      return [styles.day, styles.dayAvailable]
    }

    return [styles.day, styles.dayUnavailable]
  }

  if (!visible) return null

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Rental Dates</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.gray[700]} />
          </Pressable>
        </View>

        <Text style={styles.subtitle}>{listingTitle}</Text>

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
              const available = isDateAvailable(date)
              const inSelection = isInSelection(date)
              const isToday = isSameDay(date, new Date())
              const isPast = isBefore(date, startOfDay(new Date()))

              return (
                <Pressable
                  key={date.toISOString()}
                  style={getDayStyle(date)}
                  onPress={() => !isPast && available && handleDatePress(date)}
                  disabled={isPast || !available}
                >
                  <Text
                    style={[
                      styles.dayText,
                      available && !isPast && styles.dayTextAvailable,
                      !available && styles.dayTextUnavailable,
                      inSelection && styles.dayTextSelected,
                      isToday && styles.dayTextToday,
                      isPast && styles.dayTextPast,
                    ]}
                  >
                    {format(date, 'd')}
                  </Text>
                  {available && !isPast && (
                    <View style={styles.statusIndicator}>
                      <Ionicons name="checkmark-circle" size={10} color={colors.success} />
                    </View>
                  )}
                  {!available && !isPast && (
                    <View style={styles.statusIndicator}>
                      <Ionicons name="close-circle" size={10} color={colors.error} />
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Selection Summary */}
        {selectedStartDate && selectedEndDate && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Selected Period</Text>
            <Text style={styles.summaryText}>
              {format(selectedStartDate < selectedEndDate ? selectedStartDate : selectedEndDate, 'MMM d')} -{' '}
              {format(selectedStartDate < selectedEndDate ? selectedEndDate : selectedStartDate, 'MMM d, yyyy')}
            </Text>
            <Text style={styles.summaryText}>
              Duration: {differenceInDays(selectedEndDate, selectedStartDate) + 1} {rentalDurationType === 'daily' ? 'days' : rentalDurationType === 'weekly' ? 'weeks' : rentalDurationType === 'monthly' ? 'months' : 'hours'}
            </Text>
            <Text style={styles.priceText}>
              Total: {currencySymbol}{calculatePrice().toFixed(2)}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[
              styles.confirmButton,
              (!selectedStartDate || !selectedEndDate) && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirmBooking}
            disabled={!selectedStartDate || !selectedEndDate}
          >
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          </Pressable>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, styles.legendAvailable]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, styles.legendUnavailable]} />
            <Text style={styles.legendText}>Unavailable</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, styles.legendSelected]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.lg,
    width: '90%',
    maxHeight: '90%',
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gray[900],
  },
  closeButton: {
    padding: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: spacing.lg,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
    marginBottom: spacing.lg,
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
  dayAvailable: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: colors.success,
  },
  dayUnavailable: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: colors.error,
  },
  daySelected: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
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
  dayTextUnavailable: {
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
  summary: {
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: 14,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: colors.gray[300],
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendAvailable: {
    backgroundColor: colors.success,
  },
  legendUnavailable: {
    backgroundColor: colors.error,
  },
  legendSelected: {
    backgroundColor: colors.primary,
  },
  legendText: {
    fontSize: 12,
    color: colors.gray[600],
  },
})

