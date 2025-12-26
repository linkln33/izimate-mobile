/**
 * Subscription Booking Component
 * Handles subscription booking with billing cycle selection and auto-renewal
 */

import React, { useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, TextInput, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { colors, spacing, borderRadius, elevation } from '@/lib/design-system'
import type { Listing } from '@/lib/types'

interface SubscriptionBookingProps {
  listing: Listing
  providerName: string
  onBookingSelect: (selection: {
    startDate: string
    billingCycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    price: number
    currency: string
    autoRenew: boolean
    trialDays?: number
  }) => void
  onClose: () => void
  visible: boolean
}

export function SubscriptionBooking({
  listing,
  providerName,
  onBookingSelect,
  onClose,
  visible,
}: SubscriptionBookingProps) {
  const listingAny = listing as any
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>(
    listingAny.subscription_billing_cycle || 'monthly'
  )
  const [autoRenew, setAutoRenew] = useState(listingAny.subscription_auto_renew ?? true)
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  if (!visible) return null

  const price = listing.budget_min || 0
  const currency = listing.currency || 'GBP'
  const trialDays = listingAny.subscription_trial_days

  const handleConfirm = () => {
    if (!startDate) {
      Alert.alert('Error', 'Please select a start date')
      return
    }

    onBookingSelect({
      startDate,
      billingCycle: selectedBillingCycle,
      price,
      currency,
      autoRenew,
      trialDays,
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
          <Text style={styles.headerTitle}>Subscribe</Text>
          <View style={styles.placeholder} />
        </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{listing.title}</Text>
          <Text style={styles.summarySubtitle}>with {providerName}</Text>
        </View>

        {/* Billing Cycle Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing Cycle</Text>
          <View style={styles.billingCycleButtons}>
            {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map((cycle) => (
              <Pressable
                key={cycle}
                style={[
                  styles.billingCycleButton,
                  selectedBillingCycle === cycle && styles.billingCycleButtonActive,
                ]}
                onPress={() => setSelectedBillingCycle(cycle)}
              >
                <Text
                  style={[
                    styles.billingCycleButtonText,
                    selectedBillingCycle === cycle && styles.billingCycleButtonTextActive,
                  ]}
                >
                  {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Start Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start Date</Text>
          <TextInput
            style={styles.dateInput}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.helpText}>
            When would you like your subscription to start?
          </Text>
        </View>

        {/* Price Display */}
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Price per {selectedBillingCycle}</Text>
          <Text style={styles.priceValue}>
            {formatPrice(price, currency)}
          </Text>
        </View>

        {/* Trial Period */}
        {trialDays && trialDays > 0 && (
          <View style={styles.trialSection}>
            <Ionicons name="gift-outline" size={20} color="#10b981" />
            <Text style={styles.trialText}>
              {trialDays} day{trialDays > 1 ? 's' : ''} free trial
            </Text>
          </View>
        )}

        {/* Auto-Renewal Toggle */}
        <View style={styles.section}>
          <Pressable
            style={styles.toggleRow}
            onPress={() => setAutoRenew(!autoRenew)}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Auto-Renewal</Text>
              <Text style={styles.toggleSubtext}>
                Automatically renew subscription at the end of each billing cycle
              </Text>
            </View>
            <View
              style={[
                styles.toggle,
                autoRenew && styles.toggleActive,
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  autoRenew && styles.toggleThumbActive,
                ]}
              />
            </View>
          </Pressable>
        </View>

        {/* Confirm Button */}
        <Pressable style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>
            Subscribe for {formatPrice(price, currency)}/{selectedBillingCycle}
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
  billingCycleButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  billingCycleButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  billingCycleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  billingCycleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
  },
  billingCycleButtonTextActive: {
    color: colors.onPrimary,
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
  trialSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successContainer,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  trialText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  toggleSubtext: {
    fontSize: 13,
    color: colors.gray[600],
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.gray[300],
    padding: 3,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    ...elevation.level2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
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

