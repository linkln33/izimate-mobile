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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { BookingFormProps, RecurringPattern } from './types'
import { RecurringBookingForm } from '../booking/RecurringBookingManager'

export const BookingForm: React.FC<BookingFormProps> = ({
  bookingSelection,
  providerName,
  onComplete,
  onCancel,
  allowRecurring = false,
  allowNotes = true,
  loading = false,
}) => {
  const [customerNotes, setCustomerNotes] = useState('')
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [recurringPattern, setRecurringPattern] =
    useState<RecurringPattern | null>(null)

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
    }).format(price)
  }

  const handleSubmit = async () => {
    await onComplete({
      notes: allowNotes ? customerNotes.trim() || undefined : undefined,
      recurringPattern: recurringPattern || undefined,
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
                <Ionicons name="repeat" size={20} color="#007AFF" />
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
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                  </Pressable>
                </View>
              )}
            </>
          )}

          {/* Booking Notice */}
          <View style={styles.notice}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  summaryValuePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  notesSection: {
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  notesInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recurringButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 12,
  },
  recurringButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  recurringInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 12,
  },
  recurringInfoText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '500',
    flex: 1,
  },
  notice: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 15,
    alignItems: 'flex-start',
  },
  noticeText: {
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
})

