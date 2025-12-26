/**
 * BookingForm Component
 * Handles booking completion with notes and recurring support
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { BookingFormProps, RecurringPattern } from './types'
import { RecurringBookingForm } from '../booking/RecurringBookingManager'
import { colors, spacing, borderRadius, elevation } from '@/lib/design-system'

export const BookingForm: React.FC<BookingFormProps> = ({
  bookingSelection,
  providerName,
  onComplete,
  onCancel,
  allowRecurring = false,
  allowNotes = true,
  loading = false,
  listingType,
  maxParticipants,
}) => {
  const [customerNotes, setCustomerNotes] = useState('')
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [recurringPattern, setRecurringPattern] =
    useState<RecurringPattern | null>(null)
  // Conditional fields
  const [participantCount, setParticipantCount] = useState<string>('1')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
    }).format(price)
  }

  const handleSubmit = async () => {
    // Validate Experience participant count
    if (listingType === 'experience' && maxParticipants) {
      const count = parseInt(participantCount) || 1
      if (count > maxParticipants) {
        Alert.alert(
          'Invalid Participant Count',
          `Maximum ${maxParticipants} participants allowed.`
        )
        return
      }
      if (count < 1) {
        Alert.alert('Invalid Participant Count', 'At least 1 participant is required.')
        return
      }
    }

    await onComplete({
      notes: allowNotes ? customerNotes.trim() || undefined : undefined,
      recurringPattern: recurringPattern || undefined,
      participantCount: listingType === 'experience' ? parseInt(participantCount) || 1 : undefined,
      deliveryAddress: (listingType === 'delivery' || listingType === 'taxi') ? deliveryAddress.trim() || undefined : undefined,
      pickupAddress: listingType === 'taxi' ? pickupAddress.trim() || undefined : undefined,
      estimatedArrival: listingType === 'delivery' ? undefined : undefined, // Can be calculated later
    })
  }

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Confirm Booking</Text>
          <Pressable
            onPress={handleSubmit}
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Book</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Booking Summary */}
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service:</Text>
              <Text style={styles.summaryValue}>{bookingSelection.serviceName}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date:</Text>
              <Text style={styles.summaryValue}>
                {new Date(bookingSelection.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time:</Text>
              <Text style={styles.summaryValue}>
                {bookingSelection.time} ({bookingSelection.durationMinutes} min)
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Price:</Text>
              <Text style={styles.summaryValuePrice}>
                {formatPrice(
                  bookingSelection.servicePrice,
                  bookingSelection.currency || 'GBP'
                )}
              </Text>
            </View>
          </View>

          {/* Experience: Participant Count */}
          {listingType === 'experience' && maxParticipants && (
            <View style={styles.conditionalSection}>
              <Text style={styles.conditionalLabel}>
                Number of Participants *
              </Text>
              <TextInput
                style={styles.conditionalInput}
                value={participantCount}
                onChangeText={setParticipantCount}
                placeholder={`1-${maxParticipants}`}
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.conditionalHelp}>
                Maximum {maxParticipants} participants allowed
              </Text>
            </View>
          )}

          {/* Delivery: Delivery Address */}
          {listingType === 'delivery' && (
            <View style={styles.conditionalSection}>
              <Text style={styles.conditionalLabel}>
                Delivery Address *
              </Text>
              <TextInput
                style={styles.conditionalInput}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="Enter delivery address..."
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                placeholderTextColor="#9ca3af"
              />
            </View>
          )}

          {/* Taxi: Pickup and Drop-off Addresses */}
          {listingType === 'taxi' && (
            <>
              <View style={styles.conditionalSection}>
                <Text style={styles.conditionalLabel}>
                  Pickup Address *
                </Text>
                <TextInput
                  style={styles.conditionalInput}
                  value={pickupAddress}
                  onChangeText={setPickupAddress}
                  placeholder="Enter pickup address..."
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  placeholderTextColor={colors.gray[400]}
                />
              </View>
              <View style={styles.conditionalSection}>
                <Text style={styles.conditionalLabel}>
                  Drop-off Address *
                </Text>
                <TextInput
                  style={styles.conditionalInput}
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  placeholder="Enter drop-off address..."
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  placeholderTextColor={colors.gray[400]}
                />
              </View>
            </>
          )}

          {/* Customer Notes */}
          {allowNotes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>
                Additional Notes (Optional)
              </Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Any special requests or information for the provider..."
                value={customerNotes}
                onChangeText={setCustomerNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#9ca3af"
              />
            </View>
          )}

          {/* Recurring Booking */}
          {allowRecurring && (
            <>
              <Pressable
                style={styles.recurringButton}
                onPress={() => setShowRecurringForm(true)}
              >
                <Ionicons name="repeat" size={20} color={colors.secondary} />
                <Text style={styles.recurringButtonText}>Make Recurring</Text>
              </Pressable>

              {recurringPattern && (
                <View style={styles.recurringInfo}>
                  <Text style={styles.recurringInfoText}>
                    Recurring: {recurringPattern.recurrencePattern} until{' '}
                    {new Date(
                      recurringPattern.recurrenceEndDate
                    ).toLocaleDateString()}
                  </Text>
                  <Pressable onPress={() => setRecurringPattern(null)}>
                    <Ionicons name="close-circle" size={18} color={colors.error} />
                  </Pressable>
                </View>
              )}
            </>
          )}

          {/* Booking Notice */}
          <View style={styles.notice}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Text style={styles.noticeText}>
              Your booking request will be sent to {providerName}. You'll receive
              a confirmation once they approve your request.
            </Text>
          </View>
        </ScrollView>

        {/* Recurring Booking Form Modal */}
        {allowRecurring && (
          <RecurringBookingForm
            visible={showRecurringForm}
            onClose={() => setShowRecurringForm(false)}
            onConfirm={(pattern) => {
              setRecurringPattern(pattern)
              setShowRecurringForm(false)
            }}
            initialDate={bookingSelection.date}
            initialStartTime={bookingSelection.time}
            initialEndTime={bookingSelection.time}
          />
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    ...elevation.level1,
  },
  cancelButton: {
    padding: spacing.xs,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.secondary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    minWidth: 60,
    alignItems: 'center',
    ...elevation.level2,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  summary: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.gray[600],
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[900],
    flex: 1,
    textAlign: 'right',
  },
  summaryValuePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  notesSection: {
    marginBottom: spacing.lg,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  notesInput: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.gray[900],
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  recurringButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.secondaryContainer,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.secondary200,
    marginBottom: spacing.md,
  },
  recurringButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  recurringInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.successContainer,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.successLight,
    marginBottom: spacing.md,
  },
  recurringInfoText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '500',
    flex: 1,
  },
  notice: {
    flexDirection: 'row',
    backgroundColor: colors.infoContainer,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  noticeText: {
    fontSize: 14,
    color: colors.info,
    marginLeft: spacing.xs,
    flex: 1,
    lineHeight: 20,
  },
  conditionalSection: {
    marginBottom: spacing.lg,
  },
  conditionalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  conditionalInput: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[300],
    minHeight: 44,
  },
  conditionalHelp: {
    fontSize: 12,
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
})

