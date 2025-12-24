import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils/currency'
import type { Listing } from '@/lib/types'

interface CancellationPolicy {
  cancellation_hours?: number
  cancellation_fee_enabled?: boolean
  cancellation_fee_percentage?: number
  cancellation_fee_amount?: number
  refund_policy?: 'full' | 'partial' | 'none'
}

interface CancellationPolicyDisplayProps {
  listing: Listing
  bookingStartTime: string
  serviceSettings?: any | null
}

export function CancellationPolicyDisplay({
  listing,
  bookingStartTime,
  serviceSettings,
}: CancellationPolicyDisplayProps) {
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null)
  const [hoursUntilBooking, setHoursUntilBooking] = useState<number | null>(null)
  const [isWithinWindow, setIsWithinWindow] = useState(false)
  const [cancellationFee, setCancellationFee] = useState<number>(0)

  useEffect(() => {
    loadPolicy()
    calculateTimeUntilBooking()
  }, [listing.id, bookingStartTime, serviceSettings])

  const loadPolicy = async () => {
    try {
      // First try to get from service_settings
      const { data: settingsData } = await supabase
        .from('service_settings')
        .select('cancellation_hours')
        .eq('listing_id', listing.id)
        .single()

      // Get cancellation policy from listing (these fields are on the listing)
      const policyData: CancellationPolicy = {
        cancellation_hours: settingsData?.cancellation_hours || listing.cancellation_hours || 24,
        cancellation_fee_enabled: listing.cancellation_fee_enabled || false,
        cancellation_fee_percentage: listing.cancellation_fee_percentage || undefined,
        cancellation_fee_amount: listing.cancellation_fee_amount || undefined,
        refund_policy: listing.refund_policy || 'full',
      }

      setPolicy(policyData)
    } catch (error) {
      console.error('Error loading cancellation policy:', error)
      // Fallback to defaults
      setPolicy({
        cancellation_hours: 24,
        cancellation_fee_enabled: false,
        refund_policy: 'full',
      })
    }
  }

  const calculateTimeUntilBooking = () => {
    const bookingTime = new Date(bookingStartTime)
    const now = new Date()
    const hoursDiff = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    setHoursUntilBooking(hoursDiff)

    if (policy) {
      const cancellationHours = policy.cancellation_hours || 24
      setIsWithinWindow(hoursDiff < cancellationHours)

      // Calculate fee if within window and fee is enabled
      if (hoursDiff < cancellationHours && policy.cancellation_fee_enabled) {
        if (policy.cancellation_fee_percentage) {
          const basePrice = listing.budget_min || 0
          setCancellationFee((basePrice * policy.cancellation_fee_percentage) / 100)
        } else if (policy.cancellation_fee_amount) {
          setCancellationFee(policy.cancellation_fee_amount)
        }
      }
    }
  }

  if (!policy) {
    return (
      <View style={styles.container}>
        <View style={styles.policyRow}>
          <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
          <Text style={styles.policyText}>
            Free cancellation up to 24 hours before booking
          </Text>
        </View>
      </View>
    )
  }

  const cancellationHours = policy.cancellation_hours || 24
  const refundPolicy = policy.refund_policy || 'full'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="close-circle-outline" size={20} color="#f25842" />
        <Text style={styles.title}>Cancellation Policy</Text>
      </View>

      <View style={styles.policyContent}>
        <View style={styles.policyRow}>
          <Ionicons 
            name={isWithinWindow ? "warning" : "checkmark-circle"} 
            size={18} 
            color={isWithinWindow ? "#f25842" : "#10b981"} 
          />
          <Text style={[styles.policyText, isWithinWindow && styles.warningText]}>
            {isWithinWindow 
              ? `Less than ${cancellationHours} hours until booking - cancellation fee applies`
              : `Free cancellation until ${cancellationHours} hours before booking`
            }
          </Text>
        </View>

        {hoursUntilBooking !== null && (
          <Text style={styles.timeText}>
            {hoursUntilBooking > 0 
              ? `${Math.round(hoursUntilBooking)} hours until booking`
              : 'Booking time has passed'
            }
          </Text>
        )}

        {isWithinWindow && policy.cancellation_fee_enabled && cancellationFee > 0 && (
          <View style={styles.feeSection}>
            <Text style={styles.feeLabel}>Cancellation Fee:</Text>
            <Text style={styles.feeAmount}>
              {formatCurrency(cancellationFee, listing.currency)}
            </Text>
          </View>
        )}

        <View style={styles.refundSection}>
          <Text style={styles.refundLabel}>Refund Policy:</Text>
          <Text style={styles.refundText}>
            {refundPolicy === 'full' && 'Full refund after cancellation fee'}
            {refundPolicy === 'partial' && 'Partial refund after cancellation fee'}
            {refundPolicy === 'none' && 'No refund after cancellation fee'}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  policyContent: {
    gap: 8,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  policyText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  warningText: {
    color: '#f25842',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 26,
    marginTop: -4,
  },
  feeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  feeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#991b1b',
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991b1b',
  },
  refundSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  refundLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  refundText: {
    fontSize: 13,
    color: '#374151',
  },
})

