/**
 * TimeSlotSelector Component
 * Displays and handles time slot selection for booking
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { slotCalculator } from '@/lib/utils/slot-calculator'
import { getAvailableTimeSlots } from '@/lib/utils/booking-slots'
import { getCurrencySymbol } from '@/lib/utils/currency'
import type { TimeSlotSelectorProps, TimeSlot, ServiceOption } from './types'

export const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({
  listingId,
  selectedDate,
  selectedService,
  onSlotSelect,
  utility,
  loading: externalLoading = false,
}) => {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  useEffect(() => {
    if (selectedDate && (utility === 'getAvailableTimeSlots' || selectedService)) {
      loadSlots()
    }
  }, [selectedDate, selectedService, utility])

  const loadSlots = async () => {
    if (!selectedDate) return

    setLoading(true)
    try {
      let loadedSlots: TimeSlot[] = []

      if (utility === 'slotCalculator') {
        // Use slotCalculator utility
        if (!selectedService) {
          setSlots([])
          setLoading(false)
          return
        }

        const calculatedSlots = await slotCalculator.calculateAvailableSlots(
          listingId,
          selectedDate,
          selectedService.duration,
          selectedService.price,
          selectedService.name,
          selectedService.color
        )

        loadedSlots = calculatedSlots.map(slot => ({
          id: slot.startDateTime,
          start: slot.start,
          end: slot.end,
          startDateTime: slot.startDateTime,
          endDateTime: slot.endDateTime,
          duration: slot.duration,
          isAvailable: slot.isAvailable,
          price: slot.price,
          currency: slot.currency,
          serviceName: slot.serviceName,
          serviceColor: slot.serviceColor,
          conflictReason: slot.conflictReason,
        }))
      } else {
        // Use getAvailableTimeSlots utility
        const availableSlots = await getAvailableTimeSlots(listingId, selectedDate)

        loadedSlots = availableSlots.map(slot => ({
          id: slot.id,
          start: slot.start,
          end: slot.end,
          duration: slot.duration,
          isAvailable: slot.isAvailable,
          price: slot.price,
          serviceName: slot.serviceName,
        }))
      }

      setSlots(loadedSlots)
    } catch (error) {
      console.error('Error loading time slots:', error)
      Alert.alert('Error', 'Failed to load available time slots')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }

  const handleSlotPress = (slot: TimeSlot) => {
    if (!slot.isAvailable) return

    setSelectedSlot(slot)
    onSlotSelect(slot)
  }

  const isLoading = loading || externalLoading

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#f25842" />
        <Text style={styles.loadingText}>Loading available times...</Text>
      </View>
    )
  }

  if (slots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
        <Text style={styles.emptyText}>No available times for this date</Text>
        <Text style={styles.emptySubtext}>Try selecting a different date</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Available Times -{' '}
        {new Date(selectedDate).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.slotsScroll}
      >
        {slots.map((slot, index) => {
          const isSelected = selectedSlot?.start === slot.start
          const slotKey = slot.id || `slot-${index}`

          return (
            <Pressable
              key={slotKey}
              style={[
                styles.timeSlot,
                !slot.isAvailable && styles.timeSlotUnavailable,
                isSelected && styles.timeSlotSelected,
                slot.serviceColor &&
                  slot.isAvailable && {
                    backgroundColor: slot.serviceColor + '20',
                    borderColor: slot.serviceColor,
                    borderWidth: 2,
                  },
              ]}
              onPress={() => handleSlotPress(slot)}
              disabled={!slot.isAvailable}
            >
              <Text
                style={[
                  styles.timeSlotText,
                  !slot.isAvailable && styles.timeSlotTextUnavailable,
                  isSelected && styles.timeSlotTextSelected,
                  slot.serviceColor &&
                    slot.isAvailable && {
                      color: slot.serviceColor,
                    },
                ]}
              >
                {slot.start}
              </Text>
              {slot.price && slot.isAvailable && (
                <Text
                  style={[
                    styles.timeSlotPrice,
                    isSelected && styles.timeSlotPriceSelected,
                  ]}
                >
                  {slot.currency
                    ? getCurrencySymbol(slot.currency)
                    : '£'}
                  {slot.price}
                </Text>
              )}
              {!slot.isAvailable && slot.conflictReason && (
                <View style={styles.unavailableOverlay}>
                  <Text style={styles.unavailableText}>
                    {slot.conflictReason}
                  </Text>
                </View>
              )}
              {!slot.isAvailable && !slot.conflictReason && (
                <View style={styles.unavailableOverlay}>
                  <Text style={styles.unavailableText}>Booked</Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  slotsScroll: {
    paddingBottom: 8,
  },
  timeSlot: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    minWidth: 70,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timeSlotUnavailable: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    opacity: 0.5,
  },
  timeSlotSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
  },
  timeSlotTextUnavailable: {
    color: '#6b7280',
  },
  timeSlotTextSelected: {
    color: '#ffffff',
  },
  timeSlotPrice: {
    fontSize: 10,
    color: '#f25842',
    marginTop: 2,
    fontWeight: '500',
  },
  timeSlotPriceSelected: {
    color: '#ffffff',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: {
    fontSize: 10,
    color: '#ef4444',
    fontWeight: '600',
  },
})

