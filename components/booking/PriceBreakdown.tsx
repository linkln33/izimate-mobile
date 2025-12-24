import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatCurrency } from '@/lib/utils/currency'
import type { Booking, Listing } from '@/lib/types'

interface PriceBreakdownProps {
  booking: Booking
  listing: Listing
}

export function PriceBreakdown({ booking, listing }: PriceBreakdownProps) {
  const basePrice = booking.service_price || 0
  const currency = booking.currency || listing.currency || 'GBP'
  
  // Calculate fees (if any - these would come from booking metadata or service settings)
  const serviceFee = 0 // Could be calculated from booking metadata
  const tax = 0 // Could be calculated based on location
  const discount = 0 // Could come from coupon usage
  
  const subtotal = basePrice
  const total = subtotal + serviceFee + tax - discount

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="receipt-outline" size={20} color="#f25842" />
        <Text style={styles.title}>Price Breakdown</Text>
      </View>

      <View style={styles.breakdown}>
        <View style={styles.row}>
          <Text style={styles.label}>Service Price</Text>
          <Text style={styles.value}>{formatCurrency(basePrice, currency)}</Text>
        </View>

        {serviceFee > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Service Fee</Text>
            <Text style={styles.value}>{formatCurrency(serviceFee, currency)}</Text>
          </View>
        )}

        {tax > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Tax</Text>
            <Text style={styles.value}>{formatCurrency(tax, currency)}</Text>
          </View>
        )}

        {discount > 0 && (
          <View style={styles.row}>
            <Text style={[styles.label, styles.discountLabel]}>Discount</Text>
            <Text style={[styles.value, styles.discountValue]}>
              -{formatCurrency(discount, currency)}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(total, currency)}</Text>
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
  breakdown: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  value: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  discountLabel: {
    color: '#10b981',
  },
  discountValue: {
    color: '#10b981',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  totalRow: {
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f25842',
  },
})

