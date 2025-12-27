/**
 * CalendarStats Component
 * Displays booking statistics and summaries
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import type { CalendarStatsProps, CalendarEvent, CalendarViewMode, ViewType } from './types'

export const CalendarStats: React.FC<CalendarStatsProps> = ({
  bookings,
  viewMode,
  selectedDate,
  viewType = 'both',
}) => {
  const { t } = useTranslation()
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

  // Monthly Summary
  const renderMonthlySummary = () => {
    const totalBookings = bookings.length
    const confirmed = bookings.filter(b => b.status === 'confirmed').length
    const pending = bookings.filter(b => b.status === 'pending').length
    const completed = bookings.filter(b => b.status === 'completed').length
    const totalRevenue = bookings
      .filter(b => b.price && b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.price || 0), 0)

    return (
      <View style={styles.monthlySummary}>
        <Text style={styles.summaryTitle}>{t('bookings.thisMonth')}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalBookings}</Text>
            <Text style={styles.statLabel}>{t('bookings.totalBookings')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#10b981' }]}>
              {confirmed}
            </Text>
            <Text style={styles.statLabel}>{t('bookings.confirmed')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
              {pending}
            </Text>
            <Text style={styles.statLabel}>{t('bookings.pending')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#6366f1' }]}>
              {completed}
            </Text>
            <Text style={styles.statLabel}>{t('bookings.completed')}</Text>
          </View>
        </View>
        {viewType === 'provider' && totalRevenue > 0 && (
          <View style={styles.revenueRow}>
            <Ionicons name="cash" size={20} color="#10b981" />
            <Text style={styles.revenueText}>
              {t('bookings.totalRevenue')}: £{totalRevenue.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    )
  }

  // Day Summary (for provider view)
  const renderDaySummary = () => {
    if (!selectedDate || viewType !== 'provider') return null

    const dayBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.start)
      return (
        bookingDate.getFullYear() === selectedDate.getFullYear() &&
        bookingDate.getMonth() === selectedDate.getMonth() &&
        bookingDate.getDate() === selectedDate.getDate()
      )
    })

    if (dayBookings.length === 0) return null

    const dayRevenue = dayBookings
      .filter(b => b.price && b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.price || 0), 0)
    const completedCount = dayBookings.filter(b => b.status === 'completed').length

    return (
      <View style={styles.daySummary}>
        <View style={styles.daySummaryItem}>
          <Ionicons name="calendar" size={16} color="#3b82f6" />
          <Text style={styles.daySummaryText}>
            {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.daySummaryItem}>
          <Ionicons name="cash" size={16} color="#10b981" />
          <Text style={styles.daySummaryText}>
            £{dayRevenue.toFixed(2)}
          </Text>
        </View>
        <View style={styles.daySummaryItem}>
          <Ionicons name="checkmark-circle" size={16} color="#f59e0b" />
          <Text style={styles.daySummaryText}>
            {completedCount} completed
          </Text>
        </View>
      </View>
    )
  }

  // Only show stats in month view
  if (viewMode !== 'month') {
    return selectedDate ? renderDaySummary() : null
  }

  return (
    <View style={styles.container}>
      {!selectedDate && renderMonthlySummary()}
      {selectedDate && renderDaySummary()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  monthlySummary: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f25842',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  revenueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  daySummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  daySummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daySummaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
})

