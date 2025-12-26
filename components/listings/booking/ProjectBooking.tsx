/**
 * Project Booking Component
 * Handles project-based bookings (Freelance) with delivery date selection (no time slots)
 */

import React, { useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, TextInput, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format, addDays } from 'date-fns'
import { colors, spacing, borderRadius, elevation } from '@/lib/design-system'
import type { Listing } from '@/lib/types'

interface ProjectBookingProps {
  listing: Listing
  providerName: string
  onBookingSelect: (selection: {
    deliveryDate: string
    projectScope?: string
    price: number
    currency: string
  }) => void
  onClose: () => void
  visible: boolean
}

export function ProjectBooking({
  listing,
  providerName,
  onBookingSelect,
  onClose,
  visible,
}: ProjectBookingProps) {
  const listingAny = listing as any
  const [deliveryDate, setDeliveryDate] = useState(
    format(addDays(new Date(), listingAny.freelance_delivery_days || 7), 'yyyy-MM-dd')
  )
  const [projectScope, setProjectScope] = useState('')

  if (!visible) return null

  const price = listing.budget_min || 0
  const currency = listing.currency || 'GBP'
  const deliveryDays = listingAny.freelance_delivery_days || 7
  const revisionsIncluded = listingAny.freelance_revisions_included || 0

  const handleConfirm = () => {
    if (!deliveryDate) {
      Alert.alert('Error', 'Please select a delivery date')
      return
    }

    const selectedDate = new Date(deliveryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate <= today) {
      Alert.alert('Error', 'Delivery date must be in the future')
      return
    }

    onBookingSelect({
      deliveryDate,
      projectScope: projectScope.trim() || undefined,
      price,
      currency,
    })
  }

  const formatPrice = (amount: number, curr: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: curr || 'GBP',
    }).format(amount)
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.gray[700]} />
          </Pressable>
          <Text style={styles.headerTitle}>Book Project</Text>
          <View style={styles.placeholder} />
        </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{listing.title}</Text>
          <Text style={styles.summarySubtitle}>with {providerName}</Text>
        </View>

        {/* Project Scope */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Scope (Optional)</Text>
          <TextInput
            style={styles.scopeInput}
            value={projectScope}
            onChangeText={setProjectScope}
            placeholder="Describe what you need (e.g., 3 TikTok videos, logo design, blog post)..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.helpText}>
            Provide details about your project requirements
          </Text>
        </View>

        {/* Delivery Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expected Delivery Date *</Text>
          <TextInput
            style={styles.dateInput}
            value={deliveryDate}
            onChangeText={setDeliveryDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.helpText}>
            When do you need this project completed? (Estimated {deliveryDays} day{deliveryDays !== 1 ? 's' : ''} turnaround)
          </Text>
        </View>

        {/* Project Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#6b7280" />
            <Text style={styles.detailText}>
              Estimated delivery: {deliveryDays} day{deliveryDays !== 1 ? 's' : ''}
            </Text>
          </View>
          {revisionsIncluded > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="refresh-outline" size={20} color="#6b7280" />
              <Text style={styles.detailText}>
                {revisionsIncluded} revision{revisionsIncluded !== 1 ? 's' : ''} included
              </Text>
            </View>
          )}
        </View>

        {/* Price Display */}
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Project Price</Text>
          <Text style={styles.priceValue}>
            {formatPrice(price, currency)}
          </Text>
        </View>

        {/* Confirm Button */}
        <Pressable style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>
            Book Project for {formatPrice(price, currency)}
          </Text>
        </Pressable>
      </ScrollView>
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
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  summary: {
    marginBottom: spacing.xl,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  summarySubtitle: {
    fontSize: 14,
    color: colors.gray[600],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  scopeInput: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[300],
    minHeight: 100,
  },
  dateInput: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  helpText: {
    fontSize: 12,
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
  detailsSection: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailText: {
    fontSize: 14,
    color: colors.gray[700],
  },
  priceSection: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: spacing.xs,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl * 2,
    ...elevation.level2,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
})

